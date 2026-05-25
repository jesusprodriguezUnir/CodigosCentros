"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Filtros, type Orden } from "@/components/Filtros";
import { TablaCentros } from "@/components/TablaCentros";
import type { Centro, Municipio } from "@/lib/types";
import { normalizar, sortEs } from "@/lib/utils";
import Fuse from "fuse.js";

interface Props {
  centros: Centro[];
  municipios: Municipio[];
}

function CentrosClientInner({
  centros,
  municipios,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialized = useRef(false);

  const [texto, setTexto] = useState(searchParams.get("q") ?? "");
  const [municipio, setMunicipio] = useState(searchParams.get("m") ?? "");
  const [distrito, setDistrito] = useState(searchParams.get("d") ?? "");
  const [tipo, setTipo] = useState(searchParams.get("t") ?? "");
  const [bilingue, setBilingue] = useState(searchParams.get("b") === "1");
  const [orden, setOrden] = useState<Orden>((searchParams.get("o") as Orden) ?? "totalDesc");

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
    if (bilingue) params.set("b", "1");
    if (orden !== "totalDesc") params.set("o", orden);
    const qs = params.toString();
    router.replace(qs ? "?" + qs : window.location.pathname, { scroll: false });
  }, [texto, municipio, distrito, tipo, bilingue, orden, router]);

  const tipos = useMemo(
    () =>
      Array.from(new Set(centros.map((c) => c.tipo).filter(Boolean) as string[])).sort(),
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

  const filtrados = useMemo(() => {
    const t = normalizar(texto.trim());
    const m = municipio;
    let result = centros;
    if (m) result = result.filter((c) => c.localidad === m);
    if (m === "Madrid" && distrito) result = result.filter((c) => c.distrito === distrito);
    if (tipo) result = result.filter((c) => c.tipo === tipo);
    if (bilingue) result = result.filter((c) => c.bilingue === true);
    if (t && fuseCentros) {
      const fuseResults = fuseCentros.search(t);
      const fuseCodes = new Set(fuseResults.map((r) => r.item.codigo));
      result = result.filter((c) => fuseCodes.has(c.codigo));
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
          (a, b) =>
            sortEs(a.localidad, b.localidad) || sortEs(a.centro, b.centro)
        );
        break;
    }
    return sorted;
  }, [centros, texto, municipio, distrito, tipo, bilingue, orden, fuseCentros]);

  return (
    <main className="container pb-8">
      <div className="mb-4">
        <Filtros
          texto={texto}
          municipio={municipio}
          distrito={distrito}
          tipo={tipo}
          bilingue={bilingue}
          orden={orden}
          municipios={municipios}
          distritos={distritos}
          tipos={tipos}
          resultados={filtrados.length}
          onTexto={setTexto}
          onMunicipio={handleMunicipio}
          onDistrito={setDistrito}
          onTipo={setTipo}
          onBilingue={setBilingue}
          onOrden={setOrden}
          onLimpiar={() => {
            setTexto("");
            setMunicipio("");
            setDistrito("");
            setTipo("");
            setBilingue(false);
          }}
        />
      </div>

      <TablaCentros centros={filtrados} />
    </main>
  );
}

export function CentrosClient(props: Props) {
  return (
    <Suspense fallback={<div className="container pb-8"><p className="text-center text-ink-500 py-8">Cargando…</p></div>}>
      <CentrosClientInner {...props} />
    </Suspense>
  );
}
