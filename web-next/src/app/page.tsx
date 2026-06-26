import { Building2, Gauge, Sparkles, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StatPill } from "@/components/StatPill";
import { StatCard } from "@/components/StatCard";
import { CentrosClient } from "./CentrosClient";
import { createServerClient } from "@/lib/supabase/server";
import type { Centro, Municipio } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { scorePresionVacantes, vacantes2526 } from "@/lib/centroMetrics";

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
  programas_excelencia: Record<string, boolean> | null;
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
    programas_excelencia: row.programas_excelencia ?? undefined,
  };
}

export default async function Page() {
  const supabase = await createServerClient();

  // Supabase PostgREST tiene max-rows=1000; paginamos para obtener todos
  const SELECT_FIELDS =
    "codigo, nombre, municipio, distrito, dat, tipo, titularidad, jornada, bilingue, idiomas_bilingue, etapa, vacantes, updated_at, lat, lng, programas_excelencia";
  const PAGE_SIZE = 1000;
  let allRows: SupabaseCentro[] = [];
  let page = 0;
  let fetchError = false;
  while (true) {
    const { data, error } = await supabase
      .from("centros")
      .select(SELECT_FIELDS)
      .not("vacantes", "is", null)
      .order("municipio", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) { fetchError = true; break; }
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
    (acc, c) => acc + vacantes2526(c.vacantes),
    0
  );
  const totalVacantesHistorico = centros.reduce((acc, c) => acc + c.total, 0);
  const totalVacantes2425 = centros.reduce((acc, c) => acc + c.vacantes.c2425, 0);
  const centrosConVacantes2526 = centros.filter((c) => vacantes2526(c.vacantes) > 0).length;
  const variacionVs2425 = totalVacantes2526 - totalVacantes2425;
  const mediaScorePresion =
    centros.length > 0
      ? Math.round(
          centros.reduce((acc, c) => acc + scorePresionVacantes(c), 0) / centros.length
        )
      : 0;
  const topMunicipios = Array.from(
    centros.reduce((acc, c) => {
      const actual = acc.get(c.localidad) ?? { centros: 0, vacantes2526: 0 };
      actual.centros += 1;
      actual.vacantes2526 += vacantes2526(c.vacantes);
      acc.set(c.localidad, actual);
      return acc;
    }, new Map<string, { centros: number; vacantes2526: number }>())
  )
    .sort((a, b) => b[1].vacantes2526 - a[1].vacantes2526)
    .slice(0, 5);

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
      <div className="border-b border-ink-200 bg-gradient-to-b from-madrid-50/60 to-white">
        <div className="container py-6 md:py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-madrid-700 ring-1 ring-madrid-200">
                <Sparkles className="h-3.5 w-3.5" />
                Curso 2025/2026
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink-900 md:text-4xl">
                Vacantes en centros educativos públicos
              </h1>
              <p className="mt-2 text-sm text-ink-600 md:text-base">
                Filtra por municipio, jornada, bilingüe o por cercanía a tu dirección.
                Encuentra el centro adecuado y consulta el histórico de vacantes desde
                el curso 22/23.
              </p>
              <p className="mt-2 text-xs text-ink-400">
                {formatNumber(municipios.length)} municipios · {formatNumber(centros.length)} centros
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <StatPill label="Centros" value={centros.length} />
              <StatPill label="Vacantes 25/26" value={totalVacantes2526} accent="madrid" />
              <StatPill label="Histórico" value={totalVacantesHistorico} />
            </div>
          </div>
        </div>
      </div>
      <section className="container py-5 md:py-7">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Building2}
            label="Centros con vacantes 25/26"
            value={centrosConVacantes2526}
            hint={`${formatNumber(centros.length - centrosConVacantes2526)} sin vacantes`}
          />
          <StatCard
            icon={TrendingUp}
            label="Variación 25/26 vs 24/25"
            value={variacionVs2425}
            hint="Diferencia agregada entre cursos"
            accent="madrid"
          />
          <StatCard
            icon={Gauge}
            label="Score medio de presión"
            value={mediaScorePresion}
            hint="Prioriza demanda reciente de vacantes"
          />
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Top municipios por vacantes 25/26
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {topMunicipios.map(([municipio, data], index) => (
                <div key={municipio} className="flex items-center justify-between gap-2">
                  <p className="truncate text-ink-700">
                    <span className="mr-1 text-ink-400">{index + 1}.</span>
                    {municipio}
                  </p>
                  <p className="shrink-0 font-semibold tabular-nums text-madrid-700">
                    {formatNumber(data.vacantes2526)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {fetchError ? (
        <main className="container py-16 text-center">
          <p className="text-ink-500 mb-2">No se pudieron cargar los datos de los centros.</p>
          <p className="text-sm text-ink-400">Inténtalo de nuevo más tarde o contacta con soporte si el problema persiste.</p>
        </main>
      ) : centros.length === 0 ? (
        <main className="container py-16 text-center">
          <p className="text-ink-500 mb-2">No hay centros disponibles en este momento.</p>
          <p className="text-sm text-ink-400">Los datos pueden estar en proceso de actualización.</p>
        </main>
      ) : (
        <CentrosClient centros={centros} municipios={municipios} />
      )}
      <Footer />
    </>
  );
}
