// @file: apps/web/src/lib/server/session.crypto.ts
import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { envServer } from "@/config/env.server";

const ENVELOPE_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function deriveKey(secret: string): Buffer {
  const normalized = secret.trim();

  if (/^[A-Fa-f0-9]{64}$/.test(normalized)) {
    return Buffer.from(normalized, "hex");
  }

  try {
    const fromBase64 = Buffer.from(normalized, "base64");
    if (fromBase64.length === 32) {
      return fromBase64;
    }
  } catch {
    // Ignore and fall back to sha256 derivation below.
  }

  return createHash("sha256").update(normalized, "utf8").digest();
}

function getKey(): Buffer {
  if (!cachedKey) {
    cachedKey = deriveKey(envServer.HSS_SESSION_ENCRYPTION_KEY);
  }

  return cachedKey;
}

export function encryptSessionPayload(plainText: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSessionPayload(cipherText: string): string | null {
  const parts = cipherText.split(".");
  if (parts.length !== 4) return null;
  if (parts[0] !== ENVELOPE_VERSION) return null;

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const payload = Buffer.from(parts[3], "base64url");

    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;

    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
