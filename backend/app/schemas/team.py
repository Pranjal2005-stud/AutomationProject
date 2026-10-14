from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class TeamMemberCreate(BaseModel):
    email: str
    name: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    email: str
    name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    members: List[TeamMemberCreate] = []


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    members: List[TeamMemberResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
