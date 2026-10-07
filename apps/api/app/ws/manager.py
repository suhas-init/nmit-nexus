from fastapi import WebSocket
from collections import defaultdict


class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.connections[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        self.connections[user_id].discard(ws)
        if not self.connections[user_id]:
            self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, event: dict):
        dead = []
        for ws in list(self.connections.get(user_id, set())):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


manager = ConnectionManager()
