// Read-only: list trending tokens from the REST API, then read one token on-chain.
//   npx tsx read.ts [token]
import { formatEther } from "viem";
import { abi, addr, getJson, pub } from "./common";

const tokens = await getJson("/tokens?tab=trending&limit=5");
for (const t of tokens) {
  console.log(`${t.symbol.padEnd(10)} ${t.address}  mcap ${Math.round(t.market_cap)} DOGE  progress ${Number(t.progress).toFixed(1)}%  ${t.graduated ? "graduated" : "on curve"}`);
}

// On-chain reads below use the current launchpad (DogLaunchFactoryV3), so pick a token with version 3.
// Older tokens (version 1 or 2) keep trading on their own factory (DogLaunchFactory / DogLaunchFactoryV2).
const v3 = tokens.find((t: any) => t.version === 3) || (await getJson("/tokens?tab=new&limit=48")).find((t: any) => t.version === 3);
const token = (process.argv[2] || v3.address) as `0x${string}`;
const factory = { address: addr.DogLaunchFactoryV3, abi: abi("DogLaunchFactoryV3") } as const;
const info: any = await pub.readContract({ ...factory, functionName: "getTokenInfo", args: [token] });
const price = Number(info.curve.virtualQuote) / Number(info.curve.virtualToken);
console.log("\non-chain", token);
console.log("  price      ", price, "DOGE");
console.log("  market cap ", Math.round(price * 1e9), "DOGE");
console.log("  collected  ", formatEther(info.curve.realQuote), "of", formatEther(info.curve.threshold), "DOGE");
console.log("  graduated  ", info.graduated, info.graduated ? `pool ${info.pair}` : "");

const [baseBps, snipeBps, taxBps] = (await pub.readContract({
  ...factory, functionName: "buyFeeBps", args: [token, "0x0000000000000000000000000000000000000001"],
})) as readonly bigint[];
console.log("  buy fee now", Number(baseBps + snipeBps + taxBps) / 100, "%");
