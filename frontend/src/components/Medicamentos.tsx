import { useEffect, useRef, useState } from "react";
import { useSpeech } from "../hooks/useSpeech";
import { buscarProducto, listarProductos, type BusquedaResponse, type Producto } from "../lib/api";
import { Grid } from "./Grid";

export function Medicamentos() {
  const { escuchar, hablar, escuchando, soportado, probarMicrofono } = useSpeech();
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("Toca el micrófono y di el nombre de un medicamento");
  const [escuchado, setEscuchado] = useState("");
  const [resultado, setResultado] = useState<BusquedaResponse | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [estanteVista, setEstanteVista] = useState<number | null>(null);
  const [probando, setProbando] = useState(false);
  const [nivel, setNivel] = useState(0);
  const detenerPruebaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listarProductos()
      .then((ps) => {
        setProductos(ps);
        if (ps.length) setEstanteVista((a) => a ?? Math.min(...ps.map((p) => p.estante)));
      })
      .catch(() => {});
  }, []);

  const estantes = Array.from(new Set(productos.map((p) => p.estante))).sort((a, b) => a - b);

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

  return (
    <>
      <div className="card">
        <div className="mic-row">
          <button
            className={`mic-btn${escuchando ? " on" : ""}`}
            onClick={onMic}
            disabled={!soportado || escuchando}
            aria-label="Hablar"
          >
            🎤
          </button>
          <div style={{ flex: 1 }}>
            <p className="estado">{estado}</p>
            <p className="escuchado">{escuchado}</p>
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <input
            className="input"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && texto.trim() && ejecutarBusqueda(texto.trim())}
            placeholder="o escríbelo: acetaminofén 300"
          />
          <button className="btn btn-primary" onClick={() => texto.trim() && ejecutarBusqueda(texto.trim())}>
            Buscar
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={probarMic}>
            {probando ? "Detener prueba" : "🔊 Probar micrófono"}
          </button>
          {probando && (
            <div>
              <div className="meter on">
                <span style={{ width: `${nivel}%` }} />
              </div>
              <p className="hint">Habla ahora. Si la barra se mueve, el micrófono capta sonido.</p>
            </div>
          )}
        </div>
      </div>

      {resultado?.found && resultado.producto && (
        <div className="card" style={{ padding: 0, border: 0, boxShadow: "none" }}>
          <div className="locbox">
            <p className="lbl">Ubicación</p>
            <p className="val">{resultado.mensaje}</p>
            <p className="sub">LED #{resultado.led} → webhook enviado al estante</p>
          </div>
        </div>
      )}

      <div className="card">
        {estantes.length > 1 && (
          <div className="nav" style={{ marginBottom: 12 }}>
            {estantes.map((e) => (
              <button
                key={e}
                className={`nav-pill${e === estanteVista ? " active" : ""}`}
                onClick={() => setEstanteVista(e)}
              >
                Estante {e}
              </button>
            ))}
          </div>
        )}
        <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
          Toca una casilla para escuchar qué producto hay.
        </p>
        <Grid productos={productos} estante={estanteVista} seleccion={resultado?.producto ?? null} onCeldaClick={onCeldaClick} />
      </div>

      {!soportado && (
        <p className="hint" style={{ color: "var(--danger)" }}>
          Tu navegador no soporta reconocimiento de voz. Usa Chrome, o escribe en el campo de arriba.
        </p>
      )}
    </>
  );
}
