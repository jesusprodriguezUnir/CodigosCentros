import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CalculadoraRuta } from "@/components/CalculadoraRuta";
import { MapaCentro } from "@/components/MapaCentroWrapper";
import { Reseñas } from "@/components/Reseñas";
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

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Columna de info */}
          <div className="lg:col-span-3 space-y-5">
            {/* Cabecera */}
            <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-soft">
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
                {c.jornada && <Badge color="ink">{c.jornada}</Badge>}
              </div>

              <h1 className="font-display text-2xl font-bold text-ink-900">
                {c.nombre}
              </h1>
              <p className="mt-1 font-mono text-sm text-ink-500">{c.codigo}</p>

              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                {c.municipio && (
                  <Info
                    icon={<MapPin className="h-4 w-4" />}
                    label="Municipio"
                    value={
                      c.direccion
                        ? `${c.direccion}${c.cp ? `, ${c.cp}` : ""} — ${c.municipio}`
                        : c.municipio
                    }
                  />
                )}
                {c.telefono && c.telefono !== "0" && (
                  <Info
                    icon={<Phone className="h-4 w-4" />}
                    label="Teléfono"
                    value={c.telefono}
                    link={`tel:${c.telefono}`}
                  />
                )}
                {c.email && (
                  <Info
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={c.email}
                    link={`mailto:${c.email}`}
                  />
                )}
              </dl>

              {/* Links oficiales */}
              <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-ink-100">
                <a
                  href={`https://gestiona.madrid.org/wpad_pub/run/j/MostrarFichaCentro.icm?cdCentro=${c.codigo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-madrid-50 border border-madrid-200 px-3 py-2 text-xs font-semibold text-madrid-700 hover:bg-madrid-100 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ficha oficial · Comunidad de Madrid
                </a>
                {c.lat != null && c.lng != null && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Ver en Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Historial de vacantes */}
            {c.vacantes && (
              <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-soft">
                <h2 className="font-display text-lg font-bold text-ink-900 mb-4">
                  Historial de vacantes
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100">
                        <th className="pb-2 text-left font-semibold text-ink-600">
                          Curso
                        </th>
                        <th className="pb-2 text-right font-semibold text-ink-600">
                          Vacantes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      <FilaVacante label="22/23" valor={v.c2223 ?? 0} />
                      <FilaVacante label="23/24" valor={v.c2324 ?? 0} />
                      <FilaVacante label="24/25" valor={v.c2425 ?? 0} />
                      <FilaVacante
                        label="25/26 · RH09"
                        valor={v.c2526Rh09 ?? 0}
                        sublabel
                      />
                      <FilaVacante
                        label="25/26 · Anexo I"
                        valor={v.c2526AnexoI ?? 0}
                        sublabel
                      />
                      <FilaVacante
                        label="25/26 · Anexo VI.a"
                        valor={v.c2526AnexoVia ?? 0}
                        sublabel
                      />
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-ink-200">
                        <td className="pt-3 text-left font-bold text-ink-900">
                          Total histórico
                        </td>
                        <td className="pt-3 text-right font-bold text-madrid-700 text-base">
                          {total}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Calculadora de ruta */}
            {c.lat != null && c.lng != null && (
              <CalculadoraRuta
                destLat={c.lat as number}
                destLng={c.lng as number}
                nombreCentro={c.nombre as string}
              />
            )}

            {/* Reseñas */}
            <Reseñas centroCodigo={codigo} />
          </div>

          {/* Columna de mapa */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-xl border border-ink-200 bg-white overflow-hidden shadow-soft">
              {c.lat != null && c.lng != null ? (
                <MapaCentro
                  lat={c.lat as number}
                  lng={c.lng as number}
                  nombre={c.nombre as string}
                  height={420}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-ink-500 p-6 text-center">
                  Coordenadas no disponibles para este centro
                </div>
              )}
              <div className="p-4 border-t border-ink-100">
                <p className="text-xs text-ink-500">
                  © OpenStreetMap contributors
                </p>
              </div>
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
  color: "madrid" | "ink" | "blue" | "amber";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        color === "madrid" && "bg-madrid-50 text-madrid-700 ring-1 ring-madrid-200",
        color === "ink" && "bg-ink-100 text-ink-700",
        color === "blue" && "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        color === "amber" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      )}
    >
      {children}
    </span>
  );
}

function Info({
  icon,
  label,
  value,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  link?: string;
}) {
  const content = (
    <div className="flex items-start gap-2 text-ink-700">
      <span className="mt-0.5 text-ink-400 shrink-0">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </p>
        <p className="mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  );
  if (link) {
    return (
      <a href={link} className="hover:text-madrid-600 transition-colors">
        {content}
      </a>
    );
  }
  return content;
}

function FilaVacante({
  label,
  valor,
  sublabel = false,
}: {
  label: string;
  valor: number;
  sublabel?: boolean;
}) {
  return (
    <tr>
      <td
        className={cn(
          "py-2 text-left",
          sublabel ? "pl-4 text-ink-500" : "text-ink-700 font-medium"
        )}
      >
        {label}
      </td>
      <td className="py-2 text-right tabular-nums">
        <span
          className={cn(
            "inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold",
            valor > 0
              ? "bg-madrid-50 text-madrid-700"
              : "bg-ink-100 text-ink-500"
          )}
        >
          {valor}
        </span>
      </td>
    </tr>
  );
}
