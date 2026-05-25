"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { geocodificar, type GeoResult } from "@/lib/geocode";
import { cn } from "@/lib/utils";

export type Origen = GeoResult;

interface Props {
  origen: Origen | null;
  radio: number;
  onOrigen: (o: Origen | null) => void;
  onRadio: (km: number) => void;
}

const RADIOS = [1, 3, 5, 10];

export function FiltroProximidad({ origen, radio, onOrigen, onRadio }: Props) {
  const [texto, setTexto] = useState(origen?.label ?? "");
  const [sugerencias, setSugerencias] = useState<GeoResult[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buscar = useCallback((val: string) => {
    setTexto(val);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await geocodificar(val);
        setSugerencias(res);
        setAbierto(res.length > 0);
        if (res.length === 0) setError("Sin resultados. Prueba a ser más específico.");
      } catch {
        setSugerencias([]);
        setError("Error al buscar la dirección.");
      } finally {
        setBuscando(false);
      }
    }, 500);
  }, []);

  const seleccionar = (g: GeoResult) => {
    onOrigen(g);
    setTexto(g.label);
    setAbierto(false);
    setSugerencias([]);
  };

  const limpiar = () => {
    onOrigen(null);
    setTexto("");
    setSugerencias([]);
    setAbierto(false);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={containerRef}>
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          value={texto}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder="Cerca de… (dirección, calle, plaza)"
          className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-8 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
        />
        {buscando && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-ink-400" />
        )}
        {!buscando && (origen || texto) && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:bg-madrid-50 hover:text-madrid-600"
            aria-label="Quitar filtro de cercanía"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {abierto && sugerencias.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg">
            {sugerencias.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => seleccionar(s)}
                  className="w-full px-3 py-2 text-left text-sm text-ink-800 hover:bg-madrid-50"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && !abierto && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {origen && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">
            Radio
          </span>
          {RADIOS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => onRadio(km)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                radio === km
                  ? "bg-madrid-600 text-white"
                  : "bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-madrid-400"
              )}
            >
              {km} km
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
