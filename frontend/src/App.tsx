import { useState } from "react";
import { getUsuario, guardarUsuario, type Usuario } from "./lib/api";
import { Login } from "./components/Login";
import { Medicamentos } from "./components/Medicamentos";
import { Droguerias } from "./components/Droguerias";
import { Panel } from "./components/Panel";

type Vista = "home" | "medicamento" | "drogueria" | "panel";

// Cada vista tiñe el acento (nav, botones) para diferenciar los "ambientes".
const ENV_CLASS: Record<Vista, string> = {
  home: "env-medicamento",
  medicamento: "env-medicamento",
  drogueria: "env-drogueria",
  panel: "env-panel",
};

function Home({
  nombre,
  esAdmin,
  ir,
}: {
  nombre: string;
  esAdmin: boolean;
  ir: (v: Vista) => void;
}) {
  return (
    <>
      <div className="hero">
        <h2>Hola, {nombre} 👋</h2>
        <p>¿Qué quieres hacer hoy?</p>
      </div>
      <div className="env-cards">
        <button className="env-card env-medicamento" onClick={() => ir("medicamento")}>
          <div className="ico">💊</div>
          <h3>Buscar medicamento</h3>
          <p>Localiza un producto en la droguería (estante, fila y columna) por voz.</p>
        </button>
        <button className="env-card env-drogueria" onClick={() => ir("drogueria")}>
          <div className="ico">📍</div>
          <h3>Encontrar droguería</h3>
          <p>Droguerías cerca de ti en el mapa. Di "la más cercana" o una cadena.</p>
        </button>
        {esAdmin && (
          <button className="env-card env-panel" onClick={() => ir("panel")}>
            <div className="ico">📊</div>
            <h3>Panel de registros</h3>
            <p>Historial de búsquedas por usuario y hora. Solo administrador.</p>
          </button>
        )}
      </div>
    </>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(getUsuario());
  const [vista, setVista] = useState<Vista>("home");

  if (!usuario) {
    return (
      <Login
        onLogin={(u) => {
          guardarUsuario(u);
          setUsuario(u);
        }}
      />
    );
  }

  const esAdmin = usuario.rol === "admin";

  function salir() {
    guardarUsuario(null);
    setUsuario(null);
    setVista("home");
  }

  const navItems: { id: Vista; label: string; icon: string }[] = [
    { id: "home", label: "Inicio", icon: "🏠" },
    { id: "medicamento", label: "Medicamento", icon: "💊" },
    { id: "drogueria", label: "Droguería", icon: "📍" },
  ];
  if (esAdmin) navItems.push({ id: "panel", label: "Panel", icon: "📊" });

  return (
    <div className={ENV_CLASS[vista]}>
      <header className="appbar">
        <div className="brand" onClick={() => setVista("home")}>
          <div className="brand-logo">💊</div>
          <h1>Localizador</h1>
        </div>
        <div className="appbar-right">
          <span className="user-chip">
            👤 {usuario.nombre}
            {esAdmin && " · admin"}
          </span>
          <button className="btn-ghost" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <main className="container">
        <nav className="nav">
          {navItems.map((n) => (
            <button
              key={n.id}
              className={`nav-pill${vista === n.id ? " active" : ""}`}
              onClick={() => setVista(n.id)}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>

        {vista === "home" && <Home nombre={usuario.nombre} esAdmin={esAdmin} ir={setVista} />}
        {vista === "medicamento" && <Medicamentos />}
        {vista === "drogueria" && <Droguerias />}
        {vista === "panel" && esAdmin && <Panel />}
      </main>
    </div>
  );
}
