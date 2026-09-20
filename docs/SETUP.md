# Setup

## 1. Get the code

```bash
git clone https://github.com/<you>/deskbot.git
cd deskbot
```

(If you downloaded this as a zip from Claude, `git init` it and push to a
new GitHub repo first — that's what makes the Actions workflows below run.)

## 2. Backend (PHP)

```bash
cd backend
composer install
cp .env.example .env
```

Edit `.env`:
- `AI_API_KEY` — your OpenAI (or other provider) key
- `APP_SHARED_TOKEN` — generate with `php -r "echo bin2hex(random_bytes(24));"`
- `ALLOWED_ORIGINS` — your app's origin, or `*` while testing locally

Run locally:
```bash
php -S localhost:8080 -t public
```

Deploy to any PHP 8.1+ host (shared hosting, a small VPS, Render, Fly.io
with a PHP buildpack, etc.). **GitHub Pages cannot run PHP** — it only
serves static files — so the backend needs its own host; only the PWA
build in `app/www` is deployed via GitHub Pages.

Point your web server's document root at `backend/public` with the
included `.htaccess` (Apache) or an equivalent rewrite rule (Nginx: `try_files
$uri /index.php?$query_string;`) so all `/api/*` requests hit `index.php`.

## 3. ESP32-S3 firmware

Open `firmware/deskbot_esp32/deskbot_esp32.ino` in the Arduino IDE (or
PlatformIO). Install the libraries listed at the top of the file, set
`WIFI_SSID`/`WIFI_PASSWORD`, adjust servo pins for your wiring, then flash
to the board (Board: "ESP32S3 Dev Module").

Once it boots you should be able to `curl http://deskbot.local/status`
from a machine on the same network.

## 4. Mobile app

The app lives in `app/www` as a plain PWA and is wrapped with Capacitor for
Android. You have two ways to get it onto your phone — you don't need both.

### Option A — PWA (fastest, no Android Studio)

Push to GitHub with Pages enabled (Settings → Pages → Source: "GitHub
Actions") — `.github/workflows/deploy-pwa.yml` runs automatically and
deploys `app/www`. Open the resulting `https://<you>.github.io/deskbot/`
URL on your phone in Chrome and choose "Add to Home Screen".

### Option B — Android APK

Locally:
```bash
cd app
npm install
npx cap add android      # first time only
npx cap sync android
npx cap open android     # opens Android Studio to build/run
```

Or let CI build it for you: push to `main` and `.github/workflows/build-apk.yml`
produces a debug APK, downloadable from that workflow run's "Artifacts"
section. Install it by enabling "Install unknown apps" for your browser/file
manager and opening the downloaded `.apk`.

### Configure the app

Open Settings inside the app and fill in:
- **Robot IP / mDNS address** — `deskbot.local` or the ESP32's IP
- **Backend URL** — wherever you deployed `backend/` in step 2
- **Backend access token** — the same value as `APP_SHARED_TOKEN`

## Music control: current vs. future

The Music screen today drives only audio the page itself plays, reflected
through the Web `MediaSession` API — that's the ceiling for a plain
PWA/WebView. Controlling a separate installed app (Spotify, YouTube Music)
needs a native Android bridge (e.g. a small Capacitor plugin using Android's
`MediaSessionManager`/notification listener APIs), which isn't implemented
here yet but slots into `app/www/js/music.js` without touching other screens.
