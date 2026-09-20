# Backend API (PHP)

Base URL: whatever you set as "Backend URL" in the app's Settings screen
(e.g. `https://deskbot-api.example.com`). Every `/api/*` request must
include the header `X-DeskBot-Token: <APP_SHARED_TOKEN>` matching the value
in `backend/.env`.

## POST /api/chat

Request:
```json
{
  "message": "Tell me something interesting.",
  "history": [
    { "role": "user", "content": "hi" },
    { "role": "assistant", "content": "hey there!" }
  ]
}
```

Response:
```json
{ "reply": "Did you know octopuses have three hearts?", "speak": true }
```

The app only calls this for messages that its local router (`js/robot.js`)
decided are *not* direct hardware commands (see command-routing rules
below), so simple commands never round-trip through the AI.

## Memory endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/memory/list` | — | `{ "items": [{ "id", "key", "value" }] }` |
| POST | `/api/memory/add` | `{ "key", "value" }` | `{ "item": {...} }` |
| POST | `/api/memory/update` | `{ "id", "key", "value" }` | `{ "ok": true }` |
| POST | `/api/memory/delete` | `{ "id" }` | `{ "ok": true }` |
| POST | `/api/memory/wipe` | — | `{ "ok": true }` |

Storage today: SQLite file at `backend/data/deskbot.sqlite` (auto-created).
This is the working source of truth; syncing it down to the robot's
microSD card is future work (see `firmware/deskbot_esp32/deskbot_esp32.ino`
TODOs).

## Command routing (client-side)

The app decides locally, before any network call, whether typed/spoken text
is a hardware command, a music command, or a question for the AI:

- Hardware (goes straight to the ESP32, never touches the backend):
  "turn left/right", "look/tilt up/down", "center (yourself)",
  "track/follow/watch me", "look at me", "stop tracking"
- Music (handled entirely on the phone): "play a/the song", "pause the
  music", "next/previous track"
- Everything else -> `/api/chat`

This logic lives in `app/www/js/robot.js` (`route()`), one place, so you can
extend the phrase list or replace it with a proper NLU model without
touching any UI code.

## Security notes

- No AI provider key is ever sent to, or stored on, the phone. Only the
  backend's `.env` holds `AI_API_KEY`.
- The `X-DeskBot-Token` shared secret is a stopgap for a single-user setup.
  Before adding multiple users, replace `backend/src/Auth.php` with
  per-user tokens/OAuth rather than reusing one shared token.
- Set `ALLOWED_ORIGINS` in `.env` to your real app origin(s) in production
  instead of `*`.

## Planned, not implemented

Multiple users/robots, wake word, richer face recognition, emotion/gesture
recognition, push notifications, remote (off-LAN) control, OTA firmware
updates, firmware health monitoring, and a custom personality editor are
all future features the modular structure here is meant to leave room for,
but none of them exist in this codebase yet.
