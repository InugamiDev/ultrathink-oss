// intent: validate a builder campaign key against the builder_keys table
// status: done
// next: none
// confidence: high

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ valid: false, error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { key } = body as { key?: string };

    if (!key || typeof key !== "string") {
      return NextResponse.json({ valid: false, error: "Missing or invalid key" }, { status: 400 });
    }

    const sql = getDb();
    const rows = (await sql`
      SELECT id, expires_at
      FROM builder_keys
      WHERE id = ${key}
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    `) as { id: string; expires_at: string | null }[];

    if (rows.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid or expired key" });
    }

    const validatedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // HMAC token for optional server-side re-verification
    const signingKey = process.env.ADMIN_SECRET || "ultrathink-default-secret";
    const token = createHmac("sha256", signingKey).update(`${key}${validatedAt}`).digest("hex");

    return NextResponse.json({
      valid: true,
      tier: "builder",
      validated_at: validatedAt,
      expires_at: expiresAt,
      token,
      ...(rows[0].expires_at ? { key_expires_at: rows[0].expires_at } : {}),
    });
  } catch (err) {
    console.error("Builder validate error:", err);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
