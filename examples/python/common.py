import json
import os
import pathlib

import requests
from web3 import Web3

ROOT = pathlib.Path(__file__).resolve().parents[2]
NETWORK = os.environ.get("NETWORK", "testnet")
NET = json.loads((ROOT / "addresses" / f"{NETWORK}.json").read_text())
ADDR = NET["contracts"]
API = os.environ.get("API_URL", "https://api.dogstarter.dog")
ZERO = "0x0000000000000000000000000000000000000000"

w3 = Web3(Web3.HTTPProvider(os.environ.get("RPC_URL", NET["rpc"])))


def abi(name):
    return json.loads((ROOT / "abi" / f"{name}.json").read_text())


def contract(name, address=None):
    return w3.eth.contract(address=Web3.to_checksum_address(address or ADDR[name]), abi=abi(name))


def account():
    key = os.environ.get("PRIVATE_KEY")
    if not key:
        raise SystemExit("Set PRIVATE_KEY to a fresh test wallet key")
    return w3.eth.account.from_key(key)


def send(acct, fn, value=0):
    tx = fn.build_transaction({"from": acct.address, "value": value, "nonce": w3.eth.get_transaction_count(acct.address)})
    signed = acct.sign_transaction(tx)
    raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction
    receipt = w3.eth.wait_for_transaction_receipt(w3.eth.send_raw_transaction(raw))
    if receipt.status != 1:
        raise SystemExit(f"transaction failed: {receipt.transactionHash.hex()}")
    return receipt


def get_json(path, **params):
    """GET a launchpad list from the REST API (/api/v1, with the older /api path as a fallback)."""
    r = requests.get(f"{API}/api/v1{path}", params=params, timeout=20)
    if r.status_code == 404:
        r = requests.get(f"{API}/api{path}", params=params, timeout=20)
    r.raise_for_status()
    return r.json()
