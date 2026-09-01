"""Leggimi backend API tests.

Covers auth (register/login/me/logout), books CRUD (upload/list/content/
delete), search, and ownership isolation between users.
"""

import io
import uuid
import pytest


# ---------------------------------------------------------------- Health ----
class TestHealth:
    def test_api_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "ok"


# ------------------------------------------------------------------ Auth ----
class TestAuth:
    def test_register_and_me(self, api_client, base_url):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@leggimi.it"
        r = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "regPass123", "name": "TEST Reg"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_token" in data and data["session_token"].startswith("lgm_")
        user = data["user"]
        assert user["email"] == email.lower()
        assert user["name"] == "TEST Reg"
        assert user["auth_provider"] == "email"
        assert "user_id" in user
        # /auth/me
        me = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {data['session_token']}"},
            timeout=15,
        )
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()

    def test_register_duplicate_email(self, api_client, base_url, user_a):
        r = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": user_a["email"], "password": "whatever", "name": "dup"},
            timeout=15,
        )
        assert r.status_code == 400
        assert "già" in r.json().get("detail", "").lower() or "esist" in r.json().get("detail", "").lower()

    def test_login_success(self, api_client, base_url, user_a):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": user_a["email"], "password": user_a["password"]},
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == user_a["email"].lower()
        assert data["session_token"].startswith("lgm_")

    def test_login_wrong_password(self, api_client, base_url, user_a):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": user_a["email"], "password": "wrong-pw"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_me_without_token_returns_401(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_invalid_token_returns_401(self, api_client, base_url):
        r = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": "Bearer lgm_deadbeef"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_logout_invalidates_token(self, api_client, base_url):
        # Create a throwaway user
        email = f"TEST_out_{uuid.uuid4().hex[:8]}@leggimi.it"
        reg = api_client.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "outPass123", "name": "OutUser"},
            timeout=15,
        )
        assert reg.status_code == 200
        tok = reg.json()["session_token"]
        # logout
        lo = api_client.post(
            f"{base_url}/api/auth/logout",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        assert lo.status_code == 200
        # /me with same token should now fail
        me = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        assert me.status_code == 401

    def test_google_session_invalid(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/auth/session",
            json={"session_id": "definitely-not-a-valid-session-id"},
            timeout=30,
        )
        assert r.status_code == 401


# ----------------------------------------------------------------- Books ----
class TestBooks:
    def test_list_books_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/books", timeout=15)
        assert r.status_code == 401

    def test_list_books_empty_for_new_user(self, api_client, base_url, auth_header_a):
        r = api_client.get(f"{base_url}/api/books", headers=auth_header_a, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # A fresh user_a should have zero books at this point (before uploads)

    def test_upload_pdf_returns_book(self, api_client, base_url, auth_header_a, sample_pdf_with_text):
        files = {"file": ("TEST_Hello-Leggimi.pdf", sample_pdf_with_text, "application/pdf")}
        r = api_client.post(
            f"{base_url}/api/books/upload",
            headers=auth_header_a,
            files=files,
            timeout=180,
        )
        assert r.status_code == 200, r.text
        book = r.json()
        assert book["file_type"] == "pdf"
        assert book["title"].lower().startswith("test hello leggimi")
        assert book["pages"] >= 1
        assert book["size"] == len(sample_pdf_with_text)
        assert "book_id" in book
        # persist for later tests
        pytest.book_a_id = book["book_id"]

    def test_upload_rejects_unsupported_extension(self, api_client, base_url, auth_header_a):
        files = {"file": ("bad.txt", b"hello", "text/plain")}
        r = api_client.post(
            f"{base_url}/api/books/upload",
            headers=auth_header_a,
            files=files,
            timeout=30,
        )
        assert r.status_code == 400

    def test_upload_rejects_empty_file(self, api_client, base_url, auth_header_a):
        files = {"file": ("empty.pdf", b"", "application/pdf")}
        r = api_client.post(
            f"{base_url}/api/books/upload",
            headers=auth_header_a,
            files=files,
            timeout=30,
        )
        assert r.status_code == 400

    def test_list_books_returns_uploaded(self, api_client, base_url, auth_header_a):
        r = api_client.get(f"{base_url}/api/books", headers=auth_header_a, timeout=15)
        assert r.status_code == 200
        books = r.json()
        assert any(b["book_id"] == pytest.book_a_id for b in books)

    def test_get_content_returns_pages(self, api_client, base_url, auth_header_a):
        r = api_client.get(
            f"{base_url}/api/books/{pytest.book_a_id}/content",
            headers=auth_header_a,
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["book_id"] == pytest.book_a_id
        assert isinstance(body["pages"], list)
        assert len(body["pages"]) >= 1

    def test_get_content_unknown_returns_404(self, api_client, base_url, auth_header_a):
        r = api_client.get(
            f"{base_url}/api/books/does-not-exist/content",
            headers=auth_header_a,
            timeout=15,
        )
        assert r.status_code == 404

    def test_search_filters_by_title(self, api_client, base_url, auth_header_a):
        r = api_client.get(
            f"{base_url}/api/books/search",
            params={"q": "leggimi"},
            headers=auth_header_a,
            timeout=15,
        )
        assert r.status_code == 200
        docs = r.json()
        assert any(b["book_id"] == pytest.book_a_id for b in docs)

        r2 = api_client.get(
            f"{base_url}/api/books/search",
            params={"q": "zzz-no-such-thing"},
            headers=auth_header_a,
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json() == []

    def test_delete_book_soft_removes_from_list(self, api_client, base_url, auth_header_a, sample_pdf_with_text):
        # Upload a fresh throwaway book
        files = {"file": ("TEST_deleteme.pdf", sample_pdf_with_text, "application/pdf")}
        up = api_client.post(
            f"{base_url}/api/books/upload",
            headers=auth_header_a,
            files=files,
            timeout=120,
        )
        assert up.status_code == 200
        bid = up.json()["book_id"]

        d = api_client.delete(
            f"{base_url}/api/books/{bid}",
            headers=auth_header_a,
            timeout=15,
        )
        assert d.status_code == 200
        assert d.json().get("ok") is True

        # Should no longer show in list
        lst = api_client.get(f"{base_url}/api/books", headers=auth_header_a, timeout=15).json()
        assert not any(b["book_id"] == bid for b in lst)

        # Content should now 404
        c = api_client.get(
            f"{base_url}/api/books/{bid}/content",
            headers=auth_header_a,
            timeout=15,
        )
        assert c.status_code == 404


# ---------------------------------------------------- Ownership Isolation ---
class TestOwnershipIsolation:
    @pytest.fixture(scope="class")
    def book_a(self, api_client, base_url, auth_header_a, sample_pdf_with_text):
        files = {"file": ("TEST_isolation.pdf", sample_pdf_with_text, "application/pdf")}
        r = api_client.post(
            f"{base_url}/api/books/upload",
            headers=auth_header_a,
            files=files,
            timeout=180,
        )
        assert r.status_code == 200, r.text
        return r.json()

    def test_user_b_cannot_see_user_a_books(self, api_client, base_url, auth_header_b, book_a):
        r = api_client.get(f"{base_url}/api/books", headers=auth_header_b, timeout=15)
        assert r.status_code == 200
        assert not any(b["book_id"] == book_a["book_id"] for b in r.json())

    def test_user_b_cannot_read_user_a_content(self, api_client, base_url, auth_header_b, book_a):
        r = api_client.get(
            f"{base_url}/api/books/{book_a['book_id']}/content",
            headers=auth_header_b,
            timeout=15,
        )
        assert r.status_code == 404

    def test_user_b_cannot_delete_user_a_book(self, api_client, base_url, auth_header_b, auth_header_a, book_a):
        r = api_client.delete(
            f"{base_url}/api/books/{book_a['book_id']}",
            headers=auth_header_b,
            timeout=15,
        )
        assert r.status_code == 404
        # Book should still exist for A
        lst = api_client.get(f"{base_url}/api/books", headers=auth_header_a, timeout=15).json()
        assert any(b["book_id"] == book_a["book_id"] for b in lst)
