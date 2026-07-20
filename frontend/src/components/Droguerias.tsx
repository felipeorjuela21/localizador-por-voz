import { useState } from "react";
import { useSpeech } from "../hooks/useSpeech";
import { buscarDroguerias, type Drogueria } from "../lib/api";
import { Mapa } from "./Mapa";

function distanciaTexto(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}
function distanciaHabla(m: number): string {
  return m < 1000 ? `${m} metros` : `${(m / 1000).toFixed(1)} kilómetros`;
}
function mapsUrl(d: Drogueria): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`;
}

export function Droguerias() {
  const { escuchar, hablar, escuchando, soportado } = useSpeech();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState(
    'Toca el micrófono y di "la más cercana" o el nombre de una droguería.'
  );
  const [resultados, setResultados] = useState<Drogueria[]>([]);
  const [activo, setActivo] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);

  function obtenerUbicacion(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Este dispositivo no tiene geolocalización."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) =>
          reject(
            new Error(
              err.code === err.PERMISSION_DENIED
                ? "Permiso de ubicación denegado. Actívalo para encontrar droguerías cerca."
                : "No pude obtener tu ubicación. Revisa el GPS e inténtalo de nuevo."
            )
          ),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function buscar(q: string) {
    setCargando(true);
    setActivo(null);
    try {
      let c = coords;
      if (!c) {
        setEstado("Obteniendo tu ubicación…");
        c = await obtenerUbicacion();
        setCoords(c);
      }
      setEstado("Buscando droguerías cerca de ti…");
      const rs = await buscarDroguerias(c.lat, c.lng, q || undefined);
      setResultados(rs);
      if (rs.length === 0) {
        const m = "No encontré droguerías con ese criterio cerca de ti.";
        setEstado(m);
        hablar(m);
      } else {
        const top = rs[0];
        setEstado(`${rs.length} droguería(s) encontrada(s).`);
        hablar(
          `La más cercana es ${top.nombre}, a ${distanciaHabla(top.distancia_m)}` +
            (top.direccion ? `, en ${top.direccion}.` : ".")
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error buscando droguerías.";
      setEstado(msg);
      hablar(msg);
    } finally {
      setCargando(false);
    }
  }

  function onMic() {
    setEstado("Escuchando…");
    escuchar(
      (t) => {
        setTexto(t);
        buscar(t);
      },
      (err) => setEstado(err),
      (s) => setEstado(s)
    );
  }

  // Al tocar una tarjeta: centra el mapa y dicta razón social, dirección y metros.
  function seleccionar(i: number) {
    setActivo(i);
    const d = resultados[i];
    const partes = [d.razon_social || d.nombre];
    if (d.direccion) partes.push(`en ${d.direccion}`);
    partes.push(`a ${d.distancia_m} metros`);
    hablar(partes.join(", ") + ".");
  }

  return (
    <>
      <div className="card">
        <div className="mic-row">
          <button
            className={`mic-btn${escuchando ? " on" : ""}`}
            onClick={onMic}
            disabled={!soportado || escuchando || cargando}
            aria-label="Hablar"
          >
            🎤
          </button>
          <div style={{ flex: 1 }}>
            <p className="estado">{cargando ? <><span className="spinner" /> {estado}</> : estado}</p>
            {texto && <p className="escuchado">{texto}</p>}
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <input
            className="input"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar(texto.trim())}
            placeholder='escribe: "Cafam", "Cruz Verde"…'
          />
          <button className="btn" onClick={() => buscar(texto.trim())} disabled={cargando}>
            Buscar
          </button>
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 12 }}
          onClick={() => {
            setTexto("");
            buscar("");
          }}
          disabled={cargando}
        >
          📍 Droguerías cerca de mí
        </button>
      </div>

      {(coords || resultados.length > 0) && (
        <div className="card" style={{ padding: 8 }}>
          <Mapa
            centro={coords}
            puntos={resultados.map((d) => ({
              lat: d.lat,
              lng: d.lng,
              nombre: d.nombre,
              distancia_m: d.distancia_m,
            }))}
            activo={activo}
          />
        </div>
      )}

      {resultados.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {resultados.map((d, i) => (
            <div
              key={`${d.lat}-${d.lng}-${i}`}
              className={`result-card${i === 0 ? " first" : ""}`}
              onClick={() => seleccionar(i)}
              title="Tocar para oír la dirección y distancia"
            >
              <div className="result-top">
                <p className="result-name">{d.nombre}</p>
                <span className="badge">{distanciaTexto(d.distancia_m)}</span>
              </div>
              {d.razon_social && d.razon_social !== d.nombre && (
                <p className="result-sub">🏢 {d.razon_social}</p>
              )}
              {d.direccion && <p className="result-sub">📌 {d.direccion}</p>}
              {d.horario && <p className="result-sub">🕒 {d.horario}</p>}
              <div className="result-actions">
                <a href={mapsUrl(d)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  Cómo llegar →
                </a>
                {d.telefono && (
                  <a href={`tel:${d.telefono}`} onClick={(e) => e.stopPropagation()}>
                    Llamar
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!soportado && (
        <p className="hint" style={{ color: "var(--danger)" }}>
          Tu navegador no soporta reconocimiento de voz. Usa Chrome/Android, o escribe arriba.
        </p>
      )}
    </>
  );
}
