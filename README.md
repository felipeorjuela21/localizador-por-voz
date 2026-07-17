# Localizador de Medicamentos por Voz

Asistente de voz para droguerías. Preguntas por voz dónde está un medicamento
y el sistema responde la ubicación (estante, fila, columna), la muestra en
pantalla y dispara un webhook que enciende un LED en el estante físico.

> "¿Dónde está el acetaminofén de 300?"
> → "Estante 2, fila 4, columna 3" + LED encendido en esa casilla.

## Stack

| Capa      | Tecnología                    | Por qué |
|-----------|-------------------------------|---------|
| Frontend  | React + Vite + TypeScript     | Arranque rápido, tipado fuerte, Web Speech API nativa |
| Backend   | FastAPI (Python 3.11+)        | Mejor ecosistema de fuzzy matching / NLP; docs auto en /docs |
| DB        | SQLite + SQLModel             | Cero setup, un archivo; migrable a Postgres |
| Matching  | rapidfuzz + normalización     | Tolera acentos, errores de voz, "300" vs "300mg" |
| Voz (STT) | Web Speech API (prototipo)    | Gratis en navegador; migrar a Whisper en producción |
| Luces     | Webhook HTTP → ESP32          | Firmware incluido en /firmware, maneja tira zigzag |

## Estructura

```
localizador/
├── backend/          API FastAPI + base de datos
│   ├── app/
│   │   ├── main.py       endpoints
│   │   ├── models.py     tablas SQLModel
│   │   ├── database.py   conexión SQLite
│   │   ├── matching.py   fuzzy matching + normalización
│   │   ├── luces.py      disparo del webhook
│   │   └── seed.py       datos de ejemplo
│   └── requirements.txt
├── frontend/         React + Vite
│   └── src/
│       ├── App.tsx
│       ├── hooks/useSpeech.ts     reconocimiento + síntesis de voz
│       ├── lib/api.ts             llamadas al backend
│       └── components/            UI (mic, grid, respuesta)
├── firmware/         código ESP32 para las luces
└── docs/             arquitectura y guía de producción
```

## Cómo arrancar

Lee `docs/SETUP.md` para instrucciones paso a paso. En resumen:

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed          # crea la DB con datos de ejemplo
uvicorn app.main:app --reload

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

Backend en http://localhost:8000 (docs en /docs), frontend en http://localhost:5173.

## Roadmap

1. [x] Prototipo web (voz + búsqueda + grid)
2. [ ] Conectar ESP32 real (ver firmware/)
3. [ ] Migrar STT a Whisper para nombres farmacéuticos
4. [ ] Panel de administración para cargar el inventario (CSV)
5. [ ] Autenticación si va a producción
