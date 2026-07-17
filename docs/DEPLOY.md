# Despliegue en producción (Vercel + Render)

El proyecto son dos piezas y cada una va en la plataforma que le conviene:

| Pieza | Plataforma | Por qué |
|-------|------------|---------|
| Frontend (React/Vite) | **Vercel** | Sitio estático; Vercel lo sirve con HTTPS real y despliegue automático desde GitHub. |
| Backend (FastAPI + SQLite) | **Render** | Necesita un proceso vivo y disco. En Vercel (serverless) el SQLite se borraría en cada invocación. |

Se conectan con un *rewrite* en `vercel.json`: el frontend llama a `/api/...` (mismo
origen) y Vercel lo reenvía al backend. Así no hay problemas de CORS ni de "contenido mixto".

> Requisito: el repo ya está en GitHub (`felipeorjuela21/localizador-por-voz`).

---

## Parte 1 — Backend en Render

1. Entra a **https://render.com** y crea cuenta con GitHub.
2. **New +** → **Web Service** → conecta el repo `localizador-por-voz`.
3. Configura:
   - **Name:** `localizador-api` (o el que quieras)
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
   - **Variable de entorno `PYTHON_VERSION` = `3.11.9`** (¡importante!). El repo ya
     incluye `backend/.python-version`, pero conviene fijarla también aquí. Con
     Python muy nuevo (3.13) falla la instalación de `rapidfuzz` (no hay binario
     y no puede compilarlo).
4. **Create Web Service** y espera a que el deploy termine.
5. Copia la URL pública que te da, por ejemplo: `https://localizador-api.onrender.com`
6. **Sembrar datos** (crea el usuario `admin` y el inventario de ejemplo): en el
   servicio, pestaña **Shell**, ejecuta:
   ```bash
   python -m app.seed
   ```

Verifica en el navegador que `https://TU-BACKEND.onrender.com/health` devuelva `{"status":"ok"}`.

---

## Parte 2 — Conectar el frontend con el backend

Edita `frontend/vercel.json` y reemplaza el host por tu URL de Render:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://localizador-api.onrender.com/:path*" }
  ]
}
```

Guarda, y súbelo:
```bash
git add frontend/vercel.json
git commit -m "Apunta el rewrite /api al backend de Render"
git push
```

---

## Parte 3 — Frontend en Vercel

1. Entra a **https://vercel.com** y crea cuenta con GitHub.
2. **Add New…** → **Project** → **Import** el repo `localizador-por-voz`.
3. Configura:
   - **Root Directory:** `frontend`  (clic en *Edit* y elige la carpeta `frontend`)
   - **Framework Preset:** Vite (se detecta solo)
   - **Build Command:** `npm run build` (por defecto)
   - **Output Directory:** `dist` (por defecto)
4. **Deploy**. Al terminar te da una URL, por ejemplo:
   `https://localizador-por-voz.vercel.app`

Cada vez que hagas `git push` a `main`, Vercel vuelve a desplegar automáticamente.

---

## Probar

Abre la URL de Vercel:
- Ingresa con `admin` → deberías ver el **Panel** con los registros.
- Busca un medicamento → responde ubicación y queda registrado.
- **Voz:** en Android funciona (Vercel da HTTPS con certificado válido, sin avisos).
  En iPhone el dictado sigue sin funcionar (límite de iOS; requiere migrar a Whisper).

---

## Persistencia de datos (importante)

El plan Free de Render tiene **disco efímero**: el archivo `localizador.db` se
reinicia cuando el servicio se reinicia o se vuelve a desplegar, y el servicio se
"duerme" tras un rato de inactividad. Para un demo sirve; para uso real, migra a
una base gestionada (persistente):

1. Crea un **PostgreSQL** (Render, Neon o Supabase) y copia su cadena de conexión.
2. En `backend/requirements.txt` agrega `psycopg[binary]`.
3. En `backend/app/database.py`, usa la variable de entorno:
   ```python
   import os
   DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./localizador.db")
   ```
   (SQLModel funciona con Postgres cambiando solo la URL.)
4. En Render, define la variable `DATABASE_URL` con la cadena del Postgres.

---

## Notas

- **Luces (ESP32):** desde la nube el backend no alcanza un ESP32 en la red local
  de la droguería; el webhook falla en silencio (no rompe la respuesta). Para
  encender luces reales, el dispositivo debe ser accesible públicamente.
- **CORS:** con el rewrite de Vercel no hace falta tocar CORS (el navegador ve
  todo como mismo origen). Solo se necesitaría si el frontend llamara al backend
  por su URL directa.
