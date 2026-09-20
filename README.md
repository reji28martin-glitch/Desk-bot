# DeskBot

Control dashboard and AI companion app for a DIY ESP32-S3 AI desk robot
(camera, pan/tilt head, mic, speaker, microSD memory).

```
Phone App (Capacitor/PWA)
     |
     |-- Wi-Fi (LAN) -----> ESP32-S3 -- camera, TFT, mic, speaker, servos, microSD
     |
     '-- HTTPS -----------> PHP backend -----> AI provider (OpenAI, etc.)
                                |
                                '-- SQLite memory store
```

## What's in this repo

| Folder      | What it is |
|-------------|------------|
| `app/`      | The mobile app: a single static PWA (`app/www`) wrapped with [Capacitor](https://capacitorjs.com) to produce an Android APK. |
| `backend/`  | PHP backend: proxies AI chat requests (keeps your API key off the phone) and stores memory in SQLite. |
| `firmware/` | Starting-point Arduino sketch for the ESP32-S3: implements the HTTP/WebSocket protocol the app expects. |
| `docs/`     | Protocol, API, and setup reference. |
| `.github/workflows/` | CI: builds the Android APK and deploys the PWA to GitHub Pages automatically. |

## What actually works today vs. what's a stub

**Working now**, if you fill in your own Wi-Fi/AI credentials:
- Full app UI for all 7 screens (Home, Control, Camera, Chat, Memory, Music, Settings), navigation, theming, offline-safe status polling.
- REST command routing to ESP32 endpoints (`/servo/...`, `/tracking/...`, `/status`) and a WebSocket telemetry listener.
- Text + voice (Web Speech API) chat, routed either to a direct hardware command or to the AI backend, never both.
- PHP backend: `/api/chat` (OpenAI-backed), `/api/memory/*` (SQLite CRUD), shared-token auth, CORS.
- ESP32 sketch: Wi-Fi + mDNS, servo pan/tilt with limits, `/status`, tracking on/off flags, JSON telemetry over WebSocket.
- GitHub Actions: one workflow builds a debug APK, one deploys the PWA to GitHub Pages.

**Stubbed / needs your hardware-specific work** (clearly marked `TODO` in code):
- Camera streaming into the app (needs the `esp32-camera` library wired to an HTTP MJPEG or WebSocket route — the app's camera screen already has a slot ready for an `<img>`/canvas feed once that endpoint exists).
- Face detection/recognition and the embedding pipeline (`/face/register`, `/face/remove` are stubs).
- microSD-backed memory on the robot itself (the backend's SQLite store is the working source of truth today; syncing it to the SD card is a TODO in the firmware).
- Wake word ("Hey DeskBot"), OTA updates, multi-user/multi-robot, notifications — listed in docs/API.md as future work, not implemented.
- True system-wide phone music control (Spotify/YouTube Music, etc.) needs a native Android bridge; the Music screen currently demonstrates the architecture against the Web `MediaSession` API only.

See `docs/SETUP.md` for install/build steps, `docs/API.md` for the backend API, and `docs/ESP32_PROTOCOL.md` for the robot protocol.
