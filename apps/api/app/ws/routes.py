import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.ws.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
    except ValueError:
        await websocket.close(code=4401)
        return
    if payload.get("type") != "access":
        await websocket.close(code=4401)
        return
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4401)
        return

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.id == user_id))
        if res.scalar_one_or_none() is None:
            await websocket.close(code=4401)
            return

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")
            if msg_type.startswith("call."):
                target = msg.get("to")
                if not target:
                    continue
                # server stamps the sender ID — client cannot spoof
                relay = {**msg, "from": user_id}
                # remove client-provided "from" if any
                relay.pop("from_id", None)
                await manager.send_to_user(target, relay)
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
