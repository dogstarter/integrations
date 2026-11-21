"""Buy a token on the bonding curve, then sell what you bought. TESTNET ONLY, use a fresh test wallet.
   Works for tokens launched on DogLaunchFactoryV3 (REST field version = 3).
    PRIVATE_KEY=0x... python buy_sell.py <token> <doge>
"""
import sys

from web3 import Web3

from common import ADDR, ZERO, account, contract, send, w3

if len(sys.argv) < 2:
    raise SystemExit("usage: buy_sell.py <token> <doge>")
token = Web3.to_checksum_address(sys.argv[1])
doge = w3.to_wei(sys.argv[2] if len(sys.argv) > 2 else "1", "ether")
acct = account()
factory, lens, quoter = contract("DogLaunchFactoryV3"), contract("DogLensV3"), contract("DogQuoterV3")
erc20 = contract("DogMemeTokenV3", token)

# 1. checks: still on the curve, and no snipe tax right now
if factory.functions.getTokenInfo(token).call()[3]:
    raise SystemExit("Graduated: trade it on DogSwap (router) instead")
_, snipe, _ = factory.functions.buyFeeBps(token, acct.address).call()
if snipe > 0:
    raise SystemExit(f"Snipe tax is {snipe / 100}% right now. Wait a few seconds.")

# 2. quote and buy with 1% slippage
tokens_out, fee, refund = lens.functions.quoteBuy(token, acct.address, doge).call()
before = erc20.functions.balanceOf(acct.address).call()
r = send(acct, factory.functions.buy(token, tokens_out * 99 // 100, ZERO), value=doge)
bought = erc20.functions.balanceOf(acct.address).call() - before
print("bought", Web3.from_wei(bought, "ether"), "tokens  tx", r.transactionHash.hex())

# 3. approve the factory, quote and sell with 1% slippage
send(acct, erc20.functions.approve(ADDR["DogLaunchFactoryV3"], bought))
doge_out = quoter.functions.quoteSell(token, bought).call()[0]
r = send(acct, factory.functions.sell(token, bought, doge_out * 99 // 100, ZERO))
print("sold for about", Web3.from_wei(doge_out, "ether"), "DOGE  tx", r.transactionHash.hex())
