from typing import Generic, TypeVar, List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Query

T = TypeVar("T")


class PaginationParams:
    def __init__(
        self,
        page: int = 1,
        page_size: int = 10,
        search: str = "",
        sort_by: str = "id",
        sort_order: str = "desc"
    ):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), 100)
        self.search = search.strip()
        self.sort_by = sort_by
        self.sort_order = sort_order.lower()


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(description="Total count of records matching filter")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of records per page")
    total_pages: int = Field(description="Total number of pages")


def paginate(query: Query, page: int = 1, page_size: int = 10):
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total, total_pages
