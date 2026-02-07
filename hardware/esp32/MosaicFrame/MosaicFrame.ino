// MosaicFrame firmware (HW-003/HW-007)
//
// ESP32 + WS2812B matrix. Receives a 10x10 (or configurable) color grid via HTTP.
//
// Endpoints:
// - GET  /health  -> {"ok":true,"ip":"..."}
// - GET  /demo    -> renders a demo pattern (no app required)
// - POST /render  -> JSON: { "w":10, "h":10, "grid":["#RRGGBB", ...], "brightness":64 }
//
// Libraries:
// - FastLED
// - ArduinoJson

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <FastLED.h>

// ======= CONFIG =======
// WiFi credentials
static const char *WIFI_SSID = "YOUR_WIFI_SSID";
static const char *WIFI_PASS = "YOUR_WIFI_PASSWORD";

// LED config
static const int LED_PIN = 5;     // ESP32 GPIO -> WS2812B DIN (via 330-470 ohm resistor)
static const int LED_W = 10;
static const int LED_H = 10;
static const int LED_COUNT = LED_W * LED_H;

// Brightness limiting to avoid brownouts/current spikes.
static const uint8_t DEFAULT_BRIGHTNESS = 48; // safe starting point
static const uint16_t MAX_MILLIAMPS = 1800;   // budget; tune for your PSU
// ======================

CRGB leds[LED_COUNT];
WebServer server(80);

static uint8_t gBrightness = DEFAULT_BRIGHTNESS;

static int idx(int row, int col) {
  // Row-major. If your matrix is serpentine-wired, adjust here.
  return row * LED_W + col;
}

static uint32_t parseHexColor(const char *s) {
  // Accept "#RRGGBB" or "RRGGBB"
  if (!s) return 0;
  if (s[0] == '#') s++;
  if (strlen(s) < 6) return 0;

  char buf[7];
  memcpy(buf, s, 6);
  buf[6] = '\0';
  return (uint32_t)strtoul(buf, nullptr, 16);
}

static void renderDemo() {
  for (int r = 0; r < LED_H; r++) {
    for (int c = 0; c < LED_W; c++) {
      uint8_t hue = (uint8_t)((r * 16 + c * 8) & 0xFF);
      leds[idx(r, c)] = CHSV(hue, 200, 255);
    }
  }
  FastLED.setBrightness(gBrightness);
  FastLED.show();
}

static void sendJson(int code, const String &json) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(code, "application/json", json);
}

static void handleHealth() {
  IPAddress ip = WiFi.localIP();
  String out = String("{\"ok\":true,\"ip\":\"") + ip.toString() + String("\"}");
  sendJson(200, out);
}

static void handleDemo() {
  renderDemo();
  sendJson(200, "{\"ok\":true,\"demo\":true}");
}

static void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "content-type");
  server.send(204);
}

static void handleRender() {
  if (!server.hasArg("plain")) {
    sendJson(400, "{\"ok\":false,\"error\":\"missing body\"}");
    return;
  }

  // Keep memory bounded.
  StaticJsonDocument<8192> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    sendJson(400, "{\"ok\":false,\"error\":\"invalid json\"}");
    return;
  }

  int w = doc["w"] | LED_W;
  int h = doc["h"] | LED_H;
  int brightness = doc["brightness"] | (int)gBrightness;
  if (brightness < 0) brightness = 0;
  if (brightness > 255) brightness = 255;
  gBrightness = (uint8_t)brightness;

  JsonArray grid = doc["grid"].as<JsonArray>();
  if (!grid || grid.size() < (size_t)(w * h)) {
    sendJson(400, "{\"ok\":false,\"error\":\"grid must be flat array length w*h\"}");
    return;
  }

  // Render (clamp to our physical size).
  int rw = (w < LED_W) ? w : LED_W;
  int rh = (h < LED_H) ? h : LED_H;

  for (int r = 0; r < LED_H; r++) {
    for (int c = 0; c < LED_W; c++) {
      leds[idx(r, c)] = CRGB::Black;
    }
  }

  for (int r = 0; r < rh; r++) {
    for (int c = 0; c < rw; c++) {
      const int i = r * w + c;
      const char *s = grid[i] | "";
      uint32_t rgb = parseHexColor(s);
      uint8_t R = (rgb >> 16) & 0xFF;
      uint8_t G = (rgb >> 8) & 0xFF;
      uint8_t B = rgb & 0xFF;
      leds[idx(r, c)] = CRGB(R, G, B);
    }
  }

  FastLED.setBrightness(gBrightness);
  // Max power guard reduces brownouts/reset loops.
  FastLED.setMaxPowerInVoltsAndMilliamps(5, MAX_MILLIAMPS);
  FastLED.show();

  sendJson(200, "{\"ok\":true}");
}

void setup() {
  delay(250);

  Serial.begin(115200);
  Serial.println();
  Serial.println("MosaicFrame booting...");

  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, LED_COUNT);
  FastLED.clear(true);
  FastLED.setBrightness(gBrightness);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, MAX_MILLIAMPS);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("WiFi connecting");
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
    if (millis() - start > 15000) break;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi failed; will still serve if connection later succeeds.");
  }

  server.on("/health", HTTP_GET, handleHealth);
  server.on("/demo", HTTP_GET, handleDemo);
  server.on("/render", HTTP_POST, handleRender);
  server.onNotFound([]() { sendJson(404, "{\"ok\":false,\"error\":\"not found\"}"); });
  server.on("/render", HTTP_OPTIONS, handleOptions);
  server.on("/demo", HTTP_OPTIONS, handleOptions);
  server.on("/health", HTTP_OPTIONS, handleOptions);

  server.begin();

  // Boot-time self-test pattern.
  renderDemo();
}

void loop() {
  server.handleClient();
}

