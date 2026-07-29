from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: Optional[T] = None


class PaginatedData(BaseModel, Generic[T]):
    items: list
    total: int
    page: int
    page_size: int
    has_more: bool


def ok(data: T = None, message: str = "OK") -> APIResponse:  # type: ignore[assignment]
    return APIResponse(success=True, message=message, data=data)


def err(message: str) -> APIResponse:
    return APIResponse(success=False, message=message)
