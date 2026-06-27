import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  // Arc's native gas token (USDC) uses 18 decimals at the protocol level.
  // Declaring 6 here makes MetaMask miscalculate the gas balance and block txs.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const ARC_CHAIN_ID = 5042002;

// Add Arc Testnet to MetaMask / injected wallets
export const ARC_CHAIN_PARAMS = {
  chainId: "0x4CEF52",           // 5042002 in hex
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};
