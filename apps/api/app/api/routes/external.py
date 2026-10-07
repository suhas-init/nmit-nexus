import httpx
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings

router = APIRouter(prefix="/external", tags=["external"])

OPEN_LIBRARY_URL = "https://openlibrary.org/search.json"
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
FIELDS = "key,title,author_name,first_publish_year,publisher,isbn,cover_i,number_of_pages_median,subject"


async def _open_library(client: httpx.AsyncClient, q: str) -> list[dict]:
    params = {"q": q, "limit": 8, "fields": FIELDS}
    r = await client.get(OPEN_LIBRARY_URL, params=params)
    r.raise_for_status()
    data = r.json()
    out = []
    for doc in data.get("docs", []):
        cover = doc.get("cover_i")
        isbn_list = doc.get("isbn") or []
        out.append({
            "source": "open_library",
            "id": doc.get("key"),
            "title": doc.get("title"),
            "authors": doc.get("author_name", []),
            "publisher": (doc.get("publisher") or [None])[0],
            "publishedDate": str(doc.get("first_publish_year") or ""),
            "description": "",
            "thumbnail": f"https://covers.openlibrary.org/b/id/{cover}-M.jpg" if cover else None,
            "isbn": next((i for i in isbn_list if len(i) == 13), isbn_list[0] if isbn_list else None),
            "pageCount": doc.get("number_of_pages_median"),
            "categories": (doc.get("subject") or [])[:4],
        })
    return out


async def _google_books(client: httpx.AsyncClient, q: str) -> list[dict]:
    params = {"q": q, "maxResults": 8, "printType": "books"}
    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY
    r = await client.get(GOOGLE_BOOKS_URL, params=params)
    r.raise_for_status()
    data = r.json()
    out = []
    for it in data.get("items", []):
        v = it.get("volumeInfo", {})
        out.append({
            "source": "google_books",
            "id": it.get("id"),
            "title": v.get("title"),
            "authors": v.get("authors", []),
            "publisher": v.get("publisher"),
            "publishedDate": v.get("publishedDate"),
            "description": (v.get("description") or "")[:400],
            "thumbnail": (v.get("imageLinks") or {}).get("thumbnail"),
            "isbn": next((x["identifier"] for x in v.get("industryIdentifiers", []) if x["type"] == "ISBN_13"), None),
            "pageCount": v.get("pageCount"),
            "categories": v.get("categories", []),
        })
    return out


@router.get("/books/search")
async def search_books(q: str = Query(min_length=2, max_length=120)):
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            results = await _open_library(client, q)
            if results:
                return {"count": len(results), "source": "open_library", "results": results}
        except Exception:
            pass
        try:
            results = await _google_books(client, q)
            return {"count": len(results), "source": "google_books", "results": results}
        except Exception as e:
            raise HTTPException(502, f"both book providers failed: {e}")
