/**
 * Gemini Browser Image Generator
 *
 * Uses a saved Google session to automate image generation on gemini.google.com.
 * Supports headless mode for CLI/script usage.
 *
 * Usage:
 *   npx tsx scripts/gemini-browser/generate.ts --prompt "A logo of a brain with circuits" --output hero.png
 *   npx tsx scripts/gemini-browser/generate.ts --prompt "..." --output out/ --count 2
 *   npx tsx scripts/gemini-browser/generate.ts --prompt "..." --visible  # debug mode
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, ".state");
const STATE_FILE = join(STATE_DIR, "gemini-session.json");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    output: { type: "string", short: "o", default: "." },
    count: { type: "string", short: "n", default: "1" },
    visible: { type: "boolean", default: false },
    model: { type: "string", short: "m", default: "auto" },
    timeout: { type: "string", short: "t", default: "120000" },
  },
  strict: true,
});

if (!args.prompt) {
  console.error('Usage: npx tsx generate.ts --prompt "..." [--output path] [--count N] [--visible]');
  console.error("\nOptions:");
  console.error("  --prompt, -p   Image generation prompt (required)");
  console.error("  --output, -o   Output file or directory (default: current dir)");
  console.error("  --count, -n    Number of images to generate (default: 1)");
  console.error("  --visible      Show browser window for debugging");
  console.error('  --model, -m    Model to use: "auto", "flash", "pro" (default: auto)');
  console.error("  --timeout, -t  Max wait time in ms per image (default: 120000)");
  process.exit(1);
}

const PROMPT = args.prompt;
const OUTPUT = args.output!;
const COUNT = parseInt(args.count!, 10);
const HEADLESS = !args.visible;
const TIMEOUT = parseInt(args.timeout!, 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the Gemini response to finish streaming */
async function waitForResponse(page: Page, timeoutMs: number): Promise<void> {
  // The "stop" button appears during generation and disappears when done.
  // We wait for the stop button to appear then disappear.
  try {
    // Wait for generation to start (stop button or loading indicator appears)
    await page.waitForFunction(
      () => {
        const stopBtn = document.querySelector('[aria-label="Stop response"]');
        const loading = document.querySelector(".loading-indicator");
        return stopBtn || loading;
      },
      { timeout: 15000 }
    );
  } catch {
    // Generation might have already completed instantly
  }

  // Wait for generation to finish (stop button disappears, response settles)
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector('[aria-label="Stop response"]');
      return !stopBtn;
    },
    { timeout: timeoutMs }
  );

  // Extra settle time for images to fully render
  await page.waitForTimeout(3000);
}

/** Extract all image URLs/data from the latest Gemini response */
async function extractImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const images: string[] = [];

    // Gemini renders generated images in the response area
    // Look for images in the most recent response turn
    const responseTurns = document.querySelectorAll("[data-turn-id]");
    const lastTurn = responseTurns[responseTurns.length - 1];
    const container = lastTurn || document;

    // Strategy 1: Look for images in response with src containing googleusercontent or data:
    const imgs = container.querySelectorAll("img");
    for (const img of imgs) {
      const src = img.src || img.getAttribute("data-src") || "";
      if (
        src &&
        !src.includes("google.com/logos") &&
        !src.includes("googlelogo") &&
        !src.includes("avatar") &&
        !src.includes("profile") &&
        !src.includes("icon") &&
        !src.includes("emoji") &&
        (src.includes("googleusercontent") ||
          src.includes("data:image") ||
          src.includes("blob:") ||
          src.includes("lh3.") ||
          src.includes("generated") ||
          img.width > 200)
      ) {
        images.push(src);
      }
    }

    // Strategy 2: Look for background images on canvas/containers
    const canvases = container.querySelectorAll("canvas");
    for (const canvas of canvases) {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        if (dataUrl.length > 1000) {
          images.push(dataUrl);
        }
      } catch {
        // canvas tainted by CORS
      }
    }

    return [...new Set(images)]; // deduplicate
  });
}

/** Download an image from URL or data URI and return as Buffer */
async function downloadImage(page: Page, src: string): Promise<Buffer> {
  if (src.startsWith("data:image")) {
    const base64 = src.split(",")[1];
    return Buffer.from(base64, "base64");
  }

  // For URLs, fetch through the page context (has auth cookies)
  const base64 = await page.evaluate(async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });
  }, src);

  return Buffer.from(base64, "base64");
}

