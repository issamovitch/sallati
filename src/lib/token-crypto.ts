import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Encrypts Salla access/refresh tokens before they touch the database.
 *
 * The key is derived from SALLA_CLIENT_SECRET (server-only) so no extra secret
 * has to be provisioned. Rotating that secret invalidates stored tokens, which
 * only means the merchant has to link the store again.
 */

const VERSION = "v1";
const SALT = "sallati:store-tokens";
const INFO = "store-tokens-aes-256-gcm";

function derivedKey(): Buffer | null {
  const secret = process.env.SALLA_CLIENT_SECRET?.trim();
  if (!secret) return null;
  return Buffer.from(hkdfSync("sha256", secret, SALT, INFO, 32));
}

export function canEncryptTokens(): boolean {
  return derivedKey() !== null;
}

export function encryptToken(value: string): string | null {
  const key = derivedKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(value: string | null | undefined): string | null {
  const key = derivedKey();
  if (!key || typeof value !== "string") return null;

  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
