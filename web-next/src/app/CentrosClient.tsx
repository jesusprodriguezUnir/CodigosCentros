"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Filtros, type Orden } from "@/components/Filtros";
import { TablaCentros } from "@/components/TablaCentros";
import type { Centro, Municipio } from "@/lib/types";
import { haversineKm, normalizar, sortEs } from "@/lib/utils";
import type { Origen } from "@/components/FiltroProximidad";
import Fuse from "fuse.js";

interface Props {
  centros: Centro[];
  municipios: Municipio[];
}

export type CentroConDist = Centro & { distanciaKm?: number };

function CentrosClientInner({ centros, municipios }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialized = useRef(false);

  const [texto, setTexto] = useState(searchParams.get("q") ?? "");
  const [municipio, setMunicipio] = useState(searchParams.get("m") ?? "");
  const [distrito, setDistrito] = useState(searchParams.get("d") ?? "");
  const [tipo, setTipo] = useState(searchParams.get("t") ?? "");
  const [jornada, setJornada] = useState(searchParams.get("j") ?? "");
  const [bilingue, setBilingue] = useState(searchParams.get("b") === "1");
  const [excelencia, setExcelencia] = useState(searchParams.get("e") === "1");
  const [orden, setOrden] = useState<Orden>(
    (searchParams.get("o") as Orden) ?? "totalDesc"
  );

  // Origen del filtro de proximidad
  const initialOrigen: Origen | null = (() => {
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    const label = searchParams.get("og") ?? "";
    if (Number.isFinite(lat) && Number.isFinite(lng) && label) {
      return { lat, lng, label };
    }
    return null;
  })();
  const [origen, setOrigen] = useState<Origen | null>(initialOrigen);
  const initialRadio = parseInt(searchParams.get("r") ?? "5", 10);
  const [radio, setRadio] = useState<number>(
    Number.isFinite(initialRadio) && initialRadio > 0 ? initialRadio : 5
  );

  useEffect(() => {
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const params = new URLSearchParams();
    if (texto) params.set("q", texto);
    if (municipio) params.set("m", municipio);
    if (distrito) params.set("d", distrito);
    if (tipo) params.set("t", tipo);
    if (jornada) params.set("j", jornada);
    if (bilingue) params.set("b", "1");
    if (excelencia) params.set("e", "1");
    if (orden !== "totalDesc") params.set("o", orden);
    if (origen) {
      params.set("lat", origen.lat.toFixed(6));
      params.set("lng", origen.lng.toFixed(6));
      params.set("og", origen.label);
      if (radio !== 5) params.set("r", String(radio));
    }
    const qs = params.toString();
    router.replace(qs ? "?" + qs : window.location.pathname, { scroll: false });
  }, [texto, municipio, distrito, tipo, jornada, bilingue, excelencia, orden, origen, radio, router]);

  const handleOrigen = (o: Origen | null) => {
    setOrigen(o);
    // Auto-ajuste de orden: si activamos cercanía y el orden es el default,
    // pasar a distancia ascendente. Al limpiar, volver a totalDesc si seguía distAsc.
    if (o && orden === "totalDesc") setOrden("distAsc");
    if (!o && orden === "distAsc") setOrden("totalDesc");
  };

  const tipos = useMemo(
    () =>
      Array.from(new Set(centros.map((c) => c.tipo).filter(Boolean) as string[])).sort(),
    [centros]
  );

  const jornadas = useMemo(
    () =>
      Array.from(
        new Set(centros.map((c) => c.jornada).filter(Boolean) as string[])
      ).sort(),
    [centros]
  );

  const distritos = useMemo(
    () =>
      Array.from(
        new Set(
          centros
            .filter((c) => c.localidad === "Madrid" && c.distrito)
            .map((c) => c.distrito as string)
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [centros]
  );

  const handleMunicipio = (v: string) => {
    setMunicipio(v);
    if (v !== "Madrid") setDistrito("");
  };

  const fuseCentros = useMemo(
    () =>
      new Fuse(centros, {
        keys: ["centro", "localidad", "codigo"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [centros]
  );

  const filtrados: CentroConDist[] = useMemo(() => {
    const t = normalizar(texto.trim());
    const m = municipio;
    let result: CentroConDist[] = centros;
    if (m) result = result.filter((c) => c.localidad === m);
    if (m === "Madrid" && distrito) result = result.filter((c) => c.distrito === distrito);
    if (tipo) result = result.filter((c) => c.tipo === tipo);
    if (jornada) result = result.filter((c) => c.jornada === jornada);
    if (bilingue) result = result.filter((c) => c.bilingue === true);
    if (excelencia) {
      result = result.filter((c) => {
        const p = c.programas_excelencia;
        return p && (p.centro_excelencia || p.aula_excelencia || p.innovacion_tecnologica || p.innovacion_desarrollo);
      });
    }
    if (t && fuseCentros) {
      const fuseResults = fuseCentros.search(t);
      const fuseCodes = new Set(fuseResults.map((r) => r.item.codigo));
      result = result.filter((c) => fuseCodes.has(c.codigo));
    }

    if (origen) {
      result = result
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({
          ...c,
          distanciaKm: haversineKm(c.lat as number, c.lng as number, origen.lat, origen.lng),
        }))
        .filter((c) => (c.distanciaKm ?? Infinity) <= radio);
    }

    const v2526 = (c: Centro) =>
      (c.vacantes.c2526Rh09 ?? 0) +
      (c.vacantes.c2526AnexoI ?? 0) +
      (c.vacantes.c2526AnexoVia ?? 0);

    const sorted = [...result];
    switch (orden) {
      case "totalDesc":
        sorted.sort((a, b) => b.total - a.total);
        break;
      case "totalAsc":
        sorted.sort((a, b) => a.total - b.total);
        break;
      case "v2526Desc":
        sorted.sort((a, b) => v2526(b) - v2526(a));
        break;
      case "centroAsc":
        sorted.sort((a, b) => sortEs(a.centro, b.centro));
        break;
      case "localidadAsc":
        sorted.sort(
          (a, b) => sortEs(a.localidad, b.localidad) || sortEs(a.centro, b.centro)
        );
        break;
      case "distAsc":
        sorted.sort(
          (a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity)
        );
        break;
    }
    return sorted;
  }, [
    centros,
    texto,
    municipio,
    distrito,
    tipo,
    jornada,
    bilingue,
    excelencia,
    orden,
    origen,
    radio,
    fuseCentros,
  ]);

  const limpiar = () => {
    setTexto("");
    setMunicipio("");
    setDistrito("");
    setTipo("");
    setJornada("");
    setBilingue(false);
    setExcelencia(false);
    handleOrigen(null);
  };

  return (
    <main className="container pb-8">
      <div className="mb-4">
        <Filtros
          texto={texto}
          municipio={municipio}
          distrito={distrito}
          tipo={tipo}
          jornada={jornada}
          bilingue={bilingue}
          excelencia={excelencia}
          orden={orden}
          origen={origen}
          radio={radio}
          municipios={municipios}
          distritos={distritos}
          tipos={tipos}
          jornadas={jornadas}
          resultados={filtrados.length}
          onTexto={setTexto}
          onMunicipio={handleMunicipio}
          onDistrito={setDistrito}
          onTipo={setTipo}
          onJornada={setJornada}
          onBilingue={setBilingue}
          onExcelencia={setExcelencia}
          onOrden={setOrden}
          onOrigen={handleOrigen}
          onRadio={setRadio}
          onLimpiar={limpiar}
        />
      </div>

      <TablaCentros
        centros={filtrados}
        mostrarDistancia={Boolean(origen)}
        onLimpiar={limpiar}
      />
    </main>
  );
}

export function CentrosClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="container pb-8">
          <p className="py-8 text-center text-ink-500">Cargando…</p>
        </div>
      }
    >
      <CentrosClientInner {...props} />
    </Suspense>
  );
}