/** Select model if needed */
async function selectModel(page: Page, model: string): Promise<void> {
  if (model === "auto") return;

  try {
    // Click the model/mode picker
    const modePicker = page.locator('[aria-label="Open mode picker"]');
    if (await modePicker.isVisible({ timeout: 3000 })) {
      await modePicker.click();
      await page.waitForTimeout(1000);

      // Look for model options in the dropdown
      if (model === "pro") {
        const proOption = page.getByText(/Pro/i).first();
        if (await proOption.isVisible({ timeout: 2000 })) {
          await proOption.click();
          console.log("Selected Pro model");
        }
      } else if (model === "flash") {
        const flashOption = page.getByText(/Flash/i).first();
        if (await flashOption.isVisible({ timeout: 2000 })) {
          await flashOption.click();
          console.log("Selected Flash model");
        }
      }
      await page.waitForTimeout(500);
    }
  } catch {
    console.warn(`Could not select model "${model}" — using default`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(STATE_FILE)) {
    console.error("No saved session found. Run auth.ts first:");
    console.error("  npx tsx scripts/gemini-browser/auth.ts");
    process.exit(1);
  }

  console.log(`Generating ${COUNT} image(s)...`);
  console.log(`Prompt: "${PROMPT}"`);
  console.log(`Output: ${OUTPUT}`);
  console.log(`Mode: ${HEADLESS ? "headless" : "visible"}\n`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context: BrowserContext = await browser.newContext({
    storageState: STATE_FILE,
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    // Navigate to Gemini
    console.log("Loading Gemini...");
    await page.goto("https://gemini.google.com/app", { waitUntil: "networkidle" });

    // Check if we're logged in
    const signInBtn = page.locator('a:has-text("Sign in")');
    if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.error("Session expired. Please re-authenticate:");
      console.error(`  rm "${STATE_FILE}"`);
      console.error("  npx tsx scripts/gemini-browser/auth.ts");
      await browser.close();
      process.exit(1);
    }

    // Select model if specified
    await selectModel(page, args.model!);

    // Prepare output directory
    const isDir = !extname(OUTPUT) || COUNT > 1;
    if (isDir) {
      mkdirSync(OUTPUT, { recursive: true });
    } else {
      mkdirSync(dirname(OUTPUT), { recursive: true });
    }

    const results: string[] = [];

    for (let i = 0; i < COUNT; i++) {
      if (COUNT > 1) console.log(`\n--- Image ${i + 1}/${COUNT} ---`);

      // Start a new chat for each image to avoid context contamination
      if (i > 0) {
        await page.goto("https://gemini.google.com/app", { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);
      }

      // Type the prompt — prefix with "Generate an image: " to trigger image gen
      const fullPrompt = PROMPT.toLowerCase().startsWith("generate") ? PROMPT : `Generate an image: ${PROMPT}`;

      console.log("Typing prompt...");
      const input = page.locator('[aria-label="Enter a prompt for Gemini"]');
      await input.waitFor({ state: "visible", timeout: 10000 });
      await input.click();
      await input.fill(fullPrompt);
      await page.waitForTimeout(500);

      // Submit with Enter
      console.log("Submitting...");
      await page.keyboard.press("Enter");

      // Wait for response
      console.log("Waiting for generation (this may take 30-90 seconds)...");
      await waitForResponse(page, TIMEOUT);

      // Extract images
      console.log("Extracting images...");
      const imageSrcs = await extractImages(page);

      if (imageSrcs.length === 0) {
        console.warn("No images found in response. The model may have returned text only.");
        console.warn("Try adding more specific image generation instructions to your prompt.");

        // Take a debug screenshot
        const debugPath = join(isDir ? OUTPUT : dirname(OUTPUT), `debug-${i}.png`);
        await page.screenshot({ path: debugPath, fullPage: true });
        console.warn(`Debug screenshot saved: ${debugPath}`);
        continue;
      }

      console.log(`Found ${imageSrcs.length} image(s) in response.`);

      // Download and save images
      for (let j = 0; j < imageSrcs.length; j++) {
        const buffer = await downloadImage(page, imageSrcs[j]);

        let outPath: string;
        if (isDir) {
          const suffix = imageSrcs.length > 1 ? `-${j + 1}` : "";
          outPath = join(OUTPUT, `image-${i + 1}${suffix}.png`);
        } else {
          outPath = OUTPUT;
        }

        writeFileSync(outPath, buffer);
        console.log(`Saved: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
        results.push(outPath);
      }
    }

    // Update session state (cookies may have been refreshed)
    await context.storageState({ path: STATE_FILE });

    console.log(`\nDone! Generated ${results.length} image(s).`);
    if (results.length > 0) {
      console.log("Files:");
      results.forEach((r) => console.log(`  ${r}`));
    }
  } catch (err: any) {
    console.error("Generation failed:", err.message);

    // Save debug screenshot on failure
    const debugPath = join(isDir ? OUTPUT : dirname(OUTPUT), "debug-error.png");
    await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
    console.error(`Debug screenshot: ${debugPath}`);

    process.exit(1);
  } finally {
    await browser.close();
  }
}

const isDir = !extname(OUTPUT) || COUNT > 1;
main();
