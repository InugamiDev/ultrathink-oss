import { NextRequest, NextResponse } from "next/server";
import { getManifest, saveManifest, getBackendConfig, getOutputDir, type AssetEntry, type Backend } from "@/lib/assets";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// POST /api/assets/generate — trigger Puter.js pipeline for a manifest
export async function POST(req: NextRequest) {
  try {
    const { manifestId, assetIds } = await req.json();

    const manifest = getManifest(manifestId);
    if (!manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

    const config = getBackendConfig();

    // Filter assets to generate
    const targets = assetIds
      ? manifest.assets.filter((a: AssetEntry) => assetIds.includes(a.id))
      : manifest.assets.filter((a: AssetEntry) => a.status === "pending" || a.status === "failed");

    if (!targets.length) {
      return NextResponse.json({ error: "No pending/failed assets to generate" }, { status: 400 });
    }

    // Mark as generating
    for (const asset of targets) {
      asset.status = "generating";
      asset.error = undefined;
    }
    saveManifest(manifest);

    // Fire off generation in background (non-blocking response)
    runPipeline(manifest.id, targets, config).catch((err) => {
      console.error("Pipeline error:", err);
    });

    return NextResponse.json({
      started: true,
      backend: "puter" as Backend,
      count: targets.length,
      assetIds: targets.map((a: AssetEntry) => a.id),
    });
  } catch (err) {
    console.error("POST /api/assets/generate error:", err);
    return NextResponse.json({ error: "Failed to start generation" }, { status: 500 });
  }
}

// ── Pipeline Runner ──

async function runPipeline(manifestId: string, assets: AssetEntry[], config: ReturnType<typeof getBackendConfig>) {
  for (const asset of assets) {
    try {
      const result = await generateWithPuter(asset, config.puter);

      const manifest = getManifest(manifestId);
      if (!manifest) break;
      const entry = manifest.assets.find((a: AssetEntry) => a.id === asset.id);
      if (entry) {
        entry.status = "completed";
        entry.outputPath = result.outputPath;
        entry.generatedAt = new Date().toISOString();
      }
      saveManifest(manifest);
    } catch (err) {
      const manifest = getManifest(manifestId);
      if (!manifest) break;
      const entry = manifest.assets.find((a: AssetEntry) => a.id === asset.id);
      if (entry) {
        entry.status = "failed";
        entry.error = err instanceof Error ? err.message : String(err);
        entry.retries += 1;
      }
      saveManifest(manifest);
    }
  }
}

// ── Prompt Builder ──

function buildPrompt(asset: AssetEntry): string {
  let prompt = `Generate an image: ${asset.prompt}`;
  if (asset.style) prompt += `\nStyle: ${asset.style}`;
  if (asset.dimensions) prompt += `\nDimensions: ${asset.dimensions}`;
  if (asset.negativePrompt) prompt += `\nAvoid: ${asset.negativePrompt}`;
  return prompt;
}

// ── Backend: Puter.js (Zero Setup — Free, No API Key) ──
// https://github.com/nicholasgasior/puter — MIT License
// Uses Puter's public REST API for AI image generation, powered by Gemini models.

async function generateWithPuter(
  asset: AssetEntry,
  config: { model: string; testMode: boolean }
): Promise<{ outputPath: string }> {
  const prompt = buildPrompt(asset);
  const outputDir = getOutputDir();
  const outputPath = join(outputDir, `${asset.id}.png`);
  mkdirSync(outputDir, { recursive: true });

  const res = await fetch("https://api.puter.com/ai/txt2img", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: config.model || "gemini-3.1-flash-image-preview",
      test_mode: config.testMode || false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Puter.js API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(outputPath, buffer);
  return { outputPath };
}
