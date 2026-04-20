// intent: Optional embedding generation — activated by EMBEDDING_API_KEY env var
// status: done
// confidence: high

const API_KEY = process.env.EMBEDDING_API_KEY;
const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const API_URL = process.env.EMBEDDING_API_URL || "https://api.openai.com/v1/embeddings";

/**
 * Generate an embedding vector for text content.
 * Returns null if EMBEDDING_API_KEY is not configured.
 * Supports OpenAI-compatible embedding APIs.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!API_KEY) return null;

  // Truncate to ~8000 tokens (~32000 chars) for safety
  const truncated = text.slice(0, 32000);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: truncated,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data?.data?.[0]?.embedding ?? null;
}
