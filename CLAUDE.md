# Contexto para Claude Code

Este archivo le da contexto a Claude Code al trabajar en este repo.

## Qué es

Asistente de voz para droguerías. El usuario pregunta por voz dónde está un
medicamento; el sistema lo localiza (estante/fila/columna), lo responde por
voz y pantalla, y enciende un LED en el estante físico vía webhook a un ESP32.

## Arquitectura

- `frontend/` — React + Vite + TypeScript. Web Speech API para voz.
  - `src/App.tsx` — orquesta todo.
  - `src/hooks/useSpeech.ts` — STT (reconocimiento) + TTS (síntesis).
  - `src/lib/api.ts` — llamadas al backend.
- `backend/` — FastAPI + SQLite + SQLModel.
  - `app/matching.py` — fuzzy matching (rapidfuzz), normaliza acentos y dosis.
  - `app/luces.py` — calcula índice de LED (con zigzag) y dispara webhook.
  - `app/main.py` — endpoints: /buscar, /productos, /health.
- `firmware/` — sketch Arduino para ESP32 + tira WS2812B.

## Comandos

```bash
# backend (Linux/Mac)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload
# backend (Windows PowerShell)
cd backend; .venv\Scripts\Activate.ps1; uvicorn app.main:app --reload
python -m app.seed          # sembrar datos

# frontend
cd frontend && npm run dev
npm run build               # verificar build + tipos
```

## Convenciones

- Código y comentarios en español (es un proyecto para droguería hispana).
- fila/columna son 1-indexadas de cara al usuario; el índice de LED es 0-indexado.
- El backend NO rompe si el ESP32 está apagado: el webhook falla en silencio.

## Próximos pasos sugeridos

- Migrar STT de Web Speech API a Whisper (mejor con nombres de medicamentos):
  grabar con MediaRecorder en el front, enviar audio al backend, transcribir.
- Importador de inventario por CSV.
- Múltiples estantes con vista de selección.
- Tests: pytest para matching.py, el módulo más crítico.
