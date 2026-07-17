"""Crea la base de datos y la llena con inventario de ejemplo + usuario admin.
Ejecutar una vez:  python -m app.seed
Es idempotente: si ya hay datos, no los duplica.
"""
from sqlmodel import Session, select

from .database import engine, crear_db
from .models import Producto, Usuario

EJEMPLOS = [
    Producto(nombre="Acetaminofén", presentacion="300mg", estante=2, fila=4, columna=3),
    Producto(nombre="Acetaminofén", presentacion="500mg", estante=2, fila=1, columna=2),
    Producto(nombre="Ibuprofeno", presentacion="400mg", estante=1, fila=2, columna=5),
    Producto(nombre="Amoxicilina", presentacion="500mg", estante=3, fila=3, columna=1),
    Producto(nombre="Loratadina", presentacion="10mg", estante=1, fila=5, columna=4),
    Producto(nombre="Omeprazol", presentacion="20mg", estante=3, fila=1, columna=6),
    Producto(nombre="Naproxeno", presentacion="250mg", estante=2, fila=2, columna=4),
    Producto(nombre="Aspirina", presentacion="100mg", estante=1, fila=1, columna=1),
]


def seed():
    crear_db()
    with Session(engine) as session:
        if not session.exec(select(Producto)).first():
            session.add_all(EJEMPLOS)
            session.commit()
            print(f"Sembrados {len(EJEMPLOS)} productos.")
        else:
            print("Los productos ya existen, no se resiembran.")

        if not session.exec(select(Usuario).where(Usuario.nombre == "admin")).first():
            session.add(Usuario(nombre="admin", rol="admin"))
            session.commit()
            print("Usuario 'admin' creado (rol admin).")
        else:
            print("El usuario 'admin' ya existe.")


if __name__ == "__main__":
    seed()
