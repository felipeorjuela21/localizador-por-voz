import type { Producto } from "../lib/api";

const ROWS = 5;
const COLS = 6;

export function Grid({
  productos,
  estante,
  seleccion,
  onCeldaClick,
}: {
  productos: Producto[];
  estante: number | null;
  seleccion: Producto | null;
  onCeldaClick: (fila: number, columna: number, producto: Producto | null) => void;
}) {
  // Producto ubicado en (estante mostrado, fila, columna), o null si la casilla está vacía.
  const enCelda = (fila: number, columna: number): Producto | null =>
    productos.find(
      (p) => p.estante === estante && p.fila === fila && p.columna === columna
    ) ?? null;

  const celdas = [];
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const prod = enCelda(r, c);
      const seleccionada = !!prod && !!seleccion && prod.id === seleccion.id;

      // Vacía por defecto; azul si hay producto; ámbar si es el resultado de la búsqueda.
      let fondo = "#faf9f5";
      let color = "#999";
      let contenido = `${r}·${c}`;
      if (seleccionada) {
        fondo = "#EF9F27";
        color = "#412402";
        contenido = "✓";
      } else if (prod) {
        fondo = "#e6f1fb";
        color = "#185fa5";
        contenido = prod.nombre.slice(0, 3);
      }

      celdas.push(
        <button
          key={`${r}-${c}`}
          onClick={() => onCeldaClick(r, c, prod)}
          title={prod ? `${prod.nombre} ${prod.presentacion}`.trim() : "Vacía"}
          style={{
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
            border: "1px solid #e2e2dc",
            background: fondo,
            color,
            fontWeight: seleccionada || prod ? 600 : 400,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          {contenido}
        </button>
      );
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
        Estante <strong>{estante ?? "—"}</strong>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 6 }}>
        {celdas}
      </div>
    </div>
  );
}
