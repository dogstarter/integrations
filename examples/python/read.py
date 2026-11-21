"""Read-only: list trending tokens from the REST API, then read one token on-chain.
    python read.py [token]
"""
import sys

from web3 import Web3

from common import contract, get_json

tokens = get_json("/tokens", tab="trending", limit=5)
for t in tokens:
    state = "graduated" if t["graduated"] else "on curve"
    print(f"{t['symbol']:<10} {t['address']}  mcap {round(t['market_cap'])} DOGE  progress {float(t['progress']):.1f}%  {state}")

# On-chain reads below use the current launchpad (DogLaunchFactoryV3), so pick a token with version 3.
# Older tokens (version 1 or 2) keep trading on their own factory (DogLaunchFactory / DogLaunchFactoryV2).
v3 = next((t for t in tokens if t.get("version") == 3), None) or next(
    t for t in get_json("/tokens", tab="new", limit=48) if t.get("version") == 3
)
token = Web3.to_checksum_address(sys.argv[1] if len(sys.argv) > 1 else v3["address"])
factory = contract("DogLaunchFactoryV3")
info = factory.functions.getTokenInfo(token).call()
# struct order: creator, pair, launchTime, graduated, gradFailedAt, rescue, lpTokenReserve, rescueQuote, rescueSold, curve, snipeOff, sellTaxBps
curve = info[9]  # virtualQuote, virtualToken, realQuote, realToken, threshold
price = curve[0] / curve[1]
print("\non-chain", token)
print("  price      ", price, "DOGE")
print("  market cap ", round(price * 1e9), "DOGE")
print("  collected  ", Web3.from_wei(curve[2], "ether"), "of", Web3.from_wei(curve[4], "ether"), "DOGE")
print("  graduated  ", info[3])
base, snipe, tax = factory.functions.buyFeeBps(token, "0x0000000000000000000000000000000000000001").call()
print("  buy fee now", (base + snipe + tax) / 100, "%")
