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
      const u = await login(n);
      onLogin(u);
    } catch {
      setError("No se pudo iniciar sesión. ¿Está el backend corriendo?");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: "10vh auto 0", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Localizador de medicamentos</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>Ingresa tu nombre para empezar.</p>

      <input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ingresar()}
        placeholder="Tu nombre (ej: maría, admin)"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15, marginTop: 16, boxSizing: "border-box" }}
      />
      <button
        onClick={ingresar}
        disabled={cargando || !nombre.trim()}
        style={{
          width: "100%", marginTop: 12, padding: "10px 16px", borderRadius: 8, fontSize: 15,
          border: "1px solid #0c447c", background: "#0c447c", color: "#fff",
          cursor: cargando || !nombre.trim() ? "default" : "pointer", opacity: cargando || !nombre.trim() ? 0.6 : 1,
        }}
      >
        {cargando ? "Ingresando…" : "Ingresar"}
      </button>

      {error && <p style={{ color: "#a32d2d", fontSize: 13, marginTop: 12 }}>{error}</p>}
      <p style={{ color: "#999", fontSize: 12, marginTop: 20 }}>
        El panel de registros solo lo ve el usuario <strong>admin</strong>.
      </p>
    </div>
  );
}
