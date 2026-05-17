import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recoveryDir = path.resolve(__dirname, "../recovery");

fs.mkdirSync(recoveryDir, { recursive: true });

const apiKey = "TEST_API_KEY:21e761c40d562e537805fe77641e9bdc:a66fd47e33ef1702d93e1f25cbf0d641";
const entitySecret = "8b508198d01d0af580165f0a82172589ded1018ac051083300bc739d309b7bdd";

console.log("Registering entity secret with Circle...");

const response = await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: recoveryDir,
});

console.log("Done! Recovery file saved to:", recoveryDir);
