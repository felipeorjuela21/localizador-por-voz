/*
 * Firmware ESP32 - Localizador de Medicamentos
 * -------------------------------------------------
 * Levanta un servidor HTTP. El backend le hace POST /luz con:
 *   { "led": 21, "estante": 2, "fila": 4, "columna": 3 }
 * y enciende ese LED en una tira WS2812B (NeoPixel).
 *
 * Librerías (Gestor de Librerías de Arduino IDE):
 *   - Adafruit NeoPixel
 *   - ArduinoJson
 *
 * IMPORTANTE: el índice "led" ya viene calculado por el backend
 * (incluyendo el zigzag), así que aquí solo lo encendemos.
 */
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ---------- CONFIGURA ESTO ----------
const char* WIFI_SSID     = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";
#define LED_PIN   5           // pin de datos de la tira
#define NUM_LEDS  30          // filas * columnas (5*6 = 30)
const uint32_t COLOR = 0xFFB400;  // ámbar
// ------------------------------------

Adafruit_NeoPixel tira(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
WebServer server(80);

void apagarTodo() {
  tira.clear();
  tira.show();
}

void handleLuz() {
  if (server.hasArg("plain") == false) {
    server.send(400, "text/plain", "falta body");
    return;
  }
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "text/plain", "json invalido");
    return;
  }
  int led = doc["led"] | -1;
  apagarTodo();
  if (led >= 0 && led < NUM_LEDS) {
    tira.setPixelColor(led, COLOR);
    tira.show();
  }
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleApagar() {
  apagarTodo();
  server.send(200, "application/json", "{\"ok\":true}");
}

void setup() {
  Serial.begin(115200);
  tira.begin();
  apagarTodo();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado. IP del ESP32: ");
  Serial.println(WiFi.localIP());  // <-- usa esta IP en el backend

  server.on("/luz", HTTP_POST, handleLuz);
  server.on("/apagar", HTTP_POST, handleApagar);
  server.begin();
  Serial.println("Servidor listo en /luz");
}

void loop() {
  server.handleClient();
}
