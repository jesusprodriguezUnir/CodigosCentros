"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Phone, Mail, ExternalLink, Globe, Printer, Award,
  Languages, Bus, Clock, Utensils, Bed, Building2, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Centro = {
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

type Props = {
  c: Centro;
  v: Record<string, number>;
  total: number;
  v2526: number;
};

// ─── Componente principal ────────────────────────────────────────────────────

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "vacantes", label: "Vacantes" },
  { id: "servicios", label: "Servicios & Programas" },
];

export function TabsCentro({ c, v, total, v2526 }: Props) {
  const [activeTab, setActiveTab] = useState("resumen");

  const maxVal = Math.max(v.c2223 ?? 0, v.c2324 ?? 0, v.c2425 ?? 0, v2526, 1);

  return (
    <div className="rounded-xl border border-ink-200 bg-white shadow-soft overflow-hidden">
      {/* Barra de tabs */}
      <div className="flex border-b border-ink-100 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
              activeTab === tab.id
                ? "text-madrid-700 border-madrid-600 bg-madrid-50/50"
                : "text-ink-600 border-transparent hover:text-ink-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel: Resumen */}
      {activeTab === "resumen" && (
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm mb-6">
            {c.municipio && (
              <Info
                icon={<MapPin className="h-4 w-4" />}
                label="Municipio"
                value={
                  (c.direccion
                    ? `${c.direccion}${c.cp ? `, ${c.cp}` : ""} — ${c.municipio}`
                    : c.municipio) +
                  (c.municipio === "Madrid" && c.distrito
                    ? ` · Distrito ${c.distrito}`
                    : "")
                }
              />
            )}
            {c.barrio && (
              <Info icon={<MapPin className="h-4 w-4" />} label="Barrio" value={c.barrio} />
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
            {c.fax && (
              <Info icon={<Printer className="h-4 w-4" />} label="Fax" value={c.fax} />
            )}
            {c.web && (
              <Info
                icon={<Globe className="h-4 w-4" />}
                label="Web"
                value={c.web}
                link={c.web.startsWith("http") ? c.web : `https://${c.web}`}
              />
            )}
            {c.titular && (
              <Info icon={<Building2 className="h-4 w-4" />} label="Titular" value={c.titular} />
            )}
            {c.titularidad && (
              <Info
                icon={<GraduationCap className="h-4 w-4" />}
                label="Titularidad"
                value={c.titularidad}
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
              href={`https://gestiona.madrid.org/wpad_pub/run/j/MostrarFichaCentro.icm?cdCentro=${c.codigo}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-madrid-50 border border-madrid-200 px-3 py-2 text-xs font-semibold text-madrid-700 hover:bg-madrid-100 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ficha oficial
            </a>
            {c.web && (
              <a
                href={c.web.startsWith("http") ? c.web : `https://${c.web}`}
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
          {c.adscripciones && c.adscripciones.length > 0 && (
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
                    {c.adscripciones.map((ad, i) => (
                      <tr key={i}>
                        <td className="py-2 text-ink-700">{ad.curso_origen} → {ad.curso_destino}</td>
                        <td className="py-2 text-ink-700">
                          <Link
                            href={`/centro/${ad.codigo_destino}`}
                            className="hover:text-madrid-600 underline"
                          >
                            {ad.nombre_destino}
                          </Link>
                        </td>
                        <td className="py-2 text-ink-500">{ad.municipio_destino}</td>
                        <td className="py-2 text-center">
                          {ad.bilingue_destino ? (
                            <span className="inline-flex rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold">
                              Sí
                            </span>
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
      )}

      {/* Panel: Vacantes */}
      {activeTab === "vacantes" && (
        <div className="p-6">
          <h2 className="font-display text-lg font-bold text-ink-900 mb-4">
            Historial de vacantes
          </h2>
          <div className="space-y-3">
            <FilaVacanteBar label="22/23" valor={v.c2223 ?? 0} maxVal={maxVal} />
            <FilaVacanteBar label="23/24" valor={v.c2324 ?? 0} maxVal={maxVal} />
            <FilaVacanteBar label="24/25" valor={v.c2425 ?? 0} maxVal={maxVal} />
            <FilaVacanteBar label="25/26" valor={v2526} maxVal={maxVal} />
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
      )}

      {/* Panel: Servicios & Programas */}
      {activeTab === "servicios" && (
        <div className="p-6">
          {c.servicios && Object.values(c.servicios).some(Boolean) && (
            <div className="mb-6">
              <h3 className="font-semibold text-ink-900 text-sm mb-3">Servicios complementarios</h3>
              <div className="flex flex-wrap gap-2">
                {c.servicios.transporte && <Chip icon={<Bus className="h-3.5 w-3.5" />} label="Transporte" />}
                {c.servicios.horario_ampliado && <Chip icon={<Clock className="h-3.5 w-3.5" />} label="Horario ampliado" />}
                {c.servicios.comedor && <Chip icon={<Utensils className="h-3.5 w-3.5" />} label="Comedor" />}
                {c.servicios.residencia && <Chip icon={<Bed className="h-3.5 w-3.5" />} label="Residencia" />}
              </div>
            </div>
          )}

          {c.integracion_preferente && Object.values(c.integracion_preferente).some(Boolean) && (
            <div className="mb-6">
              <h3 className="font-semibold text-ink-900 text-sm mb-3">Integración preferente</h3>
              <div className="flex flex-wrap gap-2">
                {c.integracion_preferente.auditivos && <Chip label="Auditivos" color="blue" />}
                {c.integracion_preferente.motoricos && <Chip label="Motóricos" color="blue" />}
                {c.integracion_preferente.tgd_tea && <Chip label="TGD/TEA" color="blue" />}
              </div>
            </div>
          )}

          {c.opciones_linguisticas && Object.values(c.opciones_linguisticas).some(Boolean) && (
            <div className="mb-6">
              <h3 className="font-semibold text-ink-900 text-sm mb-3">Opciones lingüísticas</h3>
              <div className="flex flex-wrap gap-2">
                {(c.opciones_linguisticas.bilingue_es_en || c.opciones_linguisticas.british_council) && (
                  <Chip icon={<Languages className="h-3.5 w-3.5" />} label="Bilingüe Inglés" color="blue" />
                )}
                {c.opciones_linguisticas.seccion_frances && (
                  <Chip icon={<Languages className="h-3.5 w-3.5" />} label="Sección Francés" color="blue" />
                )}
                {c.opciones_linguisticas.seccion_aleman && (
                  <Chip icon={<Languages className="h-3.5 w-3.5" />} label="Sección Alemán" color="blue" />
                )}
              </div>
            </div>
          )}

          {c.programas_excelencia && Object.values(c.programas_excelencia).some(Boolean) && (
            <div className="mb-6">
              <h3 className="font-semibold text-ink-900 text-sm mb-3">Programas de excelencia</h3>
              <div className="flex flex-wrap gap-2">
                {c.programas_excelencia.centro_excelencia && (
                  <Chip icon={<Award className="h-3.5 w-3.5" />} label="Centro de excelencia" color="gold" />
                )}
                {c.programas_excelencia.aula_excelencia && (
                  <Chip icon={<Award className="h-3.5 w-3.5" />} label="Aula de excelencia" color="gold" />
                )}
                {c.programas_excelencia.innovacion_tecnologica && (
                  <Chip icon={<Award className="h-3.5 w-3.5" />} label="Innovación tecnológica" color="gold" />
                )}
                {c.programas_excelencia.innovacion_desarrollo && (
                  <Chip icon={<Award className="h-3.5 w-3.5" />} label="Innovación y desarrollo" color="gold" />
                )}
              </div>
            </div>
          )}

          {c.etapa && c.etapa.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-ink-900 text-sm mb-3">Etapa educativa</h3>
              <div className="flex flex-wrap gap-2">
                {c.etapa.map((e) => <Chip key={e} label={e} />)}
              </div>
            </div>
          )}

          {c.jornada && (
            <div className="mb-6">
              <h3 className="font-semibold text-ink-900 text-sm mb-3">Jornada</h3>
              <Chip label={c.jornada} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Info({
  icon, label, value, link,
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        <p className="mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  );
  if (link) return <a href={link} className="hover:text-madrid-600 transition-colors">{content}</a>;
  return content;
}

function FilaVacante({ label, valor, sublabel = false }: { label: string; valor: number; sublabel?: boolean }) {
  return (
    <tr>
      <td className={cn("py-2 text-left", sublabel ? "pl-4 text-ink-500" : "text-ink-700 font-medium")}>
        {label}
      </td>
      <td className="py-2 text-right tabular-nums">
        <span className={cn(
          "inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold",
          valor > 0 ? "bg-madrid-50 text-madrid-700" : "bg-ink-100 text-ink-500"
        )}>
          {valor}
        </span>
      </td>
    </tr>
  );
}

function FilaVacanteBar({ label, valor, maxVal }: { label: string; valor: number; maxVal: number }) {
  const pct = maxVal > 0 ? (valor / maxVal) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-ink-600 font-medium">{label}</span>
      <div className="flex-1 bg-ink-100 rounded-full h-4 overflow-hidden">
        <div className="h-full bg-madrid-200 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-sm text-right tabular-nums font-semibold text-ink-900">{valor}</span>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent: "madrid" | "ink" }) {
  return (
    <div className={cn(
      "rounded-xl border p-4 text-center",
      accent === "madrid" ? "border-madrid-200 bg-madrid-50" : "border-ink-200 bg-ink-50"
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums", accent === "madrid" ? "text-madrid-700" : "text-ink-900")}>
        {value}
      </p>
    </div>
  );
}

function Chip({ icon, label, color = "ink" }: { icon?: React.ReactNode; label: string; color?: "ink" | "blue" | "gold" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
      color === "ink" && "bg-ink-100 text-ink-700",
      color === "blue" && "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      color === "gold" && "bg-amber-50 text-amber-700 ring-1 ring-amber-300"
    )}>
      {icon}
      {label}
    </span>
  );
}
