"use client";

import { useMemo, useState, useEffect } from "react";
import { Building2, MapPin, ListChecks } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Filtros, type Orden } from "@/components/Filtros";
import { TablaCentros } from "@/components/TablaCentros";
import type { Centro, Municipio } from "@/lib/types";
import { normalizar, sortEs } from "@/lib/utils";
import { getSearchIndexSync, loadSearchIndex } from "@/lib/searchIndex";
import Fuse from "fuse.js";

interface Props {
  centros: Centro[];
  municipios: Municipio[];
  totalVacantes2526: number;
  totalVacantesHistorico: number;
}

export function CentrosClient({
  centros,
  municipios,
  totalVacantes2526,
  totalVacantesHistorico,
}: Props) {
  const [texto, setTexto] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [distrito, setDistrito] = useState("");
  const [tipo, setTipo] = useState("");
  const [bilingue, setBilingue] = useState(false);
  const [orden, setOrden] = useState<Orden>("totalDesc");

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

  const [fuseCentros, setFuseCentros] = useState<Fuse<Centro> | null>(null);

  useEffect(() => {
    const fuse = new Fuse(centros, {
      keys: ["centro", "localidad", "codigo"],
      threshold: 0.35,
      ignoreLocation: true,
    });
    setFuseCentros(fuse);
  }, [centros]);

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
    <main className="container py-8">
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Centros"
          value={centros.length}
          hint="con datos en algún curso"
          accent="madrid"
        />
        <StatCard
          icon={MapPin}
          label="Municipios"
          value={municipios.length}
          hint="de la Comunidad de Madrid"
        />
        <StatCard
          icon={ListChecks}
          label="Vacantes 25/26"
          value={totalVacantes2526}
          hint="RH09 + Anexo I + Anexo VI.a"
          accent="madrid"
        />
        <StatCard
          icon={ListChecks}
          label="Histórico acumulado"
          value={totalVacantesHistorico}
          hint="cursos 22/23 → 25/26"
        />
      </section>

      <div className="mb-6">
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
