import { useEffect, useRef, useState } from "react";
import { useSpeech } from "./hooks/useSpeech";
import {
  buscarProducto,
  getUsuario,
  guardarUsuario,
  listarProductos,
  type BusquedaResponse,
  type Producto,
  type Usuario,
} from "./lib/api";
import { Grid } from "./components/Grid";
import { Login } from "./components/Login";
import { Panel } from "./components/Panel";

export default function App() {
  const { escuchar, hablar, escuchando, soportado, probarMicrofono } = useSpeech();
  const [usuario, setUsuario] = useState<Usuario | null>(getUsuario());
  const [vista, setVista] = useState<"buscar" | "panel">("buscar");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("Toca el micrófono y di el nombre de un medicamento");
  const [escuchado, setEscuchado] = useState("");
  const [resultado, setResultado] = useState<BusquedaResponse | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [estanteVista, setEstanteVista] = useState<number | null>(null);
  const [probando, setProbando] = useState(false);
  const [nivel, setNivel] = useState(0);
  const detenerPruebaRef = useRef<(() => void) | null>(null);

  // Carga todo el inventario tras iniciar sesión, para anunciar qué hay en cada casilla.
  useEffect(() => {
    if (!usuario) return;
    listarProductos()
      .then((ps) => {
        setProductos(ps);
        if (ps.length) setEstanteVista((actual) => actual ?? Math.min(...ps.map((p) => p.estante)));
      })
      .catch(() => {
        /* el backend puede no estar arriba aún; el grid queda vacío */
      });
  }, [usuario]);

  // Enciende/apaga la prueba de micrófono (medidor de nivel de sonido).
  async function probarMic() {
    if (probando) {
      detenerPruebaRef.current?.();
      detenerPruebaRef.current = null;
      setProbando(false);
      setNivel(0);
      return;
    }
    setProbando(true);
    setEstado("Prueba de micrófono: habla y mira la barra.");
    detenerPruebaRef.current = await probarMicrofono(setNivel, (e) => {
      setEstado(e);
      setProbando(false);
    });
  }

  // Al tocar una casilla: anuncia por voz el producto que hay ahí (o que está vacía).
  function onCeldaClick(fila: number, columna: number, prod: Producto | null) {
    if (prod) {
      const nombre = `${prod.nombre} ${prod.presentacion}`.trim();
      setEscuchado(nombre);
      setEstado(`Estante ${prod.estante}, fila ${fila}, columna ${columna}`);
      hablar(`${nombre}. Estante ${prod.estante}, fila ${fila}, columna ${columna}.`);
    } else {
      setEscuchado("");
      setEstado(`Casilla ${fila}·${columna}: vacía`);
      hablar("Esa casilla está vacía");
    }
  }

  async function ejecutarBusqueda(query: string) {
    setEscuchado(query);
    setEstado("Buscando…");
    try {
      const r = await buscarProducto(query);
      setResultado(r);
      if (r.found) {
        if (r.producto) setEstanteVista(r.producto.estante);
        setEstado(`Encontrado (${r.confianza}% de confianza)`);
        hablar(r.mensaje);
      } else {
        setEstado("No encontrado");
        hablar("No encontré ese producto");
      }
    } catch {
      setEstado("Error conectando con el servidor. ¿Está el backend corriendo?");
    }
  }

  function onMic() {
    setEstado("Iniciando micrófono…");
    escuchar(
      (t) => ejecutarBusqueda(t),
      (err) => setEstado(err),
      (s) => setEstado(s)
    );
  }

  function salir() {
    guardarUsuario(null);
    setUsuario(null);
    setVista("buscar");
  }

  // Sin sesión: pantalla de ingreso.
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

  const estantes = Array.from(new Set(productos.map((p) => p.estante))).sort((a, b) => a - b);
  const esAdmin = usuario.rol === "admin";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Localizador de medicamentos</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#666" }}>
            👤 {usuario.nombre}
            {esAdmin && " · admin"}
          </span>
          <button
            onClick={salir}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer", background: "#fff", fontSize: 13 }}
          >
            Salir
          </button>
        </div>
      </div>

      {esAdmin && (
        <div style={{ display: "flex", gap: 6, margin: "12px 0 20px" }}>
          {(["buscar", "panel"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              style={{
                padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                border: "1px solid #ccc",
                background: vista === v ? "#0c447c" : "#fff",
                color: vista === v ? "#fff" : "#333",
              }}
            >
              {v === "buscar" ? "Buscar" : "Panel"}
            </button>
          ))}
        </div>
      )}

      {esAdmin && vista === "panel" ? (
        <Panel />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1rem 0" }}>
            <button
              onClick={onMic}
              disabled={!soportado || escuchando}
              aria-label="Hablar"
              style={{
                width: 56, height: 56, borderRadius: "50%", fontSize: 22, cursor: "pointer",
                border: "1px solid #ccc", background: escuchando ? "#EF9F27" : "#fff",
              }}
            >
              🎤
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{estado}</p>
              <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 500, minHeight: 22 }}>{escuchado}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && texto.trim() && ejecutarBusqueda(texto.trim())}
              placeholder="o escríbelo: acetaminofén 300"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15 }}
            />
            <button
              onClick={() => texto.trim() && ejecutarBusqueda(texto.trim())}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer", background: "#fff" }}
            >
              Buscar
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <button
              onClick={probarMic}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer",
                fontSize: 13, background: probando ? "#EF9F27" : "#fff",
              }}
            >
              {probando ? "Detener prueba" : "🔊 Probar micrófono"}
            </button>
            {probando && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 12, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%", width: `${nivel}%`,
                      background: nivel > 15 ? "#3aa757" : "#ccc", transition: "width 80ms linear",
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
                  Habla ahora. Si la barra se mueve al hablar, el micrófono capta sonido correctamente.
                </p>
              </div>
            )}
          </div>

          {resultado?.found && resultado.producto && (
            <div style={{ background: "#e6f1fb", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#185fa5" }}>Ubicación</p>
              <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 600, color: "#0c447c" }}>
                {resultado.mensaje}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#185fa5" }}>
                LED #{resultado.led} {"→"} webhook enviado al estante
              </p>
            </div>
          )}

          {estantes.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {estantes.map((e) => (
                <button
                  key={e}
                  onClick={() => setEstanteVista(e)}
                  style={{
                    padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                    border: "1px solid #ccc",
                    background: e === estanteVista ? "#0c447c" : "#fff",
                    color: e === estanteVista ? "#fff" : "#333",
                  }}
                >
                  Estante {e}
                </button>
              ))}
            </div>
          )}

          <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
            Toca una casilla para escuchar qué producto hay.
          </p>

          <Grid
            productos={productos}
            estante={estanteVista}
            seleccion={resultado?.producto ?? null}
            onCeldaClick={onCeldaClick}
          />

          {!soportado && (
            <p style={{ marginTop: 16, fontSize: 13, color: "#a32d2d" }}>
              Tu navegador no soporta reconocimiento de voz. Usa Chrome, o escribe en el campo de arriba.
            </p>
          )}
        </>
      )}
    </div>
  );
}
