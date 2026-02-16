from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class GenerateRequest(BaseModel):
    city: str = Field(..., min_length=1, max_length=100)
    country: str = Field(..., min_length=1, max_length=100)
    theme: str = Field(default="default")
    distance: int = Field(default=3000, ge=500, le=20000)
    email: Optional[EmailStr] = None


class GenerateResponse(BaseModel):
    job_id: str
    status: str
    estimated_seconds: int


class StatusResponse(BaseModel):
    job_id: str
    status: str
    city: str
    theme: str


class ThemeItem(BaseModel):
    id: str
    name: str
    description: str
    preview_colors: List[str]


class ThemesResponse(BaseModel):
    themes: List[ThemeItem]


class HealthResponse(BaseModel):
    status: str
    version: str


class ErrorResponse(BaseModel):
    error: str
    detail: str
