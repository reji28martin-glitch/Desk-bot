/*
 * DeskBot ESP32-S3 firmware - communication skeleton.
 *
 * Implements the HTTP endpoints and WebSocket telemetry stream that the
 * DeskBot mobile app talks to (see docs/ESP32_PROTOCOL.md). This file is a
 * REAL, buildable starting point for the networking/servo/status layer.
 * It is NOT a complete robot firmware: camera streaming, wake-word
 * detection, face recognition and microSD memory sync are stubbed with
 * TODOs and clearly marked, because they depend on choices (which face
 * library, which camera board variant, SD wiring) that are yours to make.
 *
 * Libraries needed (Arduino Library Manager):
 *   - ESP32Servo
 *   - ArduinoJson
 *   - ESPAsyncWebServer + AsyncTCP  (https://github.com/me-no-dev/ESPAsyncWebServer)
 *   - esp32-camera (bundled with the ESP32 Arduino core's camera examples)
 *
 * Board: "ESP32S3 Dev Module" (adjust pins for your exact board).
 */

#include <WiFi.h>
#include <ESPmDNS.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ---------------- Wi-Fi ----------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MDNS_NAME = "deskbot"; // reachable as http://deskbot.local

// ---------------- Servos ----------------
#define PIN_SERVO_PAN  17
#define PIN_SERVO_TILT 18

Servo panServo;
Servo tiltServo;

int panAngle = 90;
int tiltAngle = 90;
int panMin = 0,  panMax = 180;
int tiltMin = 30, tiltMax = 150;
const int STEP_DEGREES = 10;

// ---------------- State ----------------
bool tracking = false;
bool faceDetected = false;
bool ownerRecognized = false;
String robotState = "IDLE"; // IDLE/LISTENING/THINKING/SPEAKING/TRACKING/FACE DETECTED/OWNER RECOGNIZED/OFFLINE/ERROR

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ---------------- Helpers ----------------
void sendJson(AsyncWebServerRequest* request, JsonDocument& doc) {
  String out;
  serializeJson(doc, out);
  request->send(200, "application/json", out);
}

