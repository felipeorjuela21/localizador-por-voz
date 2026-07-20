import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Punto {
  lat: number;
  lng: number;
  nombre: string;
  distancia_m: number;
}

// Pines con emoji (divIcon) para no depender de imágenes de marcador de Leaflet.
const iconoDrogueria = L.divIcon({
  className: "pin", html: "💊", iconSize: [26, 26], iconAnchor: [13, 26],
});
const iconoYo = L.divIcon({
  className: "pin", html: "📍", iconSize: [26, 26], iconAnchor: [13, 26],
});

function distTexto(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export function Mapa({
  centro,
  puntos,
  activo,
}: {
  centro: { lat: number; lng: number } | null;
  puntos: Punto[];
  activo: number | null;
}) {
  const contRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<L.Marker[]>([]);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!contRef.current || mapRef.current) return;
    const map = L.map(contRef.current, { zoomControl: true }).setView(
      [centro?.lat ?? 4.65, centro?.lng ?? -74.1],
      14
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redibuja marcadores cuando cambian ubicación o resultados.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    marcadoresRef.current.forEach((m) => m.remove());
    marcadoresRef.current = [];

    if (centro) {
      const yo = L.marker([centro.lat, centro.lng], { icon: iconoYo }).addTo(map);
      yo.bindPopup("Estás aquí");
      marcadoresRef.current.push(yo);
    }
    puntos.forEach((p) => {
      const mk = L.marker([p.lat, p.lng], { icon: iconoDrogueria }).addTo(map);
      mk.bindPopup(`<b>${p.nombre}</b><br>${distTexto(p.distancia_m)}`);
      marcadoresRef.current.push(mk);
    });

    const coords: L.LatLngExpression[] = [];
    if (centro) coords.push([centro.lat, centro.lng]);
    puntos.forEach((p) => coords.push([p.lat, p.lng]));
    if (coords.length) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 });
    }
    // Leaflet a veces necesita recalcular tamaño al montarse en un contenedor nuevo.
    setTimeout(() => map.invalidateSize(), 100);
  }, [centro, puntos]);

  // Al seleccionar un resultado de la lista, centra y abre su popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || activo == null || !puntos[activo]) return;
    const p = puntos[activo];
    map.setView([p.lat, p.lng], 16);
    marcadoresRef.current[centro ? activo + 1 : activo]?.openPopup();
  }, [activo, centro, puntos]);

  return <div ref={contRef} className="mapa" />;
}
