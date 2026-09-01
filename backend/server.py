from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Request
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import uuid
import bcrypt
import jwt
import httpx
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pypdf import PdfReader
from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGO = 'HS256'

# MongoDB
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Storage config
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "leggimi-books"
storage_key: Optional[str] = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Storage helpers ----------
def init_storage_sync() -> str:
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object_sync(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage_sync()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()


def get_object_sync(path: str) -> tuple[bytes, str]:
    key = init_storage_sync()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"  # email | google
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class AuthResponse(BaseModel):
    session_token: str
    user: User


class Book(BaseModel):
    book_id: str
    owner_id: str
    title: str
    file_type: str  # pdf | epub
    storage_path: str
    size: int
    pages: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookContent(BaseModel):
    book_id: str
    title: str
    pages: List[str]  # each page's plain text


# ---------- Auth utilities ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_session_token() -> str:
    return f"lgm_{uuid.uuid4().hex}"


async def create_session(user_id: str) -> str:
    token = make_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    return token


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autenticato")
    token = authorization.split(" ", 1)[1].strip()
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Sessione non valida")
    exp = sess.get("expires_at")
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessione scaduta")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return User(**user)


# ---------- Text extraction ----------
def extract_pdf_pages(data: bytes) -> List[str]:
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for p in reader.pages:
        try:
            txt = p.extract_text() or ""
        except Exception:
            txt = ""
        pages.append(txt.strip())
    return pages if pages else [""]


def extract_epub_pages(data: bytes) -> List[str]:
    # Write to temp file since ebooklib prefers a path
    tmp = f"/tmp/{uuid.uuid4().hex}.epub"
    with open(tmp, "wb") as f:
        f.write(data)
    try:
        book = epub.read_epub(tmp)
        pages = []
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                soup = BeautifulSoup(item.get_content(), "lxml")
                text = soup.get_text(separator="\n").strip()
                if text:
                    # split into ~1500 char pages for TTS friendliness
                    for i in range(0, len(text), 1500):
                        pages.append(text[i:i + 1500])
        return pages if pages else [""]
    finally:
        try:
            os.remove(tmp)
        except Exception:
            pass


def extract_title_from_filename(name: str) -> str:
    base = os.path.splitext(name)[0]
    return base.replace("_", " ").replace("-", " ").strip() or "Senza titolo"


# ---------- Routes: Auth ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(payload: RegisterRequest):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": payload.email.lower(),
        "name": payload.name.strip() or payload.email.split("@")[0],
        "picture": None,
        "auth_provider": "email",
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = await create_session(user_id)
    user_doc.pop("password_hash", None)
    return AuthResponse(session_token=token, user=User(**user_doc))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Email o password non validi")
    if not check_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o password non validi")
    token = await create_session(user["user_id"])
    user.pop("password_hash", None)
    return AuthResponse(session_token=token, user=User(**user))


@api_router.post("/auth/session", response_model=AuthResponse)
async def google_session(payload: GoogleSessionRequest):
    async with httpx.AsyncClient(timeout=30) as ac:
        r = await ac.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessione Google non valida")
    data = r.json()
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data.get("session_token") or make_session_token()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        })
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return AuthResponse(session_token=session_token, user=User(**user_doc))


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------- Routes: Books ----------
@api_router.post("/books/upload", response_model=Book)
async def upload_book(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    filename = file.filename or "libro"
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    if ext not in ("pdf", "epub"):
        raise HTTPException(status_code=400, detail="Formato non supportato. Usa PDF o EPUB.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File vuoto")
    if len(data) > 60 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File troppo grande (max 60MB)")

    # extract pages for indexing
    try:
        if ext == "pdf":
            pages = await run_in_threadpool(extract_pdf_pages, data)
        else:
            pages = await run_in_threadpool(extract_epub_pages, data)
    except Exception as e:
        logger.exception("extraction failed")
        raise HTTPException(status_code=400, detail=f"Impossibile leggere il file: {e}")

    book_id = uuid.uuid4().hex
    storage_path = f"{APP_NAME}/uploads/{user.user_id}/{book_id}.{ext}"
    content_type = "application/pdf" if ext == "pdf" else "application/epub+zip"
    try:
        await run_in_threadpool(put_object_sync, storage_path, data, content_type)
    except Exception as e:
        logger.exception("storage upload failed")
        raise HTTPException(status_code=500, detail=f"Errore storage: {e}")

    title = extract_title_from_filename(filename)
    book = {
        "book_id": book_id,
        "owner_id": user.user_id,
        "title": title,
        "file_type": ext,
        "storage_path": storage_path,
        "size": len(data),
        "pages": len(pages),
        "created_at": datetime.now(timezone.utc),
        "deleted": False,
    }
    await db.books.insert_one(book)
    # store pages separately for fast retrieval
    await db.book_pages.insert_one({
        "book_id": book_id,
        "owner_id": user.user_id,
        "pages": pages,
    })
    book.pop("deleted", None)
    return Book(**book)


@api_router.get("/books", response_model=List[Book])
async def list_books(user: User = Depends(get_current_user)):
    cursor = db.books.find({"owner_id": user.user_id, "deleted": {"$ne": True}}, {"_id": 0, "deleted": 0}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return [Book(**d) for d in docs]


@api_router.get("/books/{book_id}/content", response_model=BookContent)
async def get_book_content(book_id: str, user: User = Depends(get_current_user)):
    book = await db.books.find_one({"book_id": book_id, "owner_id": user.user_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    pages_doc = await db.book_pages.find_one({"book_id": book_id, "owner_id": user.user_id}, {"_id": 0})
    pages = pages_doc.get("pages", []) if pages_doc else []
    return BookContent(book_id=book_id, title=book["title"], pages=pages)


@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, user: User = Depends(get_current_user)):
    res = await db.books.update_one(
        {"book_id": book_id, "owner_id": user.user_id},
        {"$set": {"deleted": True}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    return {"ok": True}


@api_router.get("/books/search")
async def search_books(q: str = "", user: User = Depends(get_current_user)):
    q = (q or "").strip()
    query = {"owner_id": user.user_id, "deleted": {"$ne": True}}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    docs = await db.books.find(query, {"_id": 0, "deleted": 0}).sort("created_at", -1).to_list(500)
    return [Book(**d) for d in docs]


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"message": "Leggimi API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Mongo indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.books.create_index([("owner_id", 1), ("created_at", -1)])
        await db.books.create_index("book_id", unique=True)
    except Exception as e:
        logger.warning(f"Index setup failed: {e}")
    # storage init
    try:
        await run_in_threadpool(init_storage_sync)
        logger.info("Storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
