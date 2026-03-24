---
name: encryption
description: Encryption patterns, key management, hashing, digital signatures, TLS, and secure data storage
layer: domain
category: security
triggers:
  - "encryption"
  - "encrypt"
  - "decrypt"
  - "hashing"
  - "key management"
  - "cryptography"
  - "hmac"
  - "aes"
  - "rsa"
  - "digital signature"
inputs: [data sensitivity requirements, compliance needs, key rotation policies]
outputs: [encryption implementations, key management configs, hashing utilities, TLS configs]
linksTo: [authentication, owasp, aws]
linkedFrom: [authentication, security-scanner, code-review]
preferredNextSkills: [owasp, authentication]
fallbackSkills: [authentication]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Encryption Specialist

## Purpose

Implement correct cryptographic patterns for data protection including symmetric encryption (AES-GCM), asymmetric encryption (RSA, ECDSA), hashing (SHA-256, Argon2), HMAC, digital signatures, key management, and TLS configuration.

## Key Patterns

### Algorithm Selection Guide

| Use Case | Algorithm | Notes |
|----------|-----------|-------|
| **Password hashing** | Argon2id | Memory-hard, best for passwords |
| **Password hashing (alt)** | bcrypt (cost 12+) | Well-tested, widely available |
| **Data integrity** | SHA-256 | Fast, collision-resistant |
| **Message auth** | HMAC-SHA256 | Verify integrity + authenticity |
| **Symmetric encryption** | AES-256-GCM | Authenticated encryption |
| **Asymmetric encryption** | RSA-OAEP (2048+) | Key exchange, small data |
| **Digital signatures** | Ed25519 or ECDSA P-256 | Fast, compact signatures |
| **Key derivation** | HKDF or PBKDF2 | Derive keys from passwords/secrets |
| **Random tokens** | `crypto.randomBytes(32)` | API keys, session tokens |

### AES-256-GCM Encryption (Web Crypto API)

```typescript
// Works in Node.js, Deno, Cloudflare Workers, and browsers

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for export
    ["encrypt", "decrypt"]
  );
}

export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded
  );

  // Prepend IV to ciphertext: [IV (12 bytes)][ciphertext + auth tag]
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
```

### HMAC for Webhook Verification

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret);

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

// Usage in a webhook handler
export async function handleWebhook(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!signature || !verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET!)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  // Process verified event
}
```

### Password Hashing (Argon2id)

```typescript
import { hash, verify } from "@node-rs/argon2";

// Recommended Argon2id parameters (OWASP 2024)
const ARGON2_OPTIONS = {
  memoryCost: 19456,  // 19 MiB
  timeCost: 2,        // 2 iterations
  parallelism: 1,     // 1 thread
  outputLen: 32,      // 32 bytes
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
```

### Secure Token Generation

```typescript
import { randomBytes, randomUUID } from "node:crypto";

// API key (256-bit, base64url-encoded)
export function generateApiKey(): string {
  return randomBytes(32).toString("base64url");
}

// Session ID (UUID v4)
export function generateSessionId(): string {
  return randomUUID();
}

// Verification code (6-digit numeric)
export function generateVerificationCode(): string {
  const buffer = randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// URL-safe token (for reset links, invitations)
export function generateUrlToken(): string {
  return randomBytes(48).toString("base64url");
}
```

### Field-Level Encryption (Database)

```typescript
// Encrypt sensitive fields before storing in DB

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, "base64");

export async function encryptField(value: string): Promise<string> {
  const key = await importKey(ENCRYPTION_KEY);
  return encrypt(value, key);
}

export async function decryptField(encrypted: string): Promise<string> {
  const key = await importKey(ENCRYPTION_KEY);
  return decrypt(encrypted, key);
}

// Usage in a user model
async function createUser(data: { email: string; ssn: string }) {
  return db.insert(users).values({
    email: data.email,
    ssnEncrypted: await encryptField(data.ssn),
  });
}
```

## Best Practices

### General Rules
- Never implement your own cryptographic algorithms
- Use well-audited libraries (Web Crypto API, libsodium, @node-rs/argon2)
- Always use authenticated encryption (AES-GCM, ChaCha20-Poly1305)
- Use constant-time comparison for secrets (`timingSafeEqual`)
- Generate unique IVs/nonces for every encryption operation
- Never reuse an IV with the same key in GCM mode

### Key Management
- Store encryption keys in environment variables or secret managers (AWS KMS, Vault)
- Rotate keys periodically; support multiple active key versions
- Use key derivation (HKDF) to derive per-purpose keys from a master key
- Never log, commit, or embed keys in source code
- Use separate keys for different purposes (encryption, signing, hashing)

### Password Storage
- Use Argon2id (or bcrypt as fallback) — never SHA-256/MD5 for passwords
- Use per-user random salts (Argon2 handles this automatically)
- Tune cost parameters so hashing takes 100-500ms
- Rehash on login when upgrading algorithms

### Data at Rest
- Encrypt PII and sensitive fields at the application level
- Use database-level encryption (TDE) as defense in depth
- Encrypt backups with a separate key

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using MD5/SHA for passwords | Use Argon2id or bcrypt |
| Reusing IVs in AES-GCM | Generate a fresh random IV every time |
| String comparison for secrets | Use `timingSafeEqual` |
| ECB mode for AES | Use GCM or CBC with HMAC |
| Hardcoded encryption keys | Use env vars or key management service |
| `Math.random()` for tokens | Use `crypto.randomBytes()` or `crypto.getRandomValues()` |
| Logging decrypted values | Never log sensitive plaintext |

## Examples

### Key Rotation Pattern

```typescript
interface KeyVersion {
  version: number;
  key: CryptoKey;
  active: boolean;
}

class KeyManager {
  private keys: Map<number, KeyVersion> = new Map();
  private activeVersion: number = 0;

  async encrypt(plaintext: string): Promise<{ version: number; data: string }> {
    const active = this.keys.get(this.activeVersion)!;
    const data = await encrypt(plaintext, active.key);
    return { version: active.version, data };
  }

  async decrypt(version: number, encryptedData: string): Promise<string> {
    const keyVersion = this.keys.get(version);
    if (!keyVersion) throw new Error(`Key version ${version} not found`);
    return decrypt(encryptedData, keyVersion.key);
  }
}
```

### Ed25519 Digital Signatures

```typescript
async function generateSigningKeys() {
  return crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
}

async function sign(data: string, privateKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const signature = await crypto.subtle.sign("Ed25519", privateKey, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verify(data: string, signature: string, publicKey: CryptoKey): Promise<boolean> {
  const encoded = new TextEncoder().encode(data);
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("Ed25519", publicKey, sigBytes, encoded);
}
```
