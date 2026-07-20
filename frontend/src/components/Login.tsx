import { useState } from "react";
import { login, type Usuario } from "../lib/api";

export function Login({ onLogin }: { onLogin: (u: Usuario) => void }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    const n = nombre.trim();
    if (!n) return;
    setCargando(true);
    setError("");
    try {
      onLogin(await login(n));
    } catch {
      setError("No se pudo iniciar sesión. ¿Está el backend corriendo?");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">💊</div>
      <h1 style={{ fontSize: 22, fontWeight: 650, margin: 0 }}>Localizador</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
        Ingresa tu nombre para empezar.
      </p>

      <input
        className="input"
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ingresar()}
        placeholder="Tu nombre (ej: maría, admin)"
        style={{ width: "100%", marginTop: 16 }}
      />
      <button
        className="btn btn-primary btn-block"
        onClick={ingresar}
        disabled={cargando || !nombre.trim()}
        style={{ marginTop: 12 }}
      >
        {cargando ? "Ingresando…" : "Ingresar"}
      </button>

      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 20 }}>
        El panel de registros solo lo ve el usuario <strong>admin</strong>.
      </p>
    </div>
  );
}
