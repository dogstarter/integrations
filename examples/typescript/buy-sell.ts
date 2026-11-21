// Buy a token on the bonding curve, then sell what you bought. TESTNET ONLY, use a fresh test wallet.
//   Works for tokens launched on DogLaunchFactoryV3 (REST field version = 3).
//   PRIVATE_KEY=0x... npx tsx buy-sell.ts <token> <doge>
import { erc20Abi, formatEther, parseEther, zeroAddress } from "viem";
import { abi, addr, pub, wallet } from "./common";

const token = process.argv[2] as `0x${string}`;
if (!token) throw new Error("usage: buy-sell.ts <token> <doge>");
const doge = parseEther(process.argv[3] || "1");
const { account, client } = wallet();
const factory = { address: addr.DogLaunchFactoryV3, abi: abi("DogLaunchFactoryV3") } as const;

// 1. checks: still on the curve, and no snipe tax right now
const info: any = await pub.readContract({ ...factory, functionName: "getTokenInfo", args: [token] });
if (info.graduated) throw new Error("Graduated: trade it on DogSwap (router) instead");
const [, snipeBps] = (await pub.readContract({ ...factory, functionName: "buyFeeBps", args: [token, account.address] })) as readonly bigint[];
if (snipeBps > 0n) throw new Error(`Snipe tax is ${Number(snipeBps) / 100}% right now. Wait a few seconds.`);

// 2. quote and buy with 1% slippage
const [tokensOut] = (await pub.readContract({ address: addr.DogLensV3, abi: abi("DogLensV3"), functionName: "quoteBuy", args: [token, account.address, doge] })) as readonly bigint[];
const before = await pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
let hash = await client.writeContract({ ...factory, functionName: "buy", args: [token, (tokensOut * 99n) / 100n, zeroAddress], value: doge });
await pub.waitForTransactionReceipt({ hash });
const bought = (await pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] })) - before;
console.log("bought", formatEther(bought), "tokens  tx", hash);

// 3. approve the factory, quote and sell with 1% slippage
hash = await client.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [addr.DogLaunchFactoryV3, bought] });
await pub.waitForTransactionReceipt({ hash });
const [dogeOut] = (await pub.readContract({ address: addr.DogQuoterV3, abi: abi("DogQuoterV3"), functionName: "quoteSell", args: [token, bought] })) as readonly bigint[];
hash = await client.writeContract({ ...factory, functionName: "sell", args: [token, bought, (dogeOut * 99n) / 100n, zeroAddress] });
await pub.waitForTransactionReceipt({ hash });
console.log("sold for about", formatEther(dogeOut), "DOGE  tx", hash);
