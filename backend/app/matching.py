"""
Matching difuso de la consulta de voz contra el inventario.

Retos que resuelve:
- La voz llega sin acentos o mal transcrita: "acetaminofen" vs "Acetaminofén".
- La gente dice "de 300" y la DB tiene "300mg".
- Presentaciones distintas del mismo fármaco (300 vs 500) hay que desempatarlas.
"""
import re
import unicodedata
from typing import Optional

from rapidfuzz import fuzz, process

from .models import Producto


def normalizar(texto: str) -> str:
    """minúsculas, sin acentos, sin puntería de puntuación."""
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^\w\s]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def extraer_mg(texto: str) -> Optional[int]:
    """Saca el primer número que parezca una dosis: 'de 300', '300mg', '500 mg'."""
    m = re.search(r"(\d+)\s*(mg|g|ml)?", texto)
    return int(m.group(1)) if m else None


def buscar(query: str, productos: list[Producto]) -> Optional[tuple[Producto, float]]:
    """
    Devuelve (producto, confianza 0-100) o None.
    Estrategia: fuzzy sobre el nombre completo, y si hay dosis en la query
    se usa como desempate fuerte entre presentaciones del mismo fármaco.
    """
    if not productos:
        return None

    q_norm = normalizar(query)
    q_mg = extraer_mg(q_norm)

    # candidatos normalizados -> índice
    nombres = {i: normalizar(p.nombre_completo) for i, p in enumerate(productos)}

    resultados = process.extract(
        q_norm,
        nombres,
        scorer=fuzz.token_set_ratio,
        limit=5,
    )
    if not resultados:
        return None

    mejor_idx, mejor_score = None, -1.0
    for _texto, score, idx in resultados:
        p = productos[idx]
        # Bonus si la dosis coincide, penalización si difiere.
        if q_mg is not None:
            p_mg = extraer_mg(normalizar(p.presentacion))
            if p_mg == q_mg:
                score += 20
            elif p_mg is not None:
                score -= 15
        if score > mejor_score:
            mejor_idx, mejor_score = idx, score

    if mejor_idx is None or mejor_score < 50:
        return None
    return productos[mejor_idx], min(mejor_score, 100.0)
