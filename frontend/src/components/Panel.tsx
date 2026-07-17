import { useEffect, useMemo, useState } from "react";
import { getRegistros, type Registro } from "../lib/api";

// Formatea una fecha ISO UTC a hora local legible.
function fechaLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

export function Panel() {
  const [registros, setRegistros] = useState<Registro[]>([]);
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

  // Resumen: cuántas búsquedas por franja de hora (en hora local).
  const resumen = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of registros) {
      const d = new Date(r.creado);
      const clave = `${d.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} · ${String(
        d.getHours()
      ).padStart(2, "0")}:00`;
      mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
    }
    return Array.from(mapa.entries()); // registros vienen de más nuevo a más viejo
  }, [registros]);

  const maxConteo = Math.max(1, ...resumen.map(([, n]) => n));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Registros de búsqueda</h2>
        <button
          onClick={cargar}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer", background: "#fff", fontSize: 13 }}
        >
          ↻ Actualizar
        </button>
      </div>

      {estado && <p style={{ color: "#666", fontSize: 14 }}>{estado}</p>}

      {registros.length > 0 && (
        <>
          {/* Resumen por hora */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
              Búsquedas por hora ({registros.length} en total)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {resumen.map(([franja, n]) => (
                <div key={franja} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 90, color: "#333", flexShrink: 0 }}>{franja}</span>
                  <div style={{ flex: 1, background: "#eee", borderRadius: 4, overflow: "hidden", height: 16 }}>
                    <div style={{ width: `${(n / maxConteo) * 100}%`, height: "100%", background: "#0c447c" }} />
                  </div>
                  <span style={{ width: 28, textAlign: "right", color: "#333" }}>{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de registros */}
          <div style={{ overflowX: "auto", border: "1px solid #e2e2dc", borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#faf9f5", textAlign: "left", color: "#555" }}>
                  <th style={celdaTh}>Hora</th>
                  <th style={celdaTh}>Usuario</th>
                  <th style={celdaTh}>Buscó</th>
                  <th style={celdaTh}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ ...celdaTd, whiteSpace: "nowrap" }}>{fechaLocal(r.creado)}</td>
                    <td style={celdaTd}>{r.usuario}</td>
                    <td style={celdaTd}>{r.query}</td>
                    <td style={celdaTd}>
                      {r.encontrado ? (
                        <span style={{ color: "#185fa5" }}>
                          {r.producto} {r.confianza != null && `(${r.confianza}%)`}
                        </span>
                      ) : (
                        <span style={{ color: "#a32d2d" }}>no encontrado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const celdaTh: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const celdaTd: React.CSSProperties = { padding: "8px 10px", color: "#333" };
