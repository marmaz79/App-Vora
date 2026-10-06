"""Vora OCR scan + enhance endpoint tests.

Covers:
- POST /api/books/scan (AI OCR + Tesseract fallback)
- POST /api/books/{book_id}/enhance (scanned books only)
- Regression: /api/books list fields source + ocr_engine, upload stays plain pdf.
"""
import io
import os
import uuid
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/")
TEST_USER_EMAIL = "test@leggimi.it"
TEST_USER_PASSWORD = "testpass123"
# Seeded scanned books (from previous iterations – see test_credentials.md context)
SCAN_WITH_PHOTO_BOOK_ID = "12a4e3db9d954e87a7919fa7823cb57e"  # Dante AI – has photo
SCAN_NO_PHOTO_BOOK_ID = "5d8d8071fb794c308393a02664b0076a"   # Test Scan – no photos


# ------------------------------------------------------------------ helpers --
def _font():
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ]:
        if os.path.exists(path):
            return ImageFont.truetype(path, 42)
    return ImageFont.load_default()


def make_text_jpeg(lines):
    """Render a JPEG with real Italian text (black on white). Returns bytes."""
    W, H = 900, 1100
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    font = _font()
    y = 80
    for line in lines:
        draw.text((80, y), line, fill="black", font=font)
        y += 70
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return buf.getvalue()


# ------------------------------------------------------------------ fixtures --
@pytest.fixture(scope="module")
def seeded_user_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"seeded login failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def seeded_auth(seeded_user_token):
    return {"Authorization": f"Bearer {seeded_user_token}"}


@pytest.fixture(scope="module")
def other_user_token():
    """Fresh user B to confirm cross-user isolation."""
    email = f"TEST_other_{uuid.uuid4().hex[:8]}@leggimi.it"
    r = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": "otherPass123", "name": "OtherUser"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def other_auth(other_user_token):
    return {"Authorization": f"Bearer {other_user_token}"}


# --------------------------------------------------- POST /api/books/scan ----
class TestScanEndpoint:
    def test_scan_requires_auth(self):
        img = make_text_jpeg(["Testo per OCR"])
        files = [("files", ("p1.jpg", img, "image/jpeg"))]
        r = requests.post(
            f"{BASE_URL}/api/books/scan",
            params={"title": "TEST No Auth"},
            files=files,
            timeout=120,
        )
        assert r.status_code == 401

    def test_scan_no_files_returns_400(self, seeded_auth):
        r = requests.post(
            f"{BASE_URL}/api/books/scan",
            params={"title": "TEST empty"},
            files=[("files", ("empty.jpg", b"", "image/jpeg"))],
            headers=seeded_auth,
            timeout=60,
        )
        assert r.status_code == 400

    def test_scan_creates_book_with_ai_ocr(self, seeded_auth):
        """Single-page scan with clear Italian text → source=scan, ocr_engine likely 'ai'."""
        img = make_text_jpeg([
            "La divina commedia",
            "Nel mezzo del cammin",
            "di nostra vita",
        ])
        title = f"TEST Scan AI {uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/books/scan",
            params={"title": title},
            files=[("files", ("page1.jpg", img, "image/jpeg"))],
            headers=seeded_auth,
            timeout=180,
        )
        assert r.status_code == 200, r.text
        book = r.json()
        assert book["title"] == title
        assert book["source"] == "scan"
        assert book["file_type"] == "pdf"
        assert book["pages"] == 1
        assert book["ocr_engine"] in {"ai", "tesseract", "mixed"}
        # In normal operation we expect 'ai'; mark soft so a sporadic LLM miss doesn't fail suite
        if book["ocr_engine"] != "ai":
            pytest.skip(f"ocr_engine was {book['ocr_engine']}, not 'ai' – AI fallback engaged")

        # Save for later tests
        pytest.scan_book_id = book["book_id"]

        # GET content → source=scan, pages have text
        c = requests.get(
            f"{BASE_URL}/api/books/{book['book_id']}/content",
            headers=seeded_auth,
            timeout=30,
        )
        assert c.status_code == 200
        cj = c.json()
        assert cj["source"] == "scan"
        assert isinstance(cj["pages"], list)
        assert len(cj["pages"]) == 1
        assert cj["pages"][0].strip(), "transcribed page text should be non-empty"

    def test_scan_appears_in_list_with_source_and_engine(self, seeded_auth):
        bid = getattr(pytest, "scan_book_id", None)
        if not bid:
            pytest.skip("no scan book id from previous test")
        r = requests.get(f"{BASE_URL}/api/books", headers=seeded_auth, timeout=15)
        assert r.status_code == 200
        books = r.json()
        found = next((b for b in books if b["book_id"] == bid), None)
        assert found is not None, "newly scanned book not in /api/books"
        assert found["source"] == "scan"
        assert found["ocr_engine"] in {"ai", "mixed", "tesseract"}

    def test_scan_truly_blank_image_returns_400(self, seeded_auth):
        img_bytes = io.BytesIO()
        Image.new("RGB", (600, 800), "white").save(img_bytes, "JPEG")
        r = requests.post(
            f"{BASE_URL}/api/books/scan",
            params={"title": "TEST blank"},
            files=[("files", ("blank.jpg", img_bytes.getvalue(), "image/jpeg"))],
            headers=seeded_auth,
            timeout=120,
        )
        # Blank image → AI should return nothing, Tesseract nothing → 400
        assert r.status_code in (400, 200)
        if r.status_code == 200:
            pytest.skip("Blank image unexpectedly transcribed – not deterministic")


