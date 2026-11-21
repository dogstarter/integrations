import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, type Abi, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = new URL("../../", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, root), "utf8"));

export const NETWORK = process.env.NETWORK || "testnet";
export const net = json(`addresses/${NETWORK}.json`);
export const addr = net.contracts as Record<string, Address>;
export const abi = (name: string) => json(`abi/${name}.json`) as Abi;

export const chain = defineChain({
  id: net.chainId,
  name: net.name,
  nativeCurrency: { name: "DOGE", symbol: "DOGE", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL || net.rpc] } },
});

export const pub = createPublicClient({ chain, transport: http() });

export function wallet() {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("Set PRIVATE_KEY to a fresh test wallet key");
  const account = privateKeyToAccount(key as `0x${string}`);
  return { account, client: createWalletClient({ account, chain, transport: http() }) };
}

export const API = process.env.API_URL || "https://api.dogstarter.dog";

/** GET a launchpad list from the REST API (/api/v1, with the older /api path as a fallback). */
export async function getJson(path: string) {
  let r = await fetch(`${API}/api/v1${path}`);
  if (r.status === 404) r = await fetch(`${API}/api${path}`);
  if (!r.ok) throw new Error(`API ${r.status} for ${path}`);
  return r.json();
}
