import {
  createPublicClient,
  http,
  encodeFunctionData,
  erc20Abi,
  keccak256,
  stringToHex,
  hexToString,
  parseUnits,
  parseEventLogs,
  getAddress,
  type Abi,
  type Address,
} from "viem";
import { arcTestnet } from "./chains";

// ─────────────────────────────────────────────────────────────
// Arc Transaction Memos
// Predeployed Memo contract wraps a contract call (e.g. a USDC
// transfer), forwards it through the CallFrom precompile so the
// original msg.sender is preserved, and emits a `Memo` event for
// off-chain reconciliation.  Live on Arc Testnet since 2026-06-18.
// Docs: https://docs.arc.io/arc/concepts/transaction-memos
// ─────────────────────────────────────────────────────────────

export const MEMO_CONTRACT = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505" as const;

// Tokens whose `transfer` we can wrap with a memo on Arc Testnet.
// (USYC omitted — its Arc Testnet address is not yet confirmed.)
export const MEMO_TOKENS: Record<string, { address: Address; decimals: number }> = {
  USDC:   { address: "0x3600000000000000000000000000000000000000", decimals: 6 },
  EURC:   { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
  cirBTC: { address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8 },
};

export function isMemoSupportedToken(token: string): boolean {
  return token in MEMO_TOKENS;
}

export const MEMO_ABI = [
  {
    type: "function",
    name: "memo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "BeforeMemo",
    anonymous: false,
    inputs: [{ name: "memoIndex", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "Memo",
    anonymous: false,
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "callDataHash", type: "bytes32", indexed: false },
      { name: "memoId", type: "bytes32", indexed: true },
      { name: "memo", type: "bytes", indexed: false },
      { name: "memoIndex", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 20_000 }),
});

// Minimal EIP-1193 provider shape (MetaMask / injected).
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface SendWithMemoParams {
  provider: Eip1193Provider;
  from: string;
  token: string;     // "USDC" | "EURC" | "cirBTC"
  to: string;        // recipient address
  amount: string;    // human-readable amount, e.g. "1.5"
  memo: string;      // human-readable memo text, e.g. "invoice-2026-0001"
  memoId?: string;   // optional id source; defaults to memo+timestamp
}

export interface SendWithMemoResult {
  txHash: `0x${string}`;
  explorerUrl: string;
  memoId: `0x${string}`;
  memoIndex?: string;
}

/**
 * Send an ERC-20 transfer wrapped in a transaction memo via the Memo contract.
 * Uses the wallet's EIP-1193 provider directly (eth_sendTransaction) so the
 * connected EOA stays the original sender. No token approval needed — the Memo
 * contract preserves msg.sender, so USDC.transfer behaves as a direct call.
 */
export async function sendWithMemo(p: SendWithMemoParams): Promise<SendWithMemoResult> {
  const tokenInfo = MEMO_TOKENS[p.token];
  if (!tokenInfo) throw new Error(`${p.token} does not support memos on Arc Testnet`);
  if (!p.memo.trim()) throw new Error("Memo text is empty");

  const to = getAddress(p.to);

  // Inner call: the ERC-20 transfer the Memo contract forwards to the token.
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, parseUnits(p.amount, tokenInfo.decimals)],
  });

  const memoIdSource = p.memoId?.trim() ? p.memoId.trim() : `${p.memo}-${Date.now()}`;
  const memoId = keccak256(stringToHex(memoIdSource));
  const memoBytes = stringToHex(p.memo);

  const data = encodeFunctionData({
    abi: MEMO_ABI,
    functionName: "memo",
    args: [tokenInfo.address, transferData, memoId, memoBytes],
  });

  const txHash = (await p.provider.request({
    method: "eth_sendTransaction",
    params: [{ from: getAddress(p.from), to: MEMO_CONTRACT, data }],
  })) as `0x${string}`;

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`Memo transfer reverted: ${txHash}`);
  }

  let memoIndex: string | undefined;
  try {
    const events = parseEventLogs({ abi: MEMO_ABI, logs: receipt.logs });
    const memoEvent = events.find((e) => e.eventName === "Memo");
    if (memoEvent) {
      memoIndex = (memoEvent.args as { memoIndex: bigint }).memoIndex.toString();
    }
  } catch {
    // Non-fatal — the transfer already succeeded.
  }

  return {
    txHash,
    explorerUrl: `https://testnet.arcscan.app/tx/${txHash}`,
    memoId,
    memoIndex,
  };
}

export interface DecodedMemo {
  txHash: string;
  blockNumber: bigint;
  sender: string;
  target: string;
  callDataHash: string;
  memoId: string;
  memo: string;        // decoded UTF-8 text (best effort)
  memoRaw: string;     // raw hex
  memoIndex: string;
}

// Arc RPC caps eth_getLogs at a 10,000-block range per request.
const MAX_LOG_RANGE = BigInt(9_000);

/**
 * Read recent `Memo` events emitted by the Memo contract, optionally filtered
 * to a given sender. Scans backwards from the latest block in ≤10k-block
 * chunks (RPC limit), stopping once `limit` events are collected or the
 * `lookbackBlocks` budget is exhausted.
 */
export async function readRecentMemos(opts: {
  sender?: string;
  lookbackBlocks?: bigint;
  limit?: number;
} = {}): Promise<DecodedMemo[]> {
  const latest = await publicClient.getBlockNumber();
  const lookback = opts.lookbackBlocks ?? BigInt(120_000);
  const floor = latest > lookback ? latest - lookback : BigInt(0);
  const limit = opts.limit ?? 25;
  const sender = opts.sender ? getAddress(opts.sender) : undefined;

  const fetchChunk = (fromBlock: bigint, toBlock: bigint) =>
    publicClient.getLogs({
      address: MEMO_CONTRACT,
      event: MEMO_ABI[2], // the Memo event
      args: sender ? { sender } : undefined,
      fromBlock,
      toBlock,
    });
  type MemoLog = Awaited<ReturnType<typeof fetchChunk>>[number];
  const collected: MemoLog[] = [];

  // Walk backwards in chunks so we never exceed the RPC range cap.
  let toBlock = latest;
  while (toBlock >= floor && collected.length < limit) {
    const fromBlock = toBlock > floor + MAX_LOG_RANGE ? toBlock - MAX_LOG_RANGE : floor;
    const chunk = await fetchChunk(fromBlock, toBlock);
    collected.push(...chunk);
    if (fromBlock === floor) break;
    toBlock = fromBlock - BigInt(1);
  }

  return collected
    .map((log) => {
      const args = log.args as {
        sender: string;
        target: string;
        callDataHash: string;
        memoId: string;
        memo: string;
        memoIndex: bigint;
      };
      let memoText = args.memo;
      try {
        memoText = hexToString(args.memo as `0x${string}`);
      } catch {
        /* keep raw hex */
      }
      return {
        txHash: log.transactionHash ?? "",
        blockNumber: log.blockNumber ?? BigInt(0),
        sender: args.sender,
        target: args.target,
        callDataHash: args.callDataHash,
        memoId: args.memoId,
        memo: memoText,
        memoRaw: args.memo,
        memoIndex: args.memoIndex.toString(),
      };
    })
    .sort((a, b) => Number(b.blockNumber - a.blockNumber));
}
