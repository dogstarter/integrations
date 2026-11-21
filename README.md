# Dogstarter integrations

Everything a trading terminal, Telegram bot or data site needs to list and trade [Dogstarter](https://dogstarter.dog) tokens on DogeOS:

- `addresses/` contract addresses per network
- `abi/` ABI files (plain JSON arrays for viem, ethers or web3.py)
- `openapi.json` the public REST API as OpenAPI 3.1
- `examples/typescript` and `examples/python` read, quote, buy and sell on the bonding curve
- `bot/` a small sample bot that follows new launches and trades on the live feed

Full guide: **https://dogstarter.dog/docs/integrate**

> Status: DogeOS Chikyu testnet. Testnet DOGE has no value. On mainnet launch day the addresses in `addresses/mainnet.json` are filled in and a few function changes apply (listed in the guide under "Moving to mainnet"). The Dogstarter contracts have not been audited yet.

## Networks

| Network | Chain ID | RPC | Explorer |
| --- | --- | --- | --- |
| DogeOS Chikyu Testnet | 6281971 | https://rpc.testnet.dogeos.com | https://dogeos-testnet.l2scan.co |
| DogeOS mainnet | announced at launch | | |

Test DOGE: https://faucet.testnet.dogeos.com

## How a Dogstarter token works

1. **Launch.** 1,000,000,000 supply, 18 decimals. 80% is sold on a bonding curve, 20% is kept for the DogSwap pool.
2. **Curve.** Constant product on virtual reserves: `price = virtualQuote / virtualToken` (DOGE per token), `market cap = price x 1,000,000,000`.
3. **Fees.** 1% on every curve buy and sell, plus an optional creator tax (0 to 5%, curve only). For 5 seconds after trading opens, buys pay an extra snipe tax that starts at 99% and divides by four every second. Read `buyFeeBps(token, trader)` before a buy.
4. **Graduation.** When the curve has collected the threshold (420 DOGE on testnet), the token moves to its DogSwap pool in the same transaction and the LP is locked forever. After that, trade through the DogSwap router.

## Quick start

```bash
# TypeScript (Node 22+)
cd examples/typescript && npm install
npx tsx read.ts                 # list tokens and read one on-chain (no key needed)
PRIVATE_KEY=0x... npx tsx buy-sell.ts 0xTOKEN 1   # buy 1 test DOGE worth, then sell it back

# Python 3.10+
cd examples/python && pip install -r requirements.txt
python read.py
PRIVATE_KEY=0x... python buy_sell.py 0xTOKEN 1

# Sample bot (prints new launches and trades; DRY_RUN=1 by default)
cd bot && npm install && npx tsx bot.ts
```

Use a fresh test wallet. Never put a key that holds real funds in a script.

## Data

- REST: `https://api.dogstarter.dog/api/v1` (read-only, open to any website). See `openapi.json`.
- WebSocket: `wss://api.dogstarter.dog/ws`, channels `trades`, `token:<address>`, `dex`, `dexpair:<pair>`.
- Limits: 3,000 reads a minute per IP without a key. Free API keys (12,000 reads a minute per key) on request: send the `x-api-key` header, or `?apiKey=` on the WebSocket URL.

## Rules of the road

- Show the real token address and a link to its Dogstarter page.
- Never hide fees or taxes from your users, and always pass a real minimum out.
- The contracts are the source of truth. Check anything that moves money on-chain.

## Contact

Telegram community: https://t.me/dogstarter_dog · Email: contact@dogstarter.dog · Security issues: email only, please.

## License

MIT. See `LICENSE`. Nothing here is financial advice.
