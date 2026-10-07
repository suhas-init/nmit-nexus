from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

CONDITIONS = {"NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"}
TYPES = {"SELL", "RENT", "BORROW", "FREE"}

class ListingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=5000)
    price: Decimal = Field(ge=0)
    category_id: str | None = None
    condition: str = "GOOD"
    type: str = "SELL"

class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=5, max_length=5000)
    price: Decimal | None = Field(default=None, ge=0)
    category_id: str | None = None
    condition: str | None = None
    type: str | None = None

class SellerOut(BaseModel):
    id: str
    name: str
    campus_verified: bool
    avg_rating: float
    completed_transactions: int
    class Config:
        from_attributes = True

class ListingOut(BaseModel):
    id: str
    seller_id: str
    category_id: str | None
    title: str
    description: str
    price: float
    condition: str
    status: str
    type: str
    created_at: datetime
    sold_at: datetime | None
    class Config:
        from_attributes = True
