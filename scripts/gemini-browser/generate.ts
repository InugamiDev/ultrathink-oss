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
  // Gemini shows various indicators during generation:
  // - A blue square stop button in the input area
  // - A spinning Gemini star icon with status text ("Finalizing the Visual Elements")
  // - The input placeholder changes during generation
  // When done, the prompt input returns to its idle state.

  // First, wait a bit for generation to start
  await page.waitForTimeout(3000);

  // Poll until the response is complete — check for absence of loading indicators
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const isGenerating = await page.evaluate(() => {
      // Check for stop button (blue square in the input area)
      const stopBtns = document.querySelectorAll("button");
      for (const btn of stopBtns) {
        const label = btn.getAttribute("aria-label") || btn.textContent || "";
        if (label.toLowerCase().includes("stop")) return true;
      }

      // Check for the animated Gemini loading indicator (spinning star)
      // This appears as an element with "Thinking" or "Generating" or "Finalizing" text
      const allText = document.body.innerText;
      if (
        allText.includes("Thinking") ||
        allText.includes("Generating") ||
        allText.includes("Finalizing") ||
        allText.includes("Creating")
      ) {
        // Verify it's in a loading context, not in the response text
        const loaders = document.querySelectorAll('[role="status"], .loading, [data-loading]');
        if (loaders.length > 0) return true;

        // Also check for the animated icon near status text
        const spans = document.querySelectorAll("span");
        for (const span of spans) {
          const text = span.textContent || "";
          if (
            (text.includes("Thinking") ||
              text.includes("Generating") ||
              text.includes("Finalizing") ||
              text.includes("Creating")) &&
            span.closest("[class]")
          ) {
            // If this text is near a sibling SVG or animation element, it's loading
            const parent = span.parentElement;
            if (parent && (parent.querySelector("svg") || parent.querySelector("img"))) {
              return true;
            }
          }
        }
      }

      return false;
    });

    if (!isGenerating) {
      // Double-check: wait a bit more and verify it's truly done
      await new Promise((r) => setTimeout(r, 2000));
      const stillGenerating = await page.evaluate(() => {
        const btns = document.querySelectorAll("button");
        for (const btn of btns) {
          const label = btn.getAttribute("aria-label") || "";
          if (label.toLowerCase().includes("stop")) return true;
        }
        return false;
      });

      if (!stillGenerating) break;
    }

    // Poll every 2 seconds
    await new Promise((r) => setTimeout(r, 2000));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed % 10 === 0) {
      console.log(`  Still generating... (${elapsed}s)`);
    }
  }

  // Extra settle time for images to fully render in DOM
  await page.waitForTimeout(5000);
}

/** Extract all generated image URLs from the latest Gemini response */
async function extractImages(page: Page): Promise<string[]> {
  // First, log all image sources for debugging
  const debugInfo = await page.evaluate(() => {
    const allImgs = document.querySelectorAll("img");
    return Array.from(allImgs).map((img) => ({
      src: (img.src || "").substring(0, 120),
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      alt: img.alt || "",
      closest: img.closest("[data-turn-id]") ? "in-turn" : "outside",
    }));
  });
  console.log("  Debug: All images on page:");
  for (const info of debugInfo) {
    console.log(`    ${info.width}x${info.height} [${info.closest}] alt="${info.alt}" src=${info.src}`);
  }

  return page.evaluate(() => {
    const images: string[] = [];
    const allImgs = document.querySelectorAll("img");

    for (const img of allImgs) {
      const src = img.src || img.getAttribute("data-src") || "";
      if (!src) continue;

      const alt = (img.alt || "").toLowerCase();
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;

      // Primary signal: Gemini marks generated images with "AI generated" in alt text
      if (alt.includes("ai generated") || alt.includes("generated image")) {
        images.push(src);
        continue;
      }

      // Secondary signal: Large images (256px+) that aren't profile pics or UI chrome
      if (w >= 256 && h >= 256) {
        if (
          alt.includes("profile") ||
          alt.includes("avatar") ||
          src.includes("/s32-") ||
          src.includes("/s64-") ||
          src.includes("/s128-") ||
          src.includes("googlelogo") ||
          src.includes("/logos/")
        ) {
          continue;
        }
        images.push(src);
      }
    }

    // Also check canvas elements
    const canvases = document.querySelectorAll("canvas");
    for (const canvas of canvases) {
      if (canvas.width >= 256 && canvas.height >= 256) {
        try {
          const dataUrl = canvas.toDataURL("image/png");
          if (dataUrl.length > 10000) {
            images.push(dataUrl);
          }
        } catch {
          // canvas tainted by CORS
        }
      }
    }

    return [...new Set(images)];
  });
}

/** Get the full-resolution URL for a Google image CDN URL */
function getFullResUrl(src: string): string {
  // Google's lh3.googleusercontent.com serves resized previews by default.
  // Appending =s0 returns the original full-resolution image.
  // Other useful suffixes: =w2048 (specific width), =h2048 (specific height)
  if (src.includes("googleusercontent.com")) {
    // Strip any existing size params and request original
    const base = src.replace(/=[swh]\d+.*$/, "").replace(/=s\d+.*$/, "");
    return `${base}=s0`;
  }
  return src;
}

/** Download an image from URL or data URI and return as Buffer */
async function downloadImage(page: Page, src: string): Promise<Buffer> {
  if (src.startsWith("data:image")) {
    const base64 = src.split(",")[1];
    return Buffer.from(base64, "base64");
  }

  // Request full resolution from Google's CDN
  const fullResSrc = getFullResUrl(src);
  console.log(`  Downloading full-res: ${fullResSrc.substring(0, 100)}...`);

  // Use Playwright's request API (carries auth cookies from the browser context)
  try {
    const response = await page.context().request.get(fullResSrc);
    if (response.ok()) {
      return Buffer.from(await response.body());
    }
    // If full-res fails, try original URL
    if (fullResSrc !== src) {
      const fallback = await page.context().request.get(src);
      if (fallback.ok()) {
        return Buffer.from(await fallback.body());
      }
    }
  } catch {
    // Fallback: try converting the img element to canvas to extract pixels
  }

  // Fallback: render the image to a canvas in-page and extract as data URL
  const base64 = await page.evaluate(async (url: string) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("No canvas context");
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataUrl.split(",")[1]);
        } catch {
          reject("Canvas tainted");
        }
      };
      img.onerror = () => reject("Image load failed");
      img.src = url;
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
    await page.goto("https://gemini.google.com/app", { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait for page to fully render with auth state
    await page.waitForTimeout(5000);

    // Check if we're logged in
    const signInBtn = page.locator('a:has-text("Sign in")');
    if (await signInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
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
        await page.goto("https://gemini.google.com/app", { waitUntil: "domcontentloaded", timeout: 30000 });
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
        } else if (j === 0) {
          outPath = OUTPUT;
        } else {
          // Multiple images but single file output — add suffix
          const ext = extname(OUTPUT);
          const base = OUTPUT.slice(0, -ext.length);
          outPath = `${base}-${j + 1}${ext}`;
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
