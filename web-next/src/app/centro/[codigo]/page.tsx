import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Award } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CalculadoraRuta } from "@/components/CalculadoraRuta";
import { MapaGoogleEmbed } from "@/components/MapaGoogleEmbed";
import { Reseñas } from "@/components/Reseñas";
import { TabsCentro, type Centro as TabsCentroData } from "./TabsCentro";
import { createServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

type Params = Promise<{ codigo: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { codigo } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("centros")
    .select("nombre, municipio, tipo")
    .eq("codigo", codigo)
    .maybeSingle();
  if (!data) return { title: "Centro no encontrado" };
  return {
    title: `${data.nombre} · ${data.municipio} | Centros CM`,
    description: `${data.tipo ?? "Centro educativo"} en ${data.municipio}. Consulta vacantes históricas (22/23–25/26) y tiempo de desplazamiento.`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const { codigo } = await params;
  const supabase = await createServerClient();

  const { data: c } = await supabase
    .from("centros")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!c) notFound();

  const v = (c.vacantes as Record<string, number>) ?? {};
  const v2526 = (v.c2526Rh09 ?? 0) + (v.c2526AnexoI ?? 0) + (v.c2526AnexoVia ?? 0);
  const total =
    (v.c2223 ?? 0) + (v.c2324 ?? 0) + (v.c2425 ?? 0) + v2526;

  const hasExcelencia = c.programas_excelencia && Object.values(c.programas_excelencia as Record<string, boolean>).some(Boolean);

  return (
    <>
      <Header />
      <main className="container py-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-madrid-600 hover:text-madrid-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al buscador
        </Link>

        {/* Hero */}
        <div className="rounded-2xl border border-ink-200 bg-gradient-to-b from-madrid-50 to-white p-6 shadow-soft mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {c.dat && <Badge color="madrid">{c.dat}</Badge>}
            {c.tipo && <Badge color="ink">{c.tipo}</Badge>}
            {c.titularidad && c.titularidad !== "PÚBLICO" && (
              <Badge color="amber">{c.titularidad}</Badge>
            )}
            {c.bilingue && (
              <Badge color="blue">
                Bilingüe
                {c.idiomas_bilingue?.length
                  ? ` · ${(c.idiomas_bilingue as string[]).join(", ")}`
                  : ""}
              </Badge>
            )}
            {hasExcelencia && (
              <Badge color="gold">
                <Award className="h-3 w-3 mr-1" />
                Excelencia
              </Badge>
            )}
            {c.jornada && <Badge color="ink">{c.jornada}</Badge>}
          </div>

          <h1 className="font-display text-3xl font-bold text-ink-900">
            {c.nombre}
          </h1>
          <p className="mt-1 font-mono text-xs text-ink-500">{c.codigo}</p>

          {c.denominacion_generica && (
            <p className="mt-2 text-sm text-ink-600">{c.denominacion_generica}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Columna de info */}
          <div className="lg:col-span-3 space-y-5">
            {/* Tabs */}
            <TabsCentro
              c={c as unknown as TabsCentroData}
              v={v}
              total={total}
              v2526={v2526}
            />

            {/* Calculadora de ruta */}
            {c.lat != null && c.lng != null && (
              <CalculadoraRuta
                destLat={c.lat as number}
                destLng={c.lng as number}
              />
            )}

            {/* Reseñas */}
            <Reseñas centroCodigo={codigo} />
          </div>

          {/* Columna de mapa */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-xl border border-ink-200 bg-white overflow-hidden shadow-soft">
              {c.lat != null && c.lng != null ? (
                <MapaGoogleEmbed
                  lat={c.lat as number}
                  lng={c.lng as number}
                  nombre={c.nombre as string}
                  direccion={c.direccion}
                  height={420}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-ink-500 p-6 text-center">
                  Coordenadas no disponibles para este centro
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({
  color,
  children,
}: {
  color: "madrid" | "ink" | "blue" | "amber" | "gold";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        color === "madrid" && "bg-madrid-50 text-madrid-700 ring-1 ring-madrid-200",
        color === "ink" && "bg-ink-100 text-ink-700",
        color === "blue" && "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        color === "amber" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        color === "gold" && "bg-amber-50 text-amber-700 ring-1 ring-amber-300"
      )}
    >
      {children}
    </span>
  );
}
