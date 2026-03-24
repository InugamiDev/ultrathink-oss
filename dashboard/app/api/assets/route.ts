import { NextRequest, NextResponse } from "next/server";
import {
  listManifests,
  getManifest,
  saveManifest,
  deleteManifest,
  generateId,
  getBackendConfig,
  saveBackendConfig,
  type AssetManifest,
  type AssetEntry,
  type Backend,
} from "@/lib/assets";

// GET /api/assets — list manifests + config
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (id === "config") {
      return NextResponse.json({ config: getBackendConfig() });
    }

    if (id) {
      const manifest = getManifest(id);
      if (!manifest) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ manifest });
    }

    const manifests = listManifests();
    return NextResponse.json({ manifests });
  } catch (err) {
    console.error("GET /api/assets error:", err);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
}

// POST /api/assets — create manifest, update config, or update asset status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;

    // Save backend config
    if (action === "save-config") {
      const config = saveBackendConfig(body.config);
      return NextResponse.json({ config });
    }

    // Create new manifest from asset descriptions
    if (action === "create-manifest") {
      const { name, description, backend, assets } = body as {
        name: string;
        description?: string;
        backend: Backend;
        assets: Array<{ prompt: string; style?: string; dimensions?: string; negativePrompt?: string }>;
      };

      if (!name || !assets?.length) {
        return NextResponse.json({ error: "Name and at least one asset required" }, { status: 400 });
      }

      const manifest: AssetManifest = {
        id: generateId(),
        name,
        description,
        backend: backend || "tinyfish",
        assets: assets.map((a) => ({
          id: generateId(),
          prompt: a.prompt,
          negativePrompt: a.negativePrompt,
          style: a.style,
          dimensions: a.dimensions || "1024x1024",
          status: "pending" as const,
          retries: 0,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveManifest(manifest);
      return NextResponse.json({ manifest }, { status: 201 });
    }

    // Update asset status (used by generation pipeline)
    if (action === "update-asset") {
      const { manifestId, assetId, status, outputPath, outputUrl, error } = body;
      const manifest = getManifest(manifestId);
      if (!manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

      const asset = manifest.assets.find((a) => a.id === assetId);
      if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

      if (status) asset.status = status;
      if (outputPath) asset.outputPath = outputPath;
      if (outputUrl) asset.outputUrl = outputUrl;
      if (error) asset.error = error;
      if (status === "completed") asset.generatedAt = new Date().toISOString();
      if (status === "failed") asset.retries += 1;

      saveManifest(manifest);
      return NextResponse.json({ asset });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/assets error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// DELETE /api/assets?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const ok = deleteManifest(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/assets error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
