import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORES_FILE = path.join(DATA_DIR, "stores.json");

export type StoredStore = {
  merchantId: number;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  storeUrl?: string;
};

type Registry = Record<string, StoredStore>;

async function readRegistry(): Promise<Registry> {
  try {
    const raw = await fs.readFile(STORES_FILE, "utf8");
    return JSON.parse(raw) as Registry;
  } catch {
    return {};
  }
}

async function writeRegistry(registry: Registry) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORES_FILE, JSON.stringify(registry, null, 2), "utf8");
}

export async function getStore(merchantId: number): Promise<StoredStore | null> {
  const registry = await readRegistry();
  return registry[String(merchantId)] ?? null;
}

export async function upsertStore(store: StoredStore): Promise<void> {
  const registry = await readRegistry();
  registry[String(store.merchantId)] = store;
  await writeRegistry(registry);
}

export async function removeStore(merchantId: number): Promise<void> {
  const registry = await readRegistry();
  delete registry[String(merchantId)];
  await writeRegistry(registry);
}