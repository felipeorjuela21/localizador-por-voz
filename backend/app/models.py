from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


def _ahora_utc_iso() -> str:
    """Marca de tiempo en UTC, ISO 8601 con sufijo Z (ordenable y sin ambigüedad)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Producto(SQLModel, table=True):
    """Un medicamento y su ubicación física en la droguería."""

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True)          # "Acetaminofén"
    presentacion: str = ""                    # "300mg", "jarabe 120ml"
    estante: int                              # número de estante/anaquel
    fila: int                                 # fila dentro del estante
    columna: int                             # columna dentro del estante

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.presentacion}".strip()


class Usuario(SQLModel, table=True):
    """Quien usa el sistema. Sin contraseña: identificación por nombre.
    El rol 'admin' es el único que puede ver el panel de registros."""

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, unique=True)
    rol: str = "empleado"                     # "empleado" | "admin"


class RegistroBusqueda(SQLModel, table=True):
    """Bitácora: cada búsqueda queda con usuario, hora, tipo y lo que se buscó."""

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario: str = Field(index=True)          # nombre del usuario que buscó
    tipo: str = Field(default="medicamento", index=True)  # "medicamento" | "ubicacion"
    query: str                                # lo que se dijo/escribió
    encontrado: bool = False
    producto: Optional[str] = None            # resultado: producto o droguería hallada
    confianza: Optional[float] = None
    creado: str = Field(default_factory=_ahora_utc_iso, index=True)  # UTC ISO 8601


class BusquedaRequest(SQLModel):
    query: str


class BusquedaResponse(SQLModel):
    found: bool
    producto: Optional[Producto] = None
    led: Optional[int] = None
    confianza: Optional[float] = None
    mensaje: str = ""


class LoginRequest(SQLModel):
    nombre: str
