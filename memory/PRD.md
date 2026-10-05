# Leggimi — PRD

## Overview
Leggimi is an Italian mobile app (React Native / Expo) for reading digital books (PDF and EPUB) with built-in Text-to-Speech, designed with strong accessibility focus for blind and visually impaired users.

## Core Features (MVP)
- Splash screen with logo and app title ("Leggimi")
- Authentication:
  - Email + Password (register / login) with bcrypt-hashed passwords and 7-day session tokens
  - Google OAuth via Emergent managed auth
- Home screen: sticky header (menu, brand center-left, search), big "Carica Libri" upload CTA, list of uploaded books, pull-to-refresh
- Library screen: full grid/list of user's books with search filter
- Profile screen: user info, stats, quick actions, logout
- Settings screen: TTS rate and pitch sliders + presets + voice test
- Reader screen: paginated text view with large Play/Pause + Prev/Next controls, auto-advance pages while speaking
- Offcanvas drawer menu with navigation and logout
- Bottom tab bar (Home, Libreria, Profilo, Impostazioni) with large icons + labels

## Tech Stack
- Frontend: Expo SDK 54, expo-router, react-native-reanimated, expo-speech (native TTS), expo-document-picker, @react-native-community/slider, @gorhom/bottom-sheet
- Backend: FastAPI + Motor (MongoDB async), pypdf for PDF text extraction, ebooklib + BeautifulSoup for EPUB
- Storage: Emergent Managed Object Storage for uploaded book files
- Auth: bcrypt + session tokens (mongo `user_sessions`) + Emergent Google OAuth

## Accessibility
- Pure black (#000000) background, bright yellow (#FFD600) and pure white text
- Minimum 72pt touch targets everywhere
- Every interactive element has `accessibilityLabel` and `accessibilityRole` in Italian
- Haptic feedback on primary actions
- Auto-focus and live regions for errors

## Endpoints (all under `/api`)
- `POST /auth/register` `{email, password, name}` → `{session_token, user}`
- `POST /auth/login` `{email, password}` → `{session_token, user}`
- `POST /auth/session` `{session_id}` (Google OAuth) → `{session_token, user}`
- `GET /auth/me` (Bearer) → user
- `POST /auth/logout`
- `POST /books/upload` multipart → Book
- `GET /books` → Book[]
- `GET /books/{id}/content` → `{book_id, title, pages: string[]}`
- `DELETE /books/{id}`
- `GET /books/search?q=` → Book[]

## Business Enhancement (Next)
- Reading progress tracking + resume from last page
- Bookmarks with voice notes for accessibility
- Free tier limits + optional premium (unlimited storage, cloud sync of highlights)

## Update — Natural voice (OpenAI TTS)
- App renamed **Vora**; circular outlined logos; transparent outlined buttons; font tokens 14px; 3s animated splash.
- Page scanning with Italian OCR (`POST /api/books/scan`, pytesseract).
- Device voice (expo-speech) REMOVED: platform blocks it alongside expo-audio; user agreed.
- Natural voice: OpenAI `gpt-4o-mini-tts` (Emergent LLM key) with Italian audiobook-narrator instructions, 11 voices (default Coral), fallback to `tts-1`.
- Audio cached per page in Object Storage + `tts_cache` collection; next page prefetched; playback via shared expo-audio player, speed via playback rate.
- Endpoints: `POST /api/tts/page`, `POST /api/tts/preview`, `GET /api/tts/audio/{key}.mp3`.

## Backlog
- P1: ElevenLabs native Italian voices (needs user's API key)
- P1: Resume from last listened page; continuous multi-page camera scan
- P2: Background/lock-screen playback (needs native build); voice bookmarks; premium tier
