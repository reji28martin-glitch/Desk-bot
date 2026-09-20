# ESP32 communication protocol

Transport: plain HTTP REST on port 80 for commands, plus a WebSocket at
`/ws` for push telemetry. Everything here is on your local Wi-Fi network —
there is no cloud hop between the phone and the robot.

The app resolves the robot at `http://<robotHost>` where `robotHost` is set
in Settings (defaults to `deskbot.local`, via mDNS).

## REST endpoints

| Method | Path | Effect | Response |
|---|---|---|---|
| GET | `/status` | Full status snapshot | see below |
| GET | `/servo/pan/left` | Step pan left | `{ "ok": true, "pan": 80 }` |
| GET | `/servo/pan/right` | Step pan right | `{ "ok": true, "pan": 100 }` |
| GET | `/servo/tilt/up` | Step tilt up | `{ "ok": true, "tilt": 80 }` |
| GET | `/servo/tilt/down` | Step tilt down | `{ "ok": true, "tilt": 100 }` |
| GET | `/servo/center` | Center both servos | `{ "ok": true }` |
| GET | `/tracking/start` | Enable face tracking | `{ "ok": true, "tracking": true }` |
| GET | `/tracking/stop` | Disable face tracking | `{ "ok": true, "tracking": false }` |
| GET | `/face/register` | Start face registration (stub) | `{ "ok": true }` |
| GET | `/face/remove` | Clear registered owner face | `{ "ok": true }` |
| GET | `/memory/list` | Robot-local memory (stub today) | `{ "items": [] }` |

`/status` response shape:

```json
{
  "wifi": "Connected",
  "camera": "Online",
  "ai": "Online",
  "tracking": false,
  "battery": null,
  "state": "IDLE",
  "pan": 90,
  "tilt": 90,
  "face_detected": false,
  "owner_recognized": false
}
```

`state` is one of: `IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `TRACKING`,
`FACE DETECTED`, `OWNER RECOGNIZED`, `OFFLINE`, `ERROR`.

## WebSocket (`/ws`)

The robot pushes the same fields as `/status` once per second (and on
connect) as a JSON text frame. The app merges this into its live state
without needing to poll. There is currently no client-to-robot WebSocket
command channel — commands go over REST — but the server-side handler in
`deskbot_esp32.ino` has a clearly marked spot to add one if you want
lower-latency control later.

## Why this design

- **Modular**: every command is a single flat path, so adding a new one
  (e.g. `/led/blink`) never touches existing routes.
- **Stateless commands, stateful telemetry**: REST calls are fire-and-verify
  (each returns the resulting angle/flag), while the WebSocket is the single
  source of "what is the robot doing right now" for the UI.
- **No auth on the LAN endpoints** in this starting version — acceptable for
  a home network, but if you expose the robot beyond your LAN (e.g. via port
  forwarding) add a shared-token check identical to the backend's `Auth.php`
  before doing that.
