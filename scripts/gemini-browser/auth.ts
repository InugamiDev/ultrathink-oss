/**
 * Gemini Browser Auth — One-time login flow
 *
 * Opens a visible browser window so the user can log into their Google account.
 * Saves the session (cookies + localStorage) to a state file for reuse by generate.ts.
 *
 * Usage:
 *   npx playwright install chromium   # one-time
 *   npx tsx scripts/gemini-browser/auth.ts
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, ".state");
const STATE_FILE = join(STATE_DIR, "gemini-session.json");

async function authenticate() {
  mkdirSync(STATE_DIR, { recursive: true });

  if (existsSync(STATE_FILE)) {
    console.log(`Existing session found at ${STATE_FILE}`);
    console.log("Delete it first if you want to re-authenticate.");
    console.log(`  rm "${STATE_FILE}"`);
    process.exit(0);
  }

  console.log("Opening browser — please log into your Google account...");
  console.log("Once you see the Gemini chat page, press Enter here to save the session.\n");

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  await page.goto("https://gemini.google.com/app");

  // Wait for user to log in — they press Enter in the terminal when done
  console.log("Waiting for you to log in...");
  console.log("(The page should show the Gemini chat interface with your account)");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Verify we're logged in by checking for the prompt input
  try {
    await page.waitForSelector('[aria-label="Enter a prompt for Gemini"]', {
      timeout: 5000,
    });
    console.log("Login verified — Gemini chat interface detected.");
  } catch {
    console.warn("Warning: Could not verify Gemini chat interface. Saving session anyway.");
  }

  // Save the full browser state (cookies + localStorage + sessionStorage)
  await context.storageState({ path: STATE_FILE });
  console.log(`\nSession saved to: ${STATE_FILE}`);
  console.log("You can now use generate.ts to create images without logging in again.");

  await browser.close();
}

authenticate().catch((err) => {
  console.error("Auth failed:", err.message);
  process.exit(1);
});
