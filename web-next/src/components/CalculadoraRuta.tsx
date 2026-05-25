"use client";

import { useState, useCallback, useRef } from "react";
import { Navigation, Car, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  destLat: number;
  destLng: number;
  nombreCentro: string;
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
  url.searchParams.set("q", texto);
  url.searchParams.set("lang", "es");
  url.searchParams.set("limit", "5");
  // Bounding box de la Comunidad de Madrid
  url.searchParams.set("bbox", "-4.6,39.8,-3.0,41.2");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Error al geocodificar");
  const json = await res.json();

  return (json.features ?? []).map((f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
    label: [f.properties.name, f.properties.street, f.properties.city]
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

export function CalculadoraRuta({ destLat, destLng, nombreCentro }: Props) {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<GeoResult[]>([]);
  const [origenSel, setOrigenSel] = useState<GeoResult | null>(null);
  const [resultado, setResultado] = useState<RouteResult | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTextoCambia = useCallback((val: string) => {
    setTexto(val);
    setOrigenSel(null);
    setResultado(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSugerencias([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await geocodificar(val);
        setSugerencias(res);
      } catch { setSugerencias([]); }
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
      setError("No se pudo calcular la ruta. Inténtalo de nuevo.");
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

      <div className="relative">
        <input
          type="text"
          value={texto}
          onChange={(e) => onTextoCambia(e.target.value)}
          placeholder="Escribe tu dirección de origen..."
          className="w-full rounded-lg border border-ink-200 bg-white py-2.5 px-3 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
        />
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

      {cargando && (
        <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando ruta…
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {resultado && origenSel && !cargando && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-madrid-50 border border-madrid-100 p-3 flex items-center gap-2">
            <Car className="h-5 w-5 text-madrid-600 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-madrid-600">En coche</p>
              <p className="font-display text-lg font-bold text-ink-900">
                {formatDuracion(resultado.duracion)}
              </p>
              <p className="text-xs text-ink-500">{formatDistancia(resultado.distancia)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-ink-50 border border-ink-100 p-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-ink-400 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">Transporte público</p>
              <p className="text-sm text-ink-500 mt-0.5">Próximamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
