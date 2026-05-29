import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Encrypted key storage for AI provider API keys.
 *
 * Keys are stored in ~/.pocketdevos/keys.json encrypted with AES-256-GCM.
 * The encryption key is stored in ~/.pocketdevos/.keyfile (mode 0600).
 * On first run, a random 32-byte key is generated.
 */

const KEYS_DIR = join(homedir(), ".pocketdevos");
const KEYS_FILE = join(KEYS_DIR, "keys.json");
const KEYFILE_PATH = join(KEYS_DIR, ".keyfile");
const ALGORITHM = "aes-256-gcm";

/**
 * Get or create the encryption key.
 * Stored in ~/.pocketdevos/.keyfile with mode 0600.
 */
function getEncryptionKey(): Buffer {
  ensureDir();

  if (existsSync(KEYFILE_PATH)) {
    const hex = readFileSync(KEYFILE_PATH, "utf-8").trim();
    return Buffer.from(hex, "hex");
  }

  // Generate a new random key
  const key = randomBytes(32);
  writeFileSync(KEYFILE_PATH, key.toString("hex"), "utf-8");

  // Set restrictive permissions (ignored on Windows but works on Termux/Linux)
  try {
    chmodSync(KEYFILE_PATH, 0o600);
  } catch {
    // chmod may fail on some systems, non-critical
  }

  return key;
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(data: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = data.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function ensureDir(): void {
  if (!existsSync(KEYS_DIR)) {
    mkdirSync(KEYS_DIR, { recursive: true });
  }
}

function readStore(): Record<string, string> {
  ensureDir();
  if (!existsSync(KEYS_FILE)) return {};

  try {
    const raw = readFileSync(KEYS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, string>): void {
  ensureDir();
  writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Get a decrypted API key for a provider.
 */
export function getKey(provider: string): string | null {
  const store = readStore();
  const encrypted = store[provider];
  if (!encrypted) return null;

  try {
    return decrypt(encrypted);
  } catch {
    return null;
  }
}

/**
 * Store an encrypted API key for a provider.
 */
export function setKey(provider: string, key: string): void {
  const store = readStore();
  store[provider] = encrypt(key);
  writeStore(store);
}

/**
 * Delete a provider's API key.
 */
export function deleteKey(provider: string): boolean {
  const store = readStore();
  if (!(provider in store)) return false;
  delete store[provider];
  writeStore(store);
  return true;
}

/**
 * List all providers that have keys stored.
 */
export function listProviders(): string[] {
  const store = readStore();
  return Object.keys(store);
}
