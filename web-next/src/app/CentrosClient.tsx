"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin, ListChecks } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Filtros, type Orden } from "@/components/Filtros";
import { TablaCentros } from "@/components/TablaCentros";
import type { Centro, Municipio } from "@/lib/types";
import { normalizar, sortEs } from "@/lib/utils";

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
  const [tipo, setTipo] = useState("");
  const [bilingue, setBilingue] = useState(false);
  const [orden, setOrden] = useState<Orden>("totalDesc");

  const tipos = useMemo(
    () =>
      Array.from(new Set(centros.map((c) => c.tipo).filter(Boolean) as string[])).sort(),
    [centros]
  );

  const filtrados = useMemo(() => {
    const t = normalizar(texto.trim());
    const m = municipio;
    let result = centros;
    if (m) result = result.filter((c) => c.localidad === m);
    if (tipo) result = result.filter((c) => c.tipo === tipo);
    if (bilingue) result = result.filter((c) => c.bilingue === true);
    if (t) {
      result = result.filter(
        (c) =>
          normalizar(c.centro).includes(t) ||
          normalizar(c.localidad).includes(t) ||
          c.codigo.includes(t)
      );
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
  }, [centros, texto, municipio, orden]);

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
          tipo={tipo}
          bilingue={bilingue}
          orden={orden}
          municipios={municipios}
          tipos={tipos}
          resultados={filtrados.length}
          onTexto={setTexto}
          onMunicipio={setMunicipio}
          onTipo={setTipo}
          onBilingue={setBilingue}
          onOrden={setOrden}
          onLimpiar={() => {
            setTexto("");
            setMunicipio("");
            setTipo("");
            setBilingue(false);
          }}
        />
      </div>

      <TablaCentros centros={filtrados} />
    </main>
  );
}
