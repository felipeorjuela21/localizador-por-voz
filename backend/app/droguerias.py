"""Busca droguerías/farmacias cercanas usando OpenStreetMap (Overpass API).

Gratis y sin API key. Filtra por cercanía a la ubicación del usuario y,
opcionalmente, por nombre de cadena ("Cafam", "Cruz Verde", etc.).

Estrategia (para ser rápido y no saturar Overpass):
  1) Una consulta rápida de farmacias cercanas (radio moderado, sin filtro).
  2) Si piden una cadena, se filtra en memoria (tolerante a errores de voz).
  3) Solo si no hay ninguna de esa cadena cerca, se hace una consulta dirigida
     por nombre/brand a mayor radio.
"""
import math
import re
import unicodedata
from typing import Optional

import httpx
from rapidfuzz import fuzz

# Instancias públicas de Overpass; si la primera falla, se intenta la siguiente.
_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
# Overpass exige un User-Agent descriptivo; sin él responde 406.
_HEADERS = {
    "User-Agent": "localizador-droguerias/1.0 (https://localizador-por-voz.vercel.app)",
    "Accept": "application/json",
}

_RADIO_CERCA = 6000     # metros: consulta rápida de cercanas
_RADIO_CADENA = 25000   # metros: consulta dirigida por cadena (pocos resultados)

# Palabras de relleno que la gente dice y que NO son el nombre de la cadena.
_STOPWORDS = {
    "drogueria", "droguerias", "farmacia", "farmacias", "botica", "boticas",
    "cerca", "cercana", "cercanas", "cercano", "cercanos", "mas", "menos",
    "la", "el", "los", "las", "una", "un", "unos", "unas", "que",
    "donde", "hay", "queda", "quedan", "esta", "estan", "dime", "muestrame",
    "busca", "buscar", "encuentra", "encontrar", "cual", "cuales", "es", "son",
    "de", "del", "por", "aqui", "mi", "me", "ubicacion", "a", "en", "para",
}


def normalizar(texto: str) -> str:
    """minúsculas, sin acentos, sin puntuación."""
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^\w\s]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def extraer_cadena(q: Optional[str]) -> str:
    """Del texto hablado saca el nombre de la cadena, quitando relleno.
    'dónde hay una droguería Cafam' -> 'cafam';  'la más cercana' -> ''."""
    if not q:
        return ""
    return " ".join(t for t in normalizar(q).split() if t not in _STOPWORDS)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en metros entre dos coordenadas."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _direccion(tags: dict) -> str:
    calle = f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip()
    partes = [p for p in [calle, tags.get("addr:city", "")] if p]
    return ", ".join(partes)


def _construir_consulta(lat: float, lng: float, radio: int, patron: Optional[str] = None) -> str:
    # Con 'patron', Overpass filtra por name/brand/operator (rápido y evita 504).
    filtro = f'[~"^(name|brand|operator)$"~"{patron}",i]' if patron else ""
    return (
        "[out:json][timeout:25];"
        "("
        f'node["amenity"="pharmacy"]{filtro}(around:{radio},{lat},{lng});'
        f'way["amenity"="pharmacy"]{filtro}(around:{radio},{lat},{lng});'
        ");"
        "out center tags;"
    )


async def _consultar_overpass(consulta: str) -> list[dict]:
    ultimo_error: Optional[Exception] = None
    async with httpx.AsyncClient(timeout=45.0, headers=_HEADERS) as client:
        for url in _ENDPOINTS:
            try:
                resp = await client.post(url, data={"data": consulta})
                resp.raise_for_status()
                return resp.json().get("elements", [])
            except httpx.HTTPError as e:
                ultimo_error = e
                continue
    raise ultimo_error if ultimo_error else RuntimeError("Overpass no respondió")


def _a_resultados(elementos: list[dict], lat: float, lng: float) -> list[dict]:
    resultados: list[dict] = []
    for el in elementos:
        if "lat" in el and "lon" in el:
            elat, elon = el["lat"], el["lon"]
        elif "center" in el:
            elat, elon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        tags = el.get("tags", {})
        nombre = tags.get("name") or tags.get("brand") or "Droguería"
        razon_social = (
            tags.get("official_name") or tags.get("operator") or tags.get("brand") or ""
        )
        resultados.append(
            {
                "nombre": nombre,
                "razon_social": razon_social,
                "direccion": _direccion(tags),
                "lat": elat,
                "lng": elon,
                "distancia_m": round(haversine_m(lat, lng, elat, elon)),
                "telefono": tags.get("phone") or tags.get("contact:phone"),
                "horario": tags.get("opening_hours"),
                # texto interno para filtrar por cadena (se elimina antes de responder)
                "_match": normalizar(
                    f"{tags.get('name', '')} {tags.get('brand', '')} {tags.get('operator', '')}"
                ),
            }
        )
    return resultados


async def buscar_droguerias(
    lat: float, lng: float, q: Optional[str] = None, limite: int = 8
) -> list[dict]:
    """Devuelve droguerías cercanas ordenadas por distancia (metros)."""
    cadena = extraer_cadena(q)

    # 1) Consulta rápida de cercanas (sin filtro).
    resultados = _a_resultados(
        await _consultar_overpass(_construir_consulta(lat, lng, _RADIO_CERCA)), lat, lng
    )

    if cadena:
        filtrados = [r for r in resultados if fuzz.partial_ratio(cadena, r["_match"]) >= 75]
        # 2) Ninguna de esa cadena cerca: consulta dirigida a mayor radio.
        if not filtrados:
            patron = ".*".join(re.escape(tok) for tok in cadena.split())
            try:
                el2 = await _consultar_overpass(
                    _construir_consulta(lat, lng, _RADIO_CADENA, patron)
                )
                filtrados = _a_resultados(el2, lat, lng)
            except httpx.HTTPError:
                filtrados = []
        resultados = filtrados

    resultados.sort(key=lambda r: r["distancia_m"])
    for r in resultados:
        r.pop("_match", None)
    return resultados[:limite]
