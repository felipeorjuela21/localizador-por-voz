import { useEffect, useMemo, useState } from "react";
import { getRegistros, type Registro } from "../lib/api";

function fechaLocal(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

type Filtro = "todos" | "medicamento" | "ubicacion";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "medicamento", label: "💊 Medicamentos" },
  { id: "ubicacion", label: "📍 Ubicaciones" },
];

export function Panel() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [estado, setEstado] = useState("Cargando…");

  async function cargar() {
    setEstado("Cargando…");
    try {
      const rs = await getRegistros();
      setRegistros(rs);
      setEstado(rs.length ? "" : "Aún no hay búsquedas registradas.");
    } catch (e) {
      setEstado(e instanceof Error ? e.message : "Error cargando registros");
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(
    () => (filtro === "todos" ? registros : registros.filter((r) => r.tipo === filtro)),
    [registros, filtro]
  );

  const resumen = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of filtrados) {
      const d = new Date(r.creado);
      const clave = `${d.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} · ${String(
        d.getHours()
      ).padStart(2, "0")}:00`;
      mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
    }
    return Array.from(mapa.entries());
  }, [filtrados]);

  const maxConteo = Math.max(1, ...resumen.map(([, n]) => n));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 650, margin: 0 }}>Registros de búsqueda</h2>
        <button className="btn" onClick={cargar}>↻ Actualizar</button>
      </div>

      <div className="nav" style={{ marginBottom: 14 }}>
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`nav-pill${filtro === f.id ? " active" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {estado && <p className="estado">{estado}</p>}

      {filtrados.length > 0 ? (
        <>
          <div className="card">
            <p className="section-title">Búsquedas por hora ({filtrados.length} en total)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {resumen.map(([franja, n]) => (
                <div key={franja} className="bar-row">
                  <span className="k">{franja}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(n / maxConteo) * 100}%` }} />
                  </div>
                  <span className="n">{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tablewrap">
            <table className="reg">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Buscó</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fechaLocal(r.creado)}</td>
                    <td title={r.tipo}>{r.tipo === "ubicacion" ? "📍" : "💊"}</td>
                    <td>{r.usuario}</td>
                    <td>{r.query}</td>
                    <td>
                      {r.encontrado ? (
                        <span style={{ color: "var(--accent-ink)" }}>
                          {r.producto} {r.confianza != null && `(${r.confianza}%)`}
                        </span>
                      ) : (
                        <span style={{ color: "var(--danger)" }}>sin resultados</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        !estado && <p className="estado">No hay registros de ese tipo.</p>
      )}
    </div>
  );
}
