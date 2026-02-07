# MosaicFrame (Roboclub) Hardware Spec (HW-001/HW-002)

Goal: optional physical “mosaic” output that is **demo-safe** (app still works without hardware).

## Concept

- Device: ESP32 driving a WS2812B LED matrix (10x10 preferred; 8x8 acceptable).
- Transport: HTTP on local WiFi.
- Payload: a **10x10 grid of hex colors** generated from the current Mosaic.
- Rendering: map each grid cell to one LED (row-major order).

This is a “hardware mirror” of the Mosaic mural: small, legible, and deterministic.

## Data Contract (app -> device)

HTTP `POST http://<device-ip>/render` with JSON:

```json
{
  "w": 10,
  "h": 10,
  "grid": ["#112233", "... 100 total ..."],
  "brightness": 64
}
```

- `grid` is **row-major**: index = `row * w + col`
- `brightness` is optional (0..255). Firmware clamps it.

Firmware also exposes:

- `GET /demo` to render a self-test pattern (no app needed)
- `GET /health` to return `{ok:true,ip:"..."}` for quick checking

## Palette Mapping

- The app sends colors already derived from the Mosaic tiles.
- For now, we quantize **category-level** Mosaic tiles (no merchant labels involved).

## BOM (10x10)

- 1x ESP32 dev board (ESP32-WROOM-32 / similar)
- 1x WS2812B matrix 10x10 (or a strip arranged into 10 rows)
- 1x 5V power supply:
  - Recommend 5V/4A for safety headroom
  - With brightness limiting, you can run lower (2A) but plan for spikes
- 1x 330–470 ohm resistor (data line)
- 1x 1000uF electrolytic capacitor (across 5V/GND near LEDs)
- Wires + breadboard / soldered connections
- Optional: logic level shifter (3.3V -> 5V). Often works without at short runs, but it’s safer.

## Wiring (WS2812B)

Mermaid wiring diagram:

```mermaid
flowchart LR
  PSU["5V PSU"] -->|5V| LED["WS2812B Matrix +5V"]
  PSU -->|GND| LED
  PSU -->|GND| ESP["ESP32 GND"]
  ESP -->|5V (optional)| ESP
  ESP -->|GPIO (DATA) via 330-470R| LED
  LED -->|GND| ESP
```

Suggested pins:

- ESP32 `GPIO 5` -> LED `DIN` through 330–470 ohm resistor
- PSU `5V` -> LED `+5V`
- PSU `GND` -> LED `GND`
- PSU `GND` -> ESP32 `GND` (common ground is mandatory)

## Power Safety Checklist (non-negotiable)

- Do **not** power the LED matrix from the ESP32 5V pin.
- Always use an external 5V PSU for the LEDs.
- Always share ground between PSU and ESP32.
- Add the 1000uF capacitor across LED 5V/GND near the matrix.
- Start with low brightness and confirm stability before increasing.

## Firmware

Reference sketch is in:

- `hardware/esp32/MosaicFrame/MosaicFrame.ino`

Build uses Arduino IDE or PlatformIO with:

- FastLED
- ArduinoJson

## App Endpoint (HW-004)

The app provides:

- `GET /api/hw/mosaic-grid?w=10&h=10`

Returns:

```json
{
  "ok": true,
  "w": 10,
  "h": 10,
  "grid": [["#RRGGBB", "..."], ["..."]],
  "source": "latest|demo"
}
```

The quantization is deterministic: we sample each cell’s center and pick the tile whose rectangle contains it.
