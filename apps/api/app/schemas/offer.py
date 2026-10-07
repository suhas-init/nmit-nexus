from datetime import datetime
from pydantic import BaseModel, Field

class OfferCreate(BaseModel):
    offer_price: float = Field(gt=0)
    message: str | None = Field(default=None, max_length=500)

class OfferOut(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    offer_price: float
    message: str | None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    message_type: str
    body: str
    created_at: datetime
    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    last_message_at: datetime
    class Config:
        from_attributes = True
