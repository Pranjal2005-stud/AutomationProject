from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProcessingLogResponse(BaseModel):
    id: int
    module: str
    action: str
    status: str
    details: Optional[str] = None
    duration_ms: Optional[int] = None
    timestamp: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SystemSettingUpdate(BaseModel):
    value: str


class SystemSettingResponse(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
