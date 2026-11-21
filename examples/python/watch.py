"""Follow new launches, trades and graduations on the live feed (read-only).
    python watch.py            (set API_KEY to use a free key)
"""
import asyncio
import json
import os

import websockets

URL = "wss://api.dogstarter.dog/ws" + (f"?apiKey={os.environ['API_KEY']}" if os.environ.get("API_KEY") else "")


async def main():
    while True:
        try:
            async with websockets.connect(URL) as ws:
                await ws.send(json.dumps({"type": "subscribe", "channel": "trades"}))
                async for raw in ws:
                    m = json.loads(raw)
                    kind = m.get("type")
                    if kind == "launched":
                        print("NEW  ", m.get("symbol"), m.get("token"))
                    elif kind == "trade":
                        side = "BUY " if m.get("isBuy") else "SELL"
                        print(side, m.get("symbol"), round(m.get("quoteAmount") or 0, 4), "DOGE", "(bot)" if m.get("bot") else "")
                    elif kind == "graduated":
                        print("GRAD ", m.get("token"), "pool", m.get("pair"))
        except Exception as e:  # reconnect after a short pause
            print("reconnecting:", e)
            await asyncio.sleep(3)


asyncio.run(main())
