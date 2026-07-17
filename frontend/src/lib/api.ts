export interface Producto {
  id: number;
  nombre: string;
  presentacion: string;
  estante: number;
  fila: number;
  columna: number;
}

export interface BusquedaResponse {
  found: boolean;
  producto: Producto | null;
  led: number | null;
  confianza: number | null;
  mensaje: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  rol: string; // "empleado" | "admin"
}

export interface Registro {
  id: number;
  usuario: string;
  query: string;
  encontrado: boolean;
  producto: string | null;
  confianza: number | null;
  creado: string; // ISO 8601 UTC
}

// Llamamos al backend por el proxy de Vite (/api → http://localhost:8000).
// Al ser el mismo origen que la página, funciona igual por HTTP, por HTTPS
// y desde el celular, sin problemas de "contenido mixto" ni de CORS.
const API_URL = "/api";

// --- Identidad (login sin contraseña) --------------------------------------
// Guardamos el usuario en localStorage y mandamos su id en X-Usuario-Id.

let usuarioActual: Usuario | null = leerUsuarioGuardado();

function leerUsuarioGuardado(): Usuario | null {
  try {
    const raw = localStorage.getItem("usuario");
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

export function getUsuario(): Usuario | null {
  return usuarioActual;
}

export function guardarUsuario(u: Usuario | null) {
  usuarioActual = u;
  if (u) localStorage.setItem("usuario", JSON.stringify(u));
  else localStorage.removeItem("usuario");
}

function authHeaders(base: Record<string, string> = {}): Record<string, string> {
  return usuarioActual ? { ...base, "X-Usuario-Id": String(usuarioActual.id) } : base;
}

export async function login(nombre: string): Promise<Usuario> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  if (!res.ok) throw new Error("No se pudo iniciar sesión");
  return res.json();
}

export async function buscarProducto(query: string): Promise<BusquedaResponse> {
  const res = await fetch(`${API_URL}/buscar`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
}

export async function listarProductos(): Promise<Producto[]> {
  const res = await fetch(`${API_URL}/productos`, { headers: authHeaders() });
  return res.json();
}

export async function getRegistros(limite = 500): Promise<Registro[]> {
  const res = await fetch(`${API_URL}/registros?limite=${limite}`, {
    headers: authHeaders(),
  });
  if (res.status === 403) throw new Error("Solo el administrador puede ver el panel.");
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
}
