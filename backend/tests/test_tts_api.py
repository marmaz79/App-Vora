"""Vora/Leggimi TTS API tests.

Covers POST /api/tts/page, POST /api/tts/preview, GET /api/tts/audio/{key}.mp3.
Uses the pre-seeded test@leggimi.it user that already owns a scanned book
whose page 0 audio has been cached (see agent-to-agent context note).

To minimise OpenAI TTS cost, we try to hit cached entries only. The main
test that requests a NEW synthesis is `test_preview_coral_returns_mp3_url`.
"""

import os
import re
import time
import pytest
import requests


SEEDED_EMAIL = "test@leggimi.it"
SEEDED_PASSWORD = "testpass123"
SEEDED_BOOK_ID = "5d8d8071fb794c308393a02664b0076a"  # known 2-page scanned book


@pytest.fixture(scope="module")
def seeded_token(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": SEEDED_EMAIL, "password": SEEDED_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Seeded user not available: {r.status_code} {r.text[:200]}")
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def seeded_auth(seeded_token):
    return {"Authorization": f"Bearer {seeded_token}"}


# ---------------------------------------------------------- Auth guards ----
class TestTtsAuth:
    def test_tts_page_requires_auth(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/tts/page",
            json={"book_id": SEEDED_BOOK_ID, "page_index": 0, "voice": "coral"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_tts_preview_requires_auth(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/tts/preview",
            json={"voice": "coral"},
            timeout=15,
        )
        assert r.status_code == 401


# ----------------------------------------------------------- /tts/page -----
class TestTtsPage:
    URL_RE = re.compile(r"^/api/tts/audio/[0-9a-f]{64}\.mp3$")

    def test_page_cached_returns_url_and_is_fast(self, api_client, base_url, seeded_auth):
        # First call: should be a cache hit per agent context
        t0 = time.perf_counter()
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": SEEDED_BOOK_ID, "page_index": 0, "voice": "coral"},
            timeout=120,
        )
        dur_first = time.perf_counter() - t0
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body
        url = body["url"]
        assert self.URL_RE.match(url), f"bad url shape: {url}"

        # Second identical call: definitely cached, must be fast + same url
        t0 = time.perf_counter()
        r2 = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": SEEDED_BOOK_ID, "page_index": 0, "voice": "coral"},
            timeout=30,
        )
        dur_second = time.perf_counter() - t0
        assert r2.status_code == 200
        assert r2.json()["url"] == url, "Cached call must return the same key"
        # cache-hit should respond in well under 5s even over the public URL
        assert dur_second < 5.0, f"Second (cached) call too slow: {dur_second:.2f}s (first={dur_first:.2f}s)"
        pytest.tts_cached_url = url

    def test_page_out_of_range_returns_404(self, api_client, base_url, seeded_auth):
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": SEEDED_BOOK_ID, "page_index": 999, "voice": "coral"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_page_negative_index_returns_404(self, api_client, base_url, seeded_auth):
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": SEEDED_BOOK_ID, "page_index": -1, "voice": "coral"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_page_invalid_voice_returns_400(self, api_client, base_url, seeded_auth):
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": SEEDED_BOOK_ID, "page_index": 0, "voice": "evilvoice"},
            timeout=15,
        )
        assert r.status_code == 400
        assert "voce non valida" in r.json().get("detail", "").lower()

    def test_other_users_book_returns_404(self, api_client, base_url, auth_header_a):
        # user_a is a fresh user that does NOT own the seeded book
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=auth_header_a,
            json={"book_id": SEEDED_BOOK_ID, "page_index": 0, "voice": "coral"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_unknown_book_returns_404(self, api_client, base_url, seeded_auth):
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": "does-not-exist-xxx", "page_index": 0, "voice": "coral"},
            timeout=15,
        )
        assert r.status_code == 404


# ---------------------------------------------------------- /tts/preview ---
class TestTtsPreview:
    URL_RE = re.compile(r"^/api/tts/audio/[0-9a-f]{64}\.mp3$")

    def test_preview_coral_returns_mp3_url(self, api_client, base_url, seeded_auth):
        # This may do a real synth if the preview-coral entry isn't cached yet.
        r = api_client.post(
            f"{base_url}/api/tts/preview",
            headers=seeded_auth,
            json={"voice": "coral"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert self.URL_RE.match(url), f"bad url shape: {url}"
        pytest.tts_preview_url = url

    def test_preview_invalid_voice_returns_400(self, api_client, base_url, seeded_auth):
        r = api_client.post(
            f"{base_url}/api/tts/preview",
            headers=seeded_auth,
            json={"voice": "notavoice"},
            timeout=15,
        )
        assert r.status_code == 400


# ---------------------------------------------------- /tts/audio/<key>.mp3 -
class TestTtsAudio:
    @pytest.fixture(scope="class")
    def cached_url(self, api_client, base_url, seeded_auth):
        """Get a known-cached audio URL (page 0 of seeded scanned book)."""
        r = api_client.post(
            f"{base_url}/api/tts/page",
            headers=seeded_auth,
            json={"book_id": SEEDED_BOOK_ID, "page_index": 0, "voice": "coral"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        return r.json()["url"]

    def test_audio_fetch_returns_mp3(self, api_client, base_url, cached_url):
        r = api_client.get(f"{base_url}{cached_url}", timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 100, f"Audio body suspiciously small: {len(r.content)} bytes"
        # Should look like an MP3 (ID3 tag or MPEG frame sync)
        head = r.content[:3]
        assert head[:3] == b"ID3" or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0), (
            f"Audio content does not look like MP3 (head={head!r})"
        )

    def test_audio_bad_key_shape_returns_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/tts/audio/not-a-sha256.mp3", timeout=15)
        assert r.status_code == 404

    def test_audio_missing_key_returns_404(self, api_client, base_url):
        # Valid shape (64 hex chars) but no entry in cache
        fake = "a" * 64
        r = api_client.get(f"{base_url}/api/tts/audio/{fake}.mp3", timeout=15)
        assert r.status_code == 404

    def test_audio_endpoint_is_public(self, api_client, base_url, cached_url):
        # No Authorization header; the endpoint intentionally allows direct fetch
        s = requests.Session()
        r = s.get(f"{base_url}{cached_url}", timeout=60)
        assert r.status_code == 200
