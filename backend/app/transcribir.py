"""Transcribe audio a texto con la API de Groq (Whisper).

Para dispositivos que no soportan reconocimiento de voz en el navegador
(iPhone/iOS) y como alternativa cuando la red bloquea el servicio de Google.
Necesita la variable de entorno GROQ_API_KEY (capa gratuita en console.groq.com).
"""
import httpx

from .config import settings

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MODELO = "whisper-large-v3-turbo"  # multilingüe, rápido y en la capa gratuita


async def transcribir_audio(contenido: bytes, filename: str, content_type: str) -> str:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY no configurada")
    files = {"file": (filename, contenido, content_type or "audio/m4a")}
    data = {"model": MODELO, "language": "es", "response_format": "json"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            files=files,
            data=data,
        )
        resp.raise_for_status()
        return (resp.json().get("text") or "").strip()
