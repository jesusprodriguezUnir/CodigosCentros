"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, ListChecks, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StatCard } from "@/components/StatCard";
import { Filtros, type Orden } from "@/components/Filtros";
import { TablaCentros } from "@/components/TablaCentros";
import type { Centro, Metricas, Municipio } from "@/lib/types";
import { normalizar, sortEs } from "@/lib/utils";

export default function Page() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [texto, setTexto] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [orden, setOrden] = useState<Orden>("totalDesc");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("./data/centros.json").then((r) => r.json()),
      fetch("./data/municipios.json").then((r) => r.json()),
      fetch("./data/metricas.json").then((r) => r.json()),
    ])
      .then(([c, m, met]) => {
        setCentros(c);
        setMunicipios(m);
        setMetricas(met);
      })
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    const t = normalizar(texto.trim());
    const m = municipio;
    let result = centros;
    if (m) result = result.filter((c) => c.localidad === m);
    if (t) {
      result = result.filter(
        (c) =>
          normalizar(c.centro).includes(t) ||
          normalizar(c.localidad).includes(t) ||
          c.codigo.includes(t)
      );
    }
    const v2526 = (c: Centro) =>
      c.vacantes.c2526Rh09 + c.vacantes.c2526AnexoI + c.vacantes.c2526AnexoVia;

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
    }
    return sorted;
  }, [centros, texto, municipio, orden]);

  return (
    <>
      <Header />
      <main className="container py-8">
        <section className="mb-8 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-madrid-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-madrid-700">
            <Sparkles className="h-3.5 w-3.5" />
            Curso 2025/2026
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-ink-900 md:text-4xl">
            Vacantes en centros educativos públicos
          </h2>
          <p className="mt-3 text-ink-600">
            Consulta el histórico de vacantes adjudicadas por centro y municipio en la
            Comunidad de Madrid, desde el curso 22/23 hasta el actual.
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            label="Centros"
            value={metricas?.totalCentros ?? 0}
            hint="con datos en algún curso"
            accent="madrid"
          />
          <StatCard
            icon={MapPin}
            label="Municipios"
            value={metricas?.totalMunicipios ?? 0}
            hint="de la Comunidad de Madrid"
          />
          <StatCard
            icon={ListChecks}
            label="Vacantes 25/26"
            value={metricas?.totalVacantes2526 ?? 0}
            hint="RH09 + Anexo I + Anexo VI.a"
            accent="madrid"
          />
          <StatCard
            icon={ListChecks}
            label="Histórico acumulado"
            value={metricas?.totalVacantesHistorico ?? 0}
            hint="cursos 22/23 → 25/26"
          />
        </section>

        <div className="mb-6">
          <Filtros
            texto={texto}
            municipio={municipio}
            orden={orden}
            municipios={municipios}
            resultados={filtrados.length}
            onTexto={setTexto}
            onMunicipio={setMunicipio}
            onOrden={setOrden}
            onLimpiar={() => {
              setTexto("");
              setMunicipio("");
            }}
          />
        </div>

        {cargando ? (
          <div className="rounded-xl border border-ink-200 bg-white p-16 text-center text-ink-500 shadow-soft">
            Cargando datos…
          </div>
        ) : (
          <TablaCentros centros={filtrados} />
        )}
      </main>
      <Footer />
    </>
  );
}
