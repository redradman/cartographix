from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class LandmarkItem(BaseModel):
    name: str = Field(default="", max_length=100)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class GenerateRequest(BaseModel):
    city: str = Field(..., min_length=1, max_length=100)
    country: str = Field(default="", max_length=100)
    theme: str = Field(default="default")
    distance: int = Field(default=10000, ge=1000, le=20000)
    email: Optional[EmailStr] = None
    output_format: str = Field(default="instagram")
    custom_title: str = Field(default="", max_length=100)
    landmarks: List[LandmarkItem] = Field(default_factory=list, max_length=5)

    @field_validator("email", mode="before")
    @classmethod
    def empty_string_to_none(cls, v: object) -> object:
        if v == "":
            return None
        return v


class GenerateResponse(BaseModel):
    job_id: str
    status: str
    estimated_seconds: int


class StatusResponse(BaseModel):
    job_id: str
    status: str
    city: str
    theme: str
    poster_url: Optional[str] = None
    stage: Optional[str] = None
    error_message: Optional[str] = None
    share_id: Optional[str] = None


class ShareRequest(BaseModel):
    gallery_opt_in: bool = Field(default=False)


class ShareResponse(BaseModel):
    share_id: str
    share_url: str


class GalleryItem(BaseModel):
    share_id: str
    city: str
    country: str
    theme: str
    poster_url: str
    created_at: str


class GalleryResponse(BaseModel):
    posters: List[GalleryItem]
    total: int


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
