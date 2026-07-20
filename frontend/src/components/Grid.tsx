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
  const enCelda = (fila: number, columna: number): Producto | null =>
    productos.find((p) => p.estante === estante && p.fila === fila && p.columna === columna) ?? null;

  const celdas = [];
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const prod = enCelda(r, c);
      const seleccionada = !!prod && !!seleccion && prod.id === seleccion.id;
      const clase = seleccionada ? "grid-cell sel" : prod ? "grid-cell has" : "grid-cell";
      const contenido = seleccionada ? "✓" : prod ? prod.nombre.slice(0, 3) : `${r}·${c}`;
      celdas.push(
        <button
          key={`${r}-${c}`}
          className={clase}
          onClick={() => onCeldaClick(r, c, prod)}
          title={prod ? `${prod.nombre} ${prod.presentacion}`.trim() : "Vacía"}
        >
          {contenido}
        </button>
      );
    }
  }

  return (
    <div>
      <p className="hint" style={{ margin: "0 0 8px" }}>
        Estante <strong style={{ color: "var(--text)" }}>{estante ?? "—"}</strong>
      </p>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {celdas}
      </div>
    </div>
  );
}
