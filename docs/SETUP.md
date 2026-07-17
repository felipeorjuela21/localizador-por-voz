# Guía de instalación y puesta en marcha

## Requisitos

- Python 3.11 o superior
- Node.js 18 o superior
- Google Chrome (el reconocimiento de voz solo funciona bien en Chrome/Edge)

## 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed                # crea localizador.db con datos de ejemplo
uvicorn app.main:app --reload
```

Verifica en http://localhost:8000/docs (documentación interactiva de la API).

## 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 en Chrome. Toca el micrófono y di "acetaminofén de 300".

## 3. Conectar las luces (ESP32) — opcional

1. Abre `firmware/esp32_luces.ino` en el Arduino IDE.
2. Instala las librerías "Adafruit NeoPixel" y "ArduinoJson".
3. Pon tu WiFi y el número de LEDs (filas × columnas).
4. Sube el código al ESP32 y abre el Monitor Serie: copia la IP que imprime.
5. En `backend/.env` (copiado de `.env.example`) pon:
   ```
   LUCES_WEBHOOK_URL=http://LA_IP_DEL_ESP32/luz
   ```
6. Reinicia el backend. Ahora cada búsqueda encenderá el LED físico.

## Cableado de la tira LED

- Tira WS2812B de N leds (N = filas × columnas).
- Data → pin 5 del ESP32 (configurable en el .ino).
- Alimentación 5V: para más de ~10 LEDs usa una fuente externa de 5V,
  no el USB del ESP32. Une las tierras (GND común).
- Monta la tira serpenteando fila por fila y deja `LED_ZIGZAG=true`.

## Cómo cargar tu inventario real

Tres opciones:

1. Editar `backend/app/seed.py` y volver a ejecutar `python -m app.seed`
   (borra `localizador.db` primero para re-sembrar).
2. Usar el endpoint `POST /productos` (mira /docs).
3. Roadmap: importador de CSV (pendiente).
