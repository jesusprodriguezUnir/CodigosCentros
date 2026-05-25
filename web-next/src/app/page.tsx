import { Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CentrosClient } from "./CentrosClient";
import { createServerClient } from "@/lib/supabase/server";
import type { Centro, Municipio } from "@/lib/types";

export const revalidate = 3600; // ISR: revalidar cada hora

type SupabaseCentro = {
  codigo: string;
  nombre: string;
  municipio: string;
  distrito: string | null;
  dat: string | null;
  tipo: string | null;
  titularidad: string | null;
  jornada: string | null;
  bilingue: boolean | null;
  idiomas_bilingue: string[] | null;
  etapa: string[] | null;
  vacantes: Record<string, number> | null;
  updated_at: string | null;
  lat: number | null;
  lng: number | null;
};

function mapCentro(row: SupabaseCentro): Centro {
  const v = row.vacantes ?? {};
  const vacantes = {
    c2223: v.c2223 ?? 0,
    c2324: v.c2324 ?? 0,
    c2425: v.c2425 ?? 0,
    c2526Rh09: v.c2526Rh09 ?? 0,
    c2526AnexoI: v.c2526AnexoI ?? 0,
    c2526AnexoVia: v.c2526AnexoVia ?? 0,
  };
  const total =
    vacantes.c2223 +
    vacantes.c2324 +
    vacantes.c2425 +
    vacantes.c2526Rh09 +
    vacantes.c2526AnexoI +
    vacantes.c2526AnexoVia;
  return {
    codigo: row.codigo,
    centro: row.nombre,
    localidad: row.municipio ?? "",
    distrito: row.distrito ?? undefined,
    vacantes,
    total,
    dat: row.dat ?? undefined,
    tipo: row.tipo ?? undefined,
    titularidad: row.titularidad ?? undefined,
    jornada: row.jornada ?? undefined,
    bilingue: row.bilingue ?? undefined,
    idiomas_bilingue: row.idiomas_bilingue ?? undefined,
    etapa: row.etapa ?? undefined,
    updated_at: row.updated_at ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}

export default async function Page() {
  const supabase = await createServerClient();

  // Supabase PostgREST tiene max-rows=1000; paginamos para obtener todos
  const SELECT_FIELDS =
    "codigo, nombre, municipio, distrito, dat, tipo, titularidad, jornada, bilingue, idiomas_bilingue, etapa, vacantes, updated_at, lat, lng";
  const PAGE_SIZE = 1000;
  let allRows: SupabaseCentro[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from("centros")
      .select(SELECT_FIELDS)
      .not("vacantes", "is", null)
      .order("municipio", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data as SupabaseCentro[]);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const { data: lastVersion } = await supabase
    .from("data_versions")
    .select("applied_at")
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const centros: Centro[] = allRows.map(mapCentro);

  // Municipios únicos con conteo
  const municipioMap = new Map<string, number>();
  for (const c of centros) {
    if (c.localidad) {
      municipioMap.set(c.localidad, (municipioMap.get(c.localidad) ?? 0) + 1);
    }
  }
  const municipios: Municipio[] = Array.from(municipioMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([nombre, count]) => ({ nombre, centros: count }));

  // Métricas
  const totalVacantes2526 = centros.reduce(
    (acc, c) =>
      acc + c.vacantes.c2526Rh09 + c.vacantes.c2526AnexoI + c.vacantes.c2526AnexoVia,
    0
  );
  const totalVacantesHistorico = centros.reduce((acc, c) => acc + c.total, 0);

  // Frescura: última versión de datos o updated_at más reciente de centros
  const updatedAt =
    lastVersion?.applied_at ??
    (centros.length > 0
      ? centros.reduce((a, b) =>
          (a.updated_at ?? "") > (b.updated_at ?? "") ? a : b
        ).updated_at ?? null
      : null);

  return (
    <>
      <Header updatedAt={updatedAt} />
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
      </main>
      <CentrosClient
        centros={centros}
        municipios={municipios}
        totalVacantes2526={totalVacantes2526}
        totalVacantesHistorico={totalVacantesHistorico}
      />
      <Footer />
    </>
  );
}

