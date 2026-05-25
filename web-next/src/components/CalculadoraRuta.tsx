"use client";

import { useState, useCallback, useRef } from "react";
import { Navigation, Car, Clock, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface Props {
  destLat: number;
  destLng: number;
}

interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

interface RouteResult {
  duracion: number; // segundos
  distancia: number; // metros
}

async function geocodificar(texto: string): Promise<GeoResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${texto}, Madrid, España`);
  url.searchParams.set("lang", "es");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Error al geocodificar");
  const json = await res.json();

  return (json.features ?? []).map((f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
    label: [f.properties.name, f.properties.street, f.properties.housenumber, f.properties.city]
      .filter(Boolean)
      .join(", "),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }));
}

async function calcularRutaCoche(
  origenLat: number,
  origenLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origenLng},${origenLat};${destLng},${destLat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al calcular ruta");
  const json = await res.json();
  if (!json.routes?.length) throw new Error("No se encontró ruta");
  return {
    duracion: json.routes[0].duration,
    distancia: json.routes[0].distance,
  };
}

function formatDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function formatDistancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toFixed(1)} km`;
  return `${Math.round(metros)} m`;
}

export function CalculadoraRuta({ destLat, destLng }: Props) {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<GeoResult[]>([]);
  const [origenSel, setOrigenSel] = useState<GeoResult | null>(null);
  const [resultado, setResultado] = useState<RouteResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  const googleMapsUrlTransit = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=transit`;

  const buscarSugerencias = useCallback((val: string) => {
    setTexto(val);
    setOrigenSel(null);
    setResultado(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSugerencias([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscandoDir(true);
      try {
        const res = await geocodificar(val);
        setSugerencias(res.length > 0 ? res : []);
        if (res.length === 0) setError("No se encontraron direcciones. Prueba a ser más específico.");
      } catch {
        setSugerencias([]);
        setError("Error al buscar la dirección.");
      } finally {
        setBuscandoDir(false);
      }
    }, 500);
  }, []);

  const seleccionarOrigen = useCallback(async (g: GeoResult) => {
    setOrigenSel(g);
    setTexto(g.label);
    setSugerencias([]);
    setCargando(true);
    setError(null);
    try {
      const r = await calcularRutaCoche(g.lat, g.lng, destLat, destLng);
      setResultado(r);
    } catch {
      setError("No se pudo calcular la ruta. Usa Google Maps como alternativa.");
    } finally {
      setCargando(false);
    }
  }, [destLat, destLng]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <Navigation className="h-5 w-5 text-madrid-600" />
        <h2 className="font-display text-lg font-bold text-ink-900">¿Cómo llegar?</h2>
      </div>

      {/* Input de origen */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={texto}
              onChange={(e) => buscarSugerencias(e.target.value)}
              placeholder="Escribe tu dirección de origen…"
              className="w-full rounded-lg border border-ink-200 bg-white py-2.5 px-3 pr-8 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
            />
            {buscandoDir && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-ink-400" />
            )}
          </div>
        </div>

        {sugerencias.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-lg divide-y divide-ink-50 max-h-48 overflow-auto">
            {sugerencias.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => seleccionarOrigen(s)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-madrid-50 text-ink-800"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Estado de carga */}
      {cargando && (
        <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando ruta…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Resultado de ruta */}
      {resultado && origenSel && !cargando && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${origenSel.lat},${origenSel.lng}&destination=${destLat},${destLng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-madrid-50 border border-madrid-100 p-3 flex items-center gap-2 hover:bg-madrid-100 transition-colors"
          >
            <Car className="h-5 w-5 text-madrid-600 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-madrid-600">En coche</p>
              <p className="font-display text-lg font-bold text-ink-900">
                {formatDuracion(resultado.duracion)}
              </p>
              <p className="text-xs text-ink-500">{formatDistancia(resultado.distancia)}</p>
            </div>
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${origenSel.lat},${origenSel.lng}&destination=${destLat},${destLng}&travelmode=transit`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-ink-50 border border-ink-100 p-3 flex items-center gap-2 hover:bg-ink-100 transition-colors"
          >
            <Clock className="h-5 w-5 text-ink-400 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">Transporte público</p>
              <p className="text-xs text-ink-500 mt-0.5">Ver en Google Maps</p>
            </div>
          </a>
        </div>
      )}

      {/* Accesos directos a Google Maps */}
      <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-ink-100">
        <p className="w-full text-xs text-ink-400 mb-1">Abrir directamente en:</p>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-madrid-400 hover:text-madrid-700 transition-colors"
        >
          <Car className="h-3.5 w-3.5" />
          Google Maps (coche)
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
        <a
          href={googleMapsUrlTransit}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-madrid-400 hover:text-madrid-700 transition-colors"
        >
          <Clock className="h-3.5 w-3.5" />
          Google Maps (transporte)
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>
    </div>
  );
}
