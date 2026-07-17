"""Dispara el webhook que enciende el LED en el estante físico."""
import httpx

from .config import settings
from .models import Producto


def calcular_led(fila: int, columna: int) -> int:
    """
    Traduce (fila, columna) 1-indexadas a un índice lineal de LED en la tira.

    Tira recta:   cada fila reinicia de izquierda a derecha.
    Tira zigzag:  las filas pares van de derecha a izquierda (serpentea),
                  que es como se monta físicamente una tira continua.
    """
    r, c = fila - 1, columna - 1
    cols = settings.grid_cols
    if settings.led_zigzag and r % 2 == 1:
        c = cols - 1 - c
    return r * cols + c


async def encender_luz(producto: Producto) -> int:
    """Calcula el LED y, si hay URL configurada, hace POST al dispositivo."""
    led = calcular_led(producto.fila, producto.columna)
    if settings.luces_webhook_url:
        payload = {
            "led": led,
            "estante": producto.estante,
            "fila": producto.fila,
            "columna": producto.columna,
        }
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(settings.luces_webhook_url, json=payload)
        except Exception as e:  # el dispositivo puede estar apagado; no romper la respuesta
            print(f"[luces] no se pudo contactar el dispositivo: {e}")
    return led
