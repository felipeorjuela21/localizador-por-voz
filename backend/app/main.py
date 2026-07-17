from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, col, select

from .database import crear_db, get_session
from .luces import encender_luz
from .matching import buscar
from .models import (
    BusquedaRequest,
    BusquedaResponse,
    LoginRequest,
    Producto,
    RegistroBusqueda,
    Usuario,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Se ejecuta al arrancar: crea las tablas si no existen.
    crear_db()
    yield


app = FastAPI(title="Localizador de Medicamentos por Voz", lifespan=lifespan)

# Permite que el frontend (Vite en :5173) llame a la API.
# El regex cubre además el acceso desde otros dispositivos de la red local
# (p. ej. el iPhone entrando por http://192.168.x.x:5173).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://[\w.-]+:5173",
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Identidad (login sin contraseña, por nombre) ---------------------------

def usuario_actual(
    x_usuario_id: Optional[int] = Header(default=None),
    session: Session = Depends(get_session),
) -> Usuario:
    """Lee el id del usuario de la cabecera X-Usuario-Id y lo resuelve.
    Sin contraseña: es identificación, no autenticación fuerte."""
    if x_usuario_id is None:
        raise HTTPException(status_code=401, detail="Falta iniciar sesión")
    user = session.get(Usuario, x_usuario_id)
    if not user:
        raise HTTPException(status_code=401, detail="Sesión no válida, vuelve a entrar")
    return user


def admin_actual(user: Usuario = Depends(usuario_actual)) -> Usuario:
    if user.rol != "admin":
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    return user


@app.post("/login", response_model=Usuario)
def login(req: LoginRequest, session: Session = Depends(get_session)):
    nombre = req.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    user = session.exec(select(Usuario).where(Usuario.nombre == nombre)).first()
    if not user:
        # Usuario nuevo: se crea como empleado. El admin se siembra aparte.
        user = Usuario(nombre=nombre, rol="empleado")
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


# --- Productos --------------------------------------------------------------

@app.get("/productos", response_model=list[Producto])
def listar_productos(session: Session = Depends(get_session)):
    return session.exec(select(Producto)).all()


@app.post("/productos", response_model=Producto)
def crear_producto(producto: Producto, session: Session = Depends(get_session)):
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


# --- Búsqueda (registra quién buscó, qué y cuándo) --------------------------

@app.post("/buscar", response_model=BusquedaResponse)
async def buscar_producto(
    req: BusquedaRequest,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(usuario_actual),
):
    productos = session.exec(select(Producto)).all()
    resultado = buscar(req.query, list(productos))

    if resultado is None:
        _registrar(session, usuario.nombre, req.query, False, None, None)
        return BusquedaResponse(found=False, mensaje="No encontré ese producto")

    producto, confianza = resultado
    led = await encender_luz(producto)
    confianza = round(confianza, 1)
    _registrar(session, usuario.nombre, req.query, True, producto.nombre_completo, confianza)
    mensaje = (
        f"{producto.nombre_completo}: estante {producto.estante}, "
        f"fila {producto.fila}, columna {producto.columna}"
    )
    return BusquedaResponse(
        found=True,
        producto=producto,
        led=led,
        confianza=confianza,
        mensaje=mensaje,
    )


def _registrar(
    session: Session,
    usuario: str,
    query: str,
    encontrado: bool,
    producto: Optional[str],
    confianza: Optional[float],
) -> None:
    session.add(
        RegistroBusqueda(
            usuario=usuario,
            query=query,
            encontrado=encontrado,
            producto=producto,
            confianza=confianza,
        )
    )
    session.commit()


# --- Panel de registros (solo admin) ----------------------------------------

@app.get("/registros", response_model=list[RegistroBusqueda])
def listar_registros(
    limite: int = 500,
    _admin: Usuario = Depends(admin_actual),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(RegistroBusqueda)
        .order_by(col(RegistroBusqueda.creado).desc())
        .limit(limite)
    ).all()


@app.get("/health")
def health():
    return {"status": "ok"}
