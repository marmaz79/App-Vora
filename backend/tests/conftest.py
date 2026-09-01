import os
import io
import time
import uuid
import pytest
import requests
from dotenv import load_dotenv

# Load frontend .env to get the public preview URL used by clients (contract truth)
load_dotenv("/app/frontend/.env")

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing from /app/frontend/.env"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


def _register(session, base, email, password, name):
    r = session.post(
        f"{base}/api/auth/register",
        json={"email": email, "password": password, "name": name},
        timeout=30,
    )
    return r


def _login(session, base, email, password):
    r = session.post(
        f"{base}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    return r


@pytest.fixture(scope="session")
def user_a(api_client, base_url):
    """Create (or reuse via login) a dedicated user A."""
    email = f"TEST_a_{uuid.uuid4().hex[:8]}@leggimi.it"
    password = "userAPass!123"
    name = "TEST User A"
    r = _register(api_client, base_url, email, password, name)
    assert r.status_code == 200, f"register A failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["session_token"],
        "user": data["user"],
    }


@pytest.fixture(scope="session")
def user_b(api_client, base_url):
    email = f"TEST_b_{uuid.uuid4().hex[:8]}@leggimi.it"
    password = "userBPass!123"
    name = "TEST User B"
    r = _register(api_client, base_url, email, password, name)
    assert r.status_code == 200, f"register B failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["session_token"],
        "user": data["user"],
    }


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def auth_header_a(user_a):
    return _auth(user_a["token"])


@pytest.fixture(scope="session")
def auth_header_b(user_b):
    return _auth(user_b["token"])


@pytest.fixture(scope="session")
def sample_pdf_bytes():
    """Generate a tiny in-memory PDF using pypdf (no reportlab dependency).

    We build a minimal 1-page PDF that pypdf can parse; text extraction may
    yield empty string, which is acceptable (server accepts that)."""
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


@pytest.fixture(scope="session")
def sample_pdf_with_text():
    """A PDF that contains extractable text via a hand-crafted content stream.

    Small and self-contained; avoids adding reportlab as a runtime dep."""
    # Minimal PDF (from Adobe reference example, slightly adapted)
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]"
        b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        b"4 0 obj<</Length 55>>stream\n"
        b"BT /F1 18 Tf 20 100 Td (Hello Leggimi Test) Tj ET\n"
        b"endstream endobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000052 00000 n \n"
        b"0000000101 00000 n \n"
        b"0000000191 00000 n \n"
        b"0000000290 00000 n \n"
        b"trailer<</Size 6/Root 1 0 R>>\n"
        b"startxref\n350\n%%EOF\n"
    )
    return pdf
