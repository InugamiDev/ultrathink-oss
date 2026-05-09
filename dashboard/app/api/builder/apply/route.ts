// intent: accept builder campaign applications with proof of work
// status: done
// confidence: high

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

const VALID_PROOF_TYPES = ["project", "skill", "contribution"] as const;

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { user_handle, email, proof_type, proof_url, proof_description } = body as {
      user_handle?: string;
      email?: string;
      proof_type?: string;
      proof_url?: string;
      proof_description?: string;
    };

    // Validate required fields
    if (!user_handle || typeof user_handle !== "string") {
      return NextResponse.json({ error: "user_handle is required" }, { status: 400 });
    }
    if (!proof_type || !VALID_PROOF_TYPES.includes(proof_type as (typeof VALID_PROOF_TYPES)[number])) {
      return NextResponse.json(
        { error: `proof_type must be one of: ${VALID_PROOF_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!proof_url || typeof proof_url !== "string") {
      return NextResponse.json({ error: "proof_url is required" }, { status: 400 });
    }

    const id = `app_${randomUUID().slice(0, 8)}`;
    const sql = getDb();

    await sql`
      INSERT INTO builder_applications (id, user_handle, email, proof_type, proof_url, proof_description)
      VALUES (${id}, ${user_handle}, ${email ?? null}, ${proof_type}, ${proof_url}, ${proof_description ?? null})
    `;

    return NextResponse.json({
      id,
      status: "pending",
      message: "Application submitted. You will be notified once reviewed.",
    });
  } catch (err) {
    console.error("Builder apply error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