void broadcastTelemetry() {
  StaticJsonDocument<256> doc;
  doc["wifi"] = WiFi.isConnected() ? "Connected" : "Disconnected";
  doc["camera"] = "Online"; // TODO: reflect real camera init status
  doc["ai"] = "Online";     // TODO: reflect last known backend reachability
  doc["tracking"] = tracking;
  doc["state"] = robotState;
  doc["pan"] = panAngle;
  doc["tilt"] = tiltAngle;
  doc["face_detected"] = faceDetected;
  doc["owner_recognized"] = ownerRecognized;
  // doc["battery"] = readBatteryPercent(); // TODO if you add a fuel gauge / divider
  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

void setAngles(int pan, int tilt) {
  panAngle = constrain(pan, panMin, panMax);
  tiltAngle = constrain(tilt, tiltMin, tiltMax);
  panServo.write(panAngle);
  tiltServo.write(tiltAngle);
}

// ---------------- Route handlers ----------------
void handleStatus(AsyncWebServerRequest* request) {
  StaticJsonDocument<256> doc;
  doc["wifi"] = WiFi.isConnected() ? "Connected" : "Disconnected";
  doc["camera"] = "Online";       // TODO: real camera status
  doc["ai"] = "Online";           // app reaches the AI via its own backend, not through this device
  doc["tracking"] = tracking;
  doc["battery"] = nullptr;       // TODO: fill in if hardware supports it
  doc["state"] = robotState;
  doc["pan"] = panAngle;
  doc["tilt"] = tiltAngle;
  doc["face_detected"] = faceDetected;
  doc["owner_recognized"] = ownerRecognized;
  sendJson(request, doc);
}

void setupServoRoutes() {
  server.on("/servo/pan/left", HTTP_GET, [](AsyncWebServerRequest* r) {
    setAngles(panAngle - STEP_DEGREES, tiltAngle);
    StaticJsonDocument<64> d; d["ok"] = true; d["pan"] = panAngle; sendJson(r, d);
  });
  server.on("/servo/pan/right", HTTP_GET, [](AsyncWebServerRequest* r) {
    setAngles(panAngle + STEP_DEGREES, tiltAngle);
    StaticJsonDocument<64> d; d["ok"] = true; d["pan"] = panAngle; sendJson(r, d);
  });
  server.on("/servo/tilt/up", HTTP_GET, [](AsyncWebServerRequest* r) {
    setAngles(panAngle, tiltAngle - STEP_DEGREES);
    StaticJsonDocument<64> d; d["ok"] = true; d["tilt"] = tiltAngle; sendJson(r, d);
  });
  server.on("/servo/tilt/down", HTTP_GET, [](AsyncWebServerRequest* r) {
    setAngles(panAngle, tiltAngle + STEP_DEGREES);
    StaticJsonDocument<64> d; d["ok"] = true; d["tilt"] = tiltAngle; sendJson(r, d);
  });
  server.on("/servo/center", HTTP_GET, [](AsyncWebServerRequest* r) {
    setAngles(90, 90);
    StaticJsonDocument<64> d; d["ok"] = true; sendJson(r, d);
  });
}

void setupTrackingRoutes() {
  server.on("/tracking/start", HTTP_GET, [](AsyncWebServerRequest* r) {
    tracking = true;
    robotState = "TRACKING";
    // TODO: kick off your face-detection loop / task here
    StaticJsonDocument<64> d; d["ok"] = true; d["tracking"] = true; sendJson(r, d);
  });
  server.on("/tracking/stop", HTTP_GET, [](AsyncWebServerRequest* r) {
    tracking = false;
    robotState = "IDLE";
    StaticJsonDocument<64> d; d["ok"] = true; d["tracking"] = false; sendJson(r, d);
  });
}

void setupFaceRoutes() {
  // TODO: wire these to a real face-embedding pipeline (e.g. ESP-WHO,
  // or send frames to a phone/server-side model). These stubs exist so the
  // app's UI has something real to call while you build that part out.
  server.on("/face/register", HTTP_GET, [](AsyncWebServerRequest* r) {
    robotState = "LISTENING";
    StaticJsonDocument<64> d; d["ok"] = true; d["message"] = "registration not yet implemented";
    sendJson(r, d);
  });
  server.on("/face/remove", HTTP_GET, [](AsyncWebServerRequest* r) {
    ownerRecognized = false;
    StaticJsonDocument<64> d; d["ok"] = true; sendJson(r, d);
  });
}

void setupMemoryRoutes() {
  // TODO: back these with real reads/writes to the microSD card.
  // For now the PHP backend (backend/) is the source of truth for memory;
  // once you're ready, have the ESP32 poll /api/memory/list on the backend
  // periodically and mirror it to a JSON file on the SD card, and expose
  // these same endpoints locally for the app to read robot-side memory too.
  server.on("/memory/list", HTTP_GET, [](AsyncWebServerRequest* r) {
    StaticJsonDocument<64> d; JsonArray items = d.createNestedArray("items"); (void)items;
    sendJson(r, d);
  });
}

void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
               AwsEventType type, void* arg, uint8_t* data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    broadcastTelemetry();
  }
  // Incoming WS messages could carry the same commands as the REST routes
  // for lower-latency control; left as a TODO since REST already covers
  // every command in docs/ESP32_PROTOCOL.md.
}

void setup() {
  Serial.begin(115200);

  panServo.attach(PIN_SERVO_PAN);
  tiltServo.attach(PIN_SERVO_TILT);
  setAngles(90, 90);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected, IP: ");
  Serial.println(WiFi.localIP());

  if (!MDNS.begin(MDNS_NAME)) {
    Serial.println("mDNS setup failed (app can still use the IP address)");
  }

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.on("/status", HTTP_GET, handleStatus);
  setupServoRoutes();
  setupTrackingRoutes();
  setupFaceRoutes();
  setupMemoryRoutes();

  server.begin();
  robotState = "IDLE";
}

unsigned long lastBroadcast = 0;

void loop() {
  ws.cleanupClients();

  // TODO: run your face-detection loop here when `tracking` is true, and
  // update faceDetected / ownerRecognized / robotState accordingly.

  if (millis() - lastBroadcast > 1000) {
    broadcastTelemetry();
    lastBroadcast = millis();
  }
}
