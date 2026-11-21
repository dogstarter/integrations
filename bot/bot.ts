// Sample bot: follows the live feed and prints every launch, trade and graduation.
// With DRY_RUN=0 it also makes a small test buy of each new token once its snipe tax is over. TESTNET ONLY.
//
//   npx tsx bot.ts                                         watch only (default)
//   DRY_RUN=0 PRIVATE_KEY=0x... BUY_DOGE=0.5 npx tsx bot.ts  also buy new launches (fresh test wallet!)
//
// Optional: API_KEY=dsk_... (free key, higher limits), NETWORK=testnet, RPC_URL=...
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, parseEther, zeroAddress, type Abi, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = new URL("../", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const net = json(`addresses/${process.env.NETWORK || "testnet"}.json`);
const addr = net.contracts as Record<string, Address>;
const factoryAbi = json("abi/DogLaunchFactoryV3.json") as Abi;
const lensAbi = json("abi/DogLensV3.json") as Abi;

const DRY_RUN = process.env.DRY_RUN !== "0";
const BUY = parseEther(process.env.BUY_DOGE || "0.5");
const MAX_BUY = parseEther("5"); // hard cap per trade in this sample
const WS_URL = "wss://api.dogstarter.dog/ws" + (process.env.API_KEY ? `?apiKey=${process.env.API_KEY}` : "");

const chain = defineChain({
  id: net.chainId,
  name: net.name,
  nativeCurrency: { name: "DOGE", symbol: "DOGE", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL || net.rpc] } },
});
const pub = createPublicClient({ chain, transport: http() });
const account = !DRY_RUN && process.env.PRIVATE_KEY ? privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`) : null;
const wallet = account ? createWalletClient({ account, chain, transport: http() }) : null;
if (!DRY_RUN && !wallet) throw new Error("DRY_RUN=0 needs PRIVATE_KEY (a fresh test wallet)");
if (BUY > MAX_BUY) throw new Error("BUY_DOGE is above the 5 DOGE cap of this sample");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bought = new Set<string>();

async function tryBuy(token: Address, symbol: string) {
  if (!wallet || !account || bought.has(token)) return;
  bought.add(token);
  // wait until the snipe tax is over (at most 5 s after trading opens; scheduled tokens open later)
  for (let i = 0; i < 20; i++) {
    const [, snipeBps, taxBps] = (await pub.readContract({ address: addr.DogLaunchFactoryV3, abi: factoryAbi, functionName: "buyFeeBps", args: [token, account.address] })) as readonly bigint[];
    if (taxBps > 200n) return console.log(`  skip ${symbol}: creator buy tax ${Number(taxBps) / 100}%`);
    if (snipeBps === 0n) break;
    await sleep(1500);
  }
  try {
    const [tokensOut] = (await pub.readContract({ address: addr.DogLensV3, abi: lensAbi, functionName: "quoteBuy", args: [token, account.address, BUY] })) as readonly bigint[];
    const hash = await wallet.writeContract({ address: addr.DogLaunchFactoryV3, abi: factoryAbi, functionName: "buy", args: [token, (tokensOut * 98n) / 100n, zeroAddress], value: BUY });
    const r = await pub.waitForTransactionReceipt({ hash });
    console.log(`  bought ${symbol}: ${r.status} ${hash}`);
  } catch (e) {
    console.log(`  buy failed for ${symbol}:`, (e as Error).message.split("\n")[0]);
  }
}

function connect() {
  const ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    console.log(`connected (${DRY_RUN ? "watch only" : "buying " + process.env.BUY_DOGE + " DOGE per new launch"})`);
    ws.send(JSON.stringify({ type: "subscribe", channel: "trades" }));
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    if (m.type === "launched") {
      console.log(`NEW   ${m.symbol} ${m.token} by ${m.creator}`);
      void tryBuy(m.token, m.symbol);
    } else if (m.type === "trade") {
      console.log(`${m.isBuy ? "BUY " : "SELL"}  ${m.symbol} ${Number(m.quoteAmount).toFixed(4)} DOGE${m.bot ? " (bot)" : ""}`);
    } else if (m.type === "graduated") {
      console.log(`GRAD  ${m.token} -> pool ${m.pair}`);
    }
  };
  ws.onclose = () => {
    console.log("disconnected, reconnecting in 3 s");
    setTimeout(connect, 3000);
  };
  ws.onerror = () => ws.close();
}

connect();
