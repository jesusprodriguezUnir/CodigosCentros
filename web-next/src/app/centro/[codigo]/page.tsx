import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Phone, Mail, ExternalLink, Globe, Printer, Award, Languages, Bus, Clock, Utensils, Bed, Building2, GraduationCap } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CalculadoraRuta } from "@/components/CalculadoraRuta";
import { MapaGoogleEmbed } from "@/components/MapaGoogleEmbed";
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
            <Tabs
              c={c}
              v={v}
              total={total}
              v2526={v2526}
            />

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

// ─── Tabs component ──────────────────────────────────────────────────────────

function Tabs({
  c,
  v,
  total,
  v2526,
}: {
  c: Record<string, unknown>;
  v: Record<string, number>;
  total: number;
  v2526: number;
}) {
  const centro = c as {
    nombre: string;
    codigo: string;
    municipio: string | null;
    distrito: string | null;
    barrio: string | null;
    direccion: string | null;
    cp: string | null;
    telefono: string | null;
    email: string | null;
    web: string | null;
    fax: string | null;
    titular: string | null;
    titularidad: string | null;
    tipo: string | null;
    bilingue: boolean | null;
    idiomas_bilingue: string[] | null;
    jornada: string | null;
    etapa: string[] | null;
    servicios: Record<string, boolean> | null;
    integracion_preferente: Record<string, boolean> | null;
    opciones_linguisticas: Record<string, boolean> | null;
    programas_excelencia: Record<string, boolean> | null;
    adscripciones: Array<{
      curso_origen: string;
      curso_destino: string;
      codigo_destino: string;
      nombre_destino: string;
      municipio_destino: string;
      bilingue_destino: boolean;
    }> | null;
  };

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "vacantes", label: "Vacantes" },
    { id: "servicios", label: "Servicios & Programas" },
    { id: "comunidad", label: "Comunidad" },
  ];

  return (
    <div className="rounded-xl border border-ink-200 bg-white shadow-soft overflow-hidden">
      <div className="flex border-b border-ink-100 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            data-tab={tab.id}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
              i === 0
                ? "text-madrid-700 border-madrid-600 bg-madrid-50/50"
                : "text-ink-600 border-transparent hover:text-ink-800"
            )}
            onClick={(e) => {
              const target = (e.target as HTMLElement).getAttribute("data-tab");
              if (!target) return;
              const parent = (e.target as HTMLElement).closest(".rounded-xl");
              if (!parent) return;
              parent.querySelectorAll("[data-tab]").forEach((btn) => {
                const b = btn as HTMLElement;
                b.className = "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap text-ink-600 border-transparent hover:text-ink-800";
              });
              (e.target as HTMLElement).className = "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap text-madrid-700 border-madrid-600 bg-madrid-50/50";
              parent.querySelectorAll("[data-panel]").forEach((panel) => {
                (panel as HTMLElement).classList.add("hidden");
              });
              const panel = parent.querySelector(`[data-panel="${target}"]`);
              if (panel) panel.classList.remove("hidden");
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel: Resumen */}
      <div data-panel="resumen" className="p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm mb-6">
          {centro.municipio && (
            <Info
              icon={<MapPin className="h-4 w-4" />}
              label="Municipio"
              value={
                (centro.direccion
                  ? `${centro.direccion}${centro.cp ? `, ${centro.cp}` : ""} — ${centro.municipio}`
                  : centro.municipio) +
                (centro.municipio === "Madrid" && centro.distrito
                  ? ` · Distrito ${centro.distrito}`
                  : "")
              }
            />
          )}
          {centro.barrio && (
            <Info
              icon={<MapPin className="h-4 w-4" />}
              label="Barrio"
              value={centro.barrio}
            />
          )}
          {centro.telefono && centro.telefono !== "0" && (
            <Info
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={centro.telefono}
              link={`tel:${centro.telefono}`}
            />
          )}
          {centro.email && (
            <Info
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={centro.email}
              link={`mailto:${centro.email}`}
            />
          )}
          {centro.fax && (
            <Info
              icon={<Printer className="h-4 w-4" />}
              label="Fax"
              value={centro.fax}
            />
          )}
          {centro.web && (
            <Info
              icon={<Globe className="h-4 w-4" />}
              label="Web"
              value={centro.web}
              link={centro.web.startsWith("http") ? centro.web : `https://${centro.web}`}
            />
          )}
          {centro.titular && (
            <Info
              icon={<Building2 className="h-4 w-4" />}
              label="Titular"
              value={centro.titular}
            />
          )}
          {centro.titularidad && (
            <Info
              icon={<GraduationCap className="h-4 w-4" />}
              label="Titularidad"
              value={centro.titularidad}
            />
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <KpiCard label="Vacantes 25/26" value={v2526} accent="madrid" />
          <KpiCard label="Total histórico" value={total} accent="ink" />
        </div>

        {/* Links oficiales */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-ink-100">
          <a
            href={`https://gestiona.madrid.org/wpad_pub/run/j/MostrarFichaCentro.icm?cdCentro=${centro.codigo}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-madrid-50 border border-madrid-200 px-3 py-2 text-xs font-semibold text-madrid-700 hover:bg-madrid-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ficha oficial
          </a>
          {centro.web && (
            <a
              href={centro.web.startsWith("http") ? centro.web : `https://${centro.web}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              Web del centro
            </a>
          )}
        </div>

        {/* Adscripciones */}
        {centro.adscripciones && centro.adscripciones.length > 0 && (
          <div className="mt-6 pt-4 border-t border-ink-100">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Adscripciones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink-100">
                    <th className="pb-2 text-left font-semibold text-ink-600">Origen</th>
                    <th className="pb-2 text-left font-semibold text-ink-600">Destino</th>
                    <th className="pb-2 text-left font-semibold text-ink-600">Municipio</th>
                    <th className="pb-2 text-center font-semibold text-ink-600">Bilingüe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {centro.adscripciones.map((ad, i) => (
                    <tr key={i}>
                      <td className="py-2 text-ink-700">{ad.curso_origen} → {ad.curso_destino}</td>
                      <td className="py-2 text-ink-700">{ad.nombre_destino}</td>
                      <td className="py-2 text-ink-500">{ad.municipio_destino}</td>
                      <td className="py-2 text-center">
                        {ad.bilingue_destino ? (
                          <span className="inline-flex rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold">Sí</span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Panel: Vacantes */}
      <div data-panel="vacantes" className="p-6 hidden">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">
          Historial de vacantes
        </h2>
        <div className="space-y-3">
          <FilaVacanteBar label="22/23" valor={v.c2223 ?? 0} maxVal={Math.max(v.c2223 ?? 0, v.c2324 ?? 0, v.c2425 ?? 0, v2526, 1)} />
          <FilaVacanteBar label="23/24" valor={v.c2324 ?? 0} maxVal={Math.max(v.c2223 ?? 0, v.c2324 ?? 0, v.c2425 ?? 0, v2526, 1)} />
          <FilaVacanteBar label="24/25" valor={v.c2425 ?? 0} maxVal={Math.max(v.c2223 ?? 0, v.c2324 ?? 0, v.c2425 ?? 0, v2526, 1)} />
          <FilaVacanteBar label="25/26" valor={v2526} maxVal={Math.max(v.c2223 ?? 0, v.c2324 ?? 0, v.c2425 ?? 0, v2526, 1)} />
        </div>
        <div className="mt-6 pt-4 border-t border-ink-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="pb-2 text-left font-semibold text-ink-600">Curso</th>
                <th className="pb-2 text-right font-semibold text-ink-600">Vacantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              <FilaVacante label="22/23" valor={v.c2223 ?? 0} />
              <FilaVacante label="23/24" valor={v.c2324 ?? 0} />
              <FilaVacante label="24/25" valor={v.c2425 ?? 0} />
              <FilaVacante label="25/26 · RH09" valor={v.c2526Rh09 ?? 0} sublabel />
              <FilaVacante label="25/26 · Anexo I" valor={v.c2526AnexoI ?? 0} sublabel />
              <FilaVacante label="25/26 · Anexo VI.a" valor={v.c2526AnexoVia ?? 0} sublabel />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200">
                <td className="pt-3 text-left font-bold text-ink-900">Total histórico</td>
                <td className="pt-3 text-right font-bold text-madrid-700 text-base tabular-nums">
                  {total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Panel: Servicios & Programas */}
      <div data-panel="servicios" className="p-6 hidden">
        {centro.servicios && Object.values(centro.servicios).some(Boolean) && (
          <div className="mb-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Servicios complementarios</h3>
            <div className="flex flex-wrap gap-2">
              {centro.servicios.transporte && <Chip icon={<Bus className="h-3.5 w-3.5" />} label="Transporte" color="ink" />}
              {centro.servicios.horario_ampliado && <Chip icon={<Clock className="h-3.5 w-3.5" />} label="Horario ampliado" color="ink" />}
              {centro.servicios.comedor && <Chip icon={<Utensils className="h-3.5 w-3.5" />} label="Comedor" color="ink" />}
              {centro.servicios.residencia && <Chip icon={<Bed className="h-3.5 w-3.5" />} label="Residencia" color="ink" />}
            </div>
          </div>
        )}

        {centro.integracion_preferente && Object.values(centro.integracion_preferente).some(Boolean) && (
          <div className="mb-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Integración preferente</h3>
            <div className="flex flex-wrap gap-2">
              {centro.integracion_preferente.auditivos && <Chip label="Auditivos" color="blue" />}
              {centro.integracion_preferente.motoricos && <Chip label="Motóricos" color="blue" />}
              {centro.integracion_preferente.tgd_tea && <Chip label="TGD/TEA" color="blue" />}
            </div>
          </div>
        )}

        {centro.opciones_linguisticas && Object.values(centro.opciones_linguisticas).some(Boolean) && (
          <div className="mb-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Opciones lingüísticas</h3>
            <div className="flex flex-wrap gap-2">
              {(centro.opciones_linguisticas.bilingue_es_en || centro.opciones_linguisticas.british_council) && (
                <Chip icon={<Languages className="h-3.5 w-3.5" />} label="Bilingüe Inglés" color="blue" />
              )}
              {centro.opciones_linguisticas.seccion_frances && (
                <Chip icon={<Languages className="h-3.5 w-3.5" />} label="Sección Francés" color="blue" />
              )}
              {centro.opciones_linguisticas.seccion_aleman && (
                <Chip icon={<Languages className="h-3.5 w-3.5" />} label="Sección Alemán" color="blue" />
              )}
            </div>
          </div>
        )}

        {centro.programas_excelencia && Object.values(centro.programas_excelencia).some(Boolean) && (
          <div className="mb-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Programas de excelencia</h3>
            <div className="flex flex-wrap gap-2">
              {centro.programas_excelencia.centro_excelencia && <Chip icon={<Award className="h-3.5 w-3.5" />} label="Centro de excelencia" color="gold" />}
              {centro.programas_excelencia.aula_excelencia && <Chip icon={<Award className="h-3.5 w-3.5" />} label="Aula de excelencia" color="gold" />}
              {centro.programas_excelencia.innovacion_tecnologica && <Chip icon={<Award className="h-3.5 w-3.5" />} label="Innovación tecnológica" color="gold" />}
              {centro.programas_excelencia.innovacion_desarrollo && <Chip icon={<Award className="h-3.5 w-3.5" />} label="Innovación y desarrollo" color="gold" />}
            </div>
          </div>
        )}

        {centro.etapa && centro.etapa.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Etapa educativa</h3>
            <div className="flex flex-wrap gap-2">
              {centro.etapa.map((e: string) => (
                <Chip key={e} label={e} color="ink" />
              ))}
            </div>
          </div>
        )}

        {centro.jornada && (
          <div className="mb-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">Jornada</h3>
            <Chip label={centro.jornada} color="ink" />
          </div>
        )}
      </div>

      {/* Panel: Comunidad */}
      <div data-panel="comunidad" className="hidden">
        <div className="p-6">
          <p className="text-sm text-ink-600">Calculadora de ruta y reseñas más abajo.</p>
        </div>
      </div>
    </div>
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

function FilaVacanteBar({
  label,
  valor,
  maxVal,
}: {
  label: string;
  valor: number;
  maxVal: number;
}) {
  const pct = maxVal > 0 ? (valor / maxVal) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-ink-600 font-medium">{label}</span>
      <div className="flex-1 bg-ink-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-full bg-madrid-200 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-sm text-right tabular-nums font-semibold text-ink-900">{valor}</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "madrid" | "ink";
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4 text-center",
      accent === "madrid" ? "border-madrid-200 bg-madrid-50" : "border-ink-200 bg-ink-50"
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className={cn(
        "mt-1 text-3xl font-bold tabular-nums",
        accent === "madrid" ? "text-madrid-700" : "text-ink-900"
      )}>
        {value}
      </p>
    </div>
  );
}

function Chip({
  icon,
  label,
  color = "ink",
}: {
  icon?: React.ReactNode;
  label: string;
  color?: "ink" | "blue" | "gold";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        color === "ink" && "bg-ink-100 text-ink-700",
        color === "blue" && "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        color === "gold" && "bg-amber-50 text-amber-700 ring-1 ring-amber-300"
      )}
    >
      {icon}
      {label}
    </span>
  );
}