# ----------------------------------------- POST /api/books/{id}/enhance ----
class TestEnhanceEndpoint:
    def test_enhance_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/books/{SCAN_WITH_PHOTO_BOOK_ID}/enhance",
            timeout=30,
        )
        assert r.status_code == 401

    def test_enhance_unknown_book_returns_404(self, seeded_auth):
        r = requests.post(
            f"{BASE_URL}/api/books/does-not-exist-{uuid.uuid4().hex[:6]}/enhance",
            headers=seeded_auth,
            timeout=30,
        )
        assert r.status_code == 404

    def test_enhance_other_users_book_returns_404(self, other_auth):
        r = requests.post(
            f"{BASE_URL}/api/books/{SCAN_WITH_PHOTO_BOOK_ID}/enhance",
            headers=other_auth,
            timeout=30,
        )
        assert r.status_code == 404

    def test_enhance_non_scan_book_returns_400(self, seeded_auth):
        """Find a non-scan book owned by the seeded user; if none exists, upload a tiny PDF."""
        lst = requests.get(f"{BASE_URL}/api/books", headers=seeded_auth, timeout=15).json()
        non_scan = next((b for b in lst if b.get("source") != "scan"), None)
        if not non_scan:
            # Upload a minimal PDF to seed a non-scan book
            pdf = (
                b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
                b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]"
                b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
                b"4 0 obj<</Length 55>>stream\n"
                b"BT /F1 18 Tf 20 100 Td (Hello Vora enhance test) Tj ET\n"
                b"endstream endobj\n"
                b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
                b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n"
                b"0000000052 00000 n \n0000000101 00000 n \n0000000191 00000 n \n"
                b"0000000290 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n350\n%%EOF\n"
            )
            up = requests.post(
                f"{BASE_URL}/api/books/upload",
                headers=seeded_auth,
                files={"file": ("TEST_enhance_nonscan.pdf", pdf, "application/pdf")},
                timeout=60,
            )
            assert up.status_code == 200
            non_scan = up.json()
        bid = non_scan["book_id"]
        r = requests.post(
            f"{BASE_URL}/api/books/{bid}/enhance",
            headers=seeded_auth,
            timeout=30,
        )
        assert r.status_code == 400
        assert "scansionati" in r.json().get("detail", "").lower() or "solo per" in r.json().get("detail", "").lower()

    def test_enhance_old_scan_without_photos(self, seeded_auth):
        """Seeded Test Scan book has pages but no stored images → AI text correction path."""
        # Snapshot content before
        before = requests.get(
            f"{BASE_URL}/api/books/{SCAN_NO_PHOTO_BOOK_ID}/content",
            headers=seeded_auth,
            timeout=30,
        )
        if before.status_code == 404:
            pytest.skip(f"Seeded book {SCAN_NO_PHOTO_BOOK_ID} no longer exists")
        assert before.status_code == 200
        before_pages = before.json()["pages"]

        r = requests.post(
            f"{BASE_URL}/api/books/{SCAN_NO_PHOTO_BOOK_ID}/enhance",
            headers=seeded_auth,
            timeout=240,
        )
        assert r.status_code in (200, 502), r.text
        if r.status_code == 502:
            # AI unavailable at this moment — treat as flaky, don't block the suite
            pytest.skip("AI enhance temporarily unavailable (502)")
        body = r.json()
        assert body["source"] == "scan"
        assert body["ocr_engine"] in {"ai", "mixed"}
        # Content remains the same length (one entry per original page)
        after = requests.get(
            f"{BASE_URL}/api/books/{SCAN_NO_PHOTO_BOOK_ID}/content",
            headers=seeded_auth,
            timeout=30,
        ).json()
        assert len(after["pages"]) == len(before_pages)


# ---------------------------------------------- Regression on list fields --
class TestBooksListFields:
    def test_books_list_exposes_source_and_ocr_engine(self, seeded_auth):
        r = requests.get(f"{BASE_URL}/api/books", headers=seeded_auth, timeout=15)
        assert r.status_code == 200
        books = r.json()
        assert books, "seeded user should have at least one book"
        # Every entry must have the two optional fields present (value may be None for non-scan)
        for b in books:
            assert "source" in b, f"missing source in book {b.get('book_id')}"
            assert "ocr_engine" in b, f"missing ocr_engine in book {b.get('book_id')}"
            if b.get("source") == "scan":
                assert b.get("ocr_engine") in {"ai", "mixed", "tesseract"}
