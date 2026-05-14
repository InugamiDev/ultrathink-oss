import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync, rmSync } from "fs";
import { join } from "path";
import { getBackendConfig, saveBackendConfig } from "@/lib/assets";

const AUTH_DIR = "/tmp/ultrathink-assets/auth";
const BROWSER_PROFILE = join(AUTH_DIR, "gemini-profile");

// Find the node_modules that contains playwright (could be hoisted to monorepo root)
function findPlaywrightRoot(): string {
  // Walk up from cwd looking for node_modules/playwright
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "node_modules", "playwright"))) return dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// GET /api/assets/auth — check auth status
export async function GET() {
  try {
    const config = getBackendConfig();
    const hasCookies = !!(config.geminiApi.secure1psid && config.geminiApi.secure1psidts);
    const hasProfile =
      existsSync(join(BROWSER_PROFILE, "Default", "Cookies")) || existsSync(join(BROWSER_PROFILE, "Cookies"));

    return NextResponse.json({
      geminiApi: {
        authenticated: hasCookies,
        cookiePreview: hasCookies ? `...${config.geminiApi.secure1psid.slice(-8)}` : null,
      },
      playwright: {
        hasProfile,
        profilePath: BROWSER_PROFILE,
      },
    });
  } catch (err) {
    console.error("GET /api/assets/auth error:", err);
    return NextResponse.json({ error: "Failed to check auth" }, { status: 500 });
  }
}

// POST /api/assets/auth — trigger auth flow
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    const pwRoot = findPlaywrightRoot();

    // Launch browser for Gemini login → capture cookies
    if (action === "login-gemini") {
      mkdirSync(AUTH_DIR, { recursive: true });

      // Write script INSIDE the project dir so require() resolves
      const scriptPath = join(pwRoot, "_gemini_auth.cjs");
      const resultPath = join(AUTH_DIR, "_auth_result.json");

      const loginScript = `
const { chromium } = require('playwright');
const fs = require('fs');

const PROFILE_DIR = ${JSON.stringify(BROWSER_PROFILE)};
const RESULT_PATH = ${JSON.stringify(resultPath)};

(async () => {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded' });

  console.log('\\n=== Gemini Login ===');
  console.log('Log in to your Google account in the browser window.');
  console.log('Cookies will be captured automatically.\\n');

  let cookies = null;
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(2000);

    const allCookies = await context.cookies('https://gemini.google.com');
    const psid = allCookies.find(c => c.name === '__Secure-1PSID');
    const psidts = allCookies.find(c => c.name === '__Secure-1PSIDTS');

    if (psid && psid.value && psidts && psidts.value) {
      const url = page.url();
      if (url.includes('gemini.google.com') && !url.includes('accounts.google.com')) {
        cookies = {
          secure1psid: psid.value,
          secure1psidts: psidts.value,
          capturedAt: new Date().toISOString(),
        };
        console.log('Cookies captured!');
        break;
      }
    }
  }

  fs.writeFileSync(RESULT_PATH, JSON.stringify(cookies || { error: 'Timed out waiting for login' }, null, 2));
  await context.close();
})().catch(err => {
  require('fs').writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({ error: err.message }));
  process.exit(1);
});
`.trim();

      writeFileSync(scriptPath, loginScript);

      try {
        execFileSync("node", [scriptPath], {
          timeout: 300_000,
          stdio: ["pipe", "inherit", "inherit"],
          cwd: pwRoot,
        });
      } catch {
        if (!existsSync(resultPath)) {
          throw new Error("Login failed — check that Playwright is installed: npx playwright install chromium");
        }
      } finally {
        try {
          unlinkSync(scriptPath);
        } catch {
          /* ignore */
        }
      }

      if (!existsSync(resultPath)) {
        return NextResponse.json({ error: "No auth result — login may have timed out" }, { status: 400 });
      }

      const result = JSON.parse(readFileSync(resultPath, "utf-8"));
      try {
        unlinkSync(resultPath);
      } catch {
        /* ignore */
      }

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      saveBackendConfig({
        geminiApi: {
          ...getBackendConfig().geminiApi,
          secure1psid: result.secure1psid,
          secure1psidts: result.secure1psidts,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Gemini cookies captured and saved",
        capturedAt: result.capturedAt,
      });
    }

    // Refresh cookies from existing browser profile
    if (action === "refresh-cookies") {
      if (!existsSync(BROWSER_PROFILE)) {
        return NextResponse.json({ error: "No browser profile — run login first" }, { status: 400 });
      }

      mkdirSync(AUTH_DIR, { recursive: true });
      const scriptPath = join(pwRoot, "_gemini_refresh.cjs");
      const resultPath = join(AUTH_DIR, "_auth_refresh_result.json");

      const refreshScript = `
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const context = await chromium.launchPersistentContext(${JSON.stringify(BROWSER_PROFILE)}, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const allCookies = await context.cookies('https://gemini.google.com');
  const psid = allCookies.find(c => c.name === '__Secure-1PSID');
  const psidts = allCookies.find(c => c.name === '__Secure-1PSIDTS');

  const result = (psid && psidts)
    ? { secure1psid: psid.value, secure1psidts: psidts.value, capturedAt: new Date().toISOString() }
    : { error: 'Session expired — login again' };

  fs.writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify(result, null, 2));
  await context.close();
})().catch(err => {
  require('fs').writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({ error: err.message }));
});
`.trim();

      writeFileSync(scriptPath, refreshScript);

      try {
        execFileSync("node", [scriptPath], {
          timeout: 30_000,
          stdio: ["pipe", "pipe", "pipe"],
          cwd: pwRoot,
        });
      } catch {
        /* check result file */
      } finally {
        try {
          unlinkSync(scriptPath);
        } catch {
          /* ignore */
        }
      }

      if (!existsSync(resultPath)) {
        return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
      }

      const result = JSON.parse(readFileSync(resultPath, "utf-8"));
      try {
        unlinkSync(resultPath);
      } catch {
        /* ignore */
      }

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      saveBackendConfig({
        geminiApi: {
          ...getBackendConfig().geminiApi,
          secure1psid: result.secure1psid,
          secure1psidts: result.secure1psidts,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Cookies refreshed from browser profile",
        capturedAt: result.capturedAt,
      });
    }

    // Clear auth data
    if (action === "logout") {
      saveBackendConfig({
        geminiApi: {
          ...getBackendConfig().geminiApi,
          secure1psid: "",
          secure1psidts: "",
        },
      });
      try {
        rmSync(BROWSER_PROFILE, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return NextResponse.json({ success: true, message: "Auth cleared" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/assets/auth error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Auth flow failed" }, { status: 500 });
  }
}
