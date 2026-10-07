from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.ws.manager import manager


async def notify(db: AsyncSession, user_id: str, type_: str, payload: dict):
    n = Notification(user_id=user_id, type=type_, payload=payload)
    db.add(n)
    await db.flush()
    # realtime toast
    await manager.send_to_user(user_id, {
        "type": "notification.created",
        "notification_type": type_,
        **payload,
    })
    return n
