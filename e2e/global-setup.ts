import { config as loadDotenv } from "dotenv";
import path from "path";

/**
 * Playwright global setup — runs once before all tests in the main process.
 * Loads .env.local so all env vars are available to test workers via
 * the `process.env` forwarded by Playwright.
 */
async function globalSetup(): Promise<void> {
  loadDotenv({ path: path.resolve(__dirname, "../.env.local") });
}

export default globalSetup;
