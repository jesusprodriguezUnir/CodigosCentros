"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  X,
  Cloud,
  CloudOff,
  LogIn,
  Navigation,
  MapPin,
} from "lucide-react";
import { useConcursilloStore } from "@/lib/store/concursillo";
import type { Centro } from "@/lib/types";
import { cn, normalizar, formatNumber, haversineKm } from "@/lib/utils";
import { syncListaToCloud, loadListaFromCloud } from "@/lib/concursilloSync";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Props {
  centros: Centro[];
}

// ─── Valores únicos para los selectores ──────────────────────────────────────
function unique(arr: (string | undefined | null)[]): string[] {
  return Array.from(new Set(arr.filter(Boolean) as string[])).sort();
}

// ─── Export Excel vía SheetJS ─────────────────────────────────────────────────
async function exportarExcel(lista: Centro[]) {
  const { utils, writeFile } = await import("xlsx");
  const filas = lista.map((c, i) => ({
    Posicion: i + 1,
    Codigo: c.codigo,
    Centro: c.centro,
    Municipio: c.localidad,
    Distrito: c.distrito ?? "",
    DAT: c.dat ?? "",
    Tipo: c.tipo ?? "",
    Jornada: c.jornada ?? "",
    Bilingue: c.bilingue ? "Sí" : "No",
    Vacantes_2526:
      (c.vacantes.c2526Rh09 ?? 0) +
      (c.vacantes.c2526AnexoI ?? 0) +
      (c.vacantes.c2526AnexoVia ?? 0),
    Total_historico: c.total,
  }));
  const ws = utils.json_to_sheet(filas);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Mi lista de centros");
  writeFile(wb, "mi-lista-centros.xlsx");
}

// ─── Export PDF vía window.print ──────────────────────────────────────────────
function exportarPDF(lista: Centro[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const filas = lista.map((c, i) => {
    const v2526 = (c.vacantes.c2526Rh09 ?? 0) + (c.vacantes.c2526AnexoI ?? 0) + (c.vacantes.c2526AnexoVia ?? 0);
    const muni = c.localidad + (c.localidad === "Madrid" && c.distrito ? " · " + c.distrito : "");
    return "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      '<td style="font-family: monospace;">' + c.codigo + "</td>" +
      "<td>" + c.centro + "</td>" +
      "<td>" + muni + "</td>" +
      "<td>" + (c.tipo ?? "\u2014") + "</td>" +
      '<td class="num"><span class="v">' + v2526 + "</span></td>" +
      '<td class="num">' + c.total + "</td>" +
      "</tr>";
  }).join("\n");
  const html = [
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">',
    "<title>Mi lista de centros</title>",
    "<style>",
    "body{font-family:system-ui,sans-serif;padding:2rem;color:#1f2333}",
    "h1{font-size:1.25rem;margin-bottom:.5rem}",
    "p{color:#647391;font-size:.875rem;margin-bottom:1.5rem}",
    "table{width:100%;border-collapse:collapse;font-size:.8125rem}",
    "th{text-align:left;padding:.5rem;background:#f6f7f9;border-bottom:2px solid #d5dae3;font-weight:600}",
    "td{padding:.5rem;border-bottom:1px solid #eceef3}",
    ".num{text-align:right;font-variant-numeric:tabular-nums}",
    ".v{background:#fef2f3;color:#c8102e;font-weight:600;padding:.125rem .375rem;border-radius:4px;font-size:.75rem}",
    "@media print{body{padding:1rem}}",
    "</style></head><body>",
    "<h1>Mi lista de centros</h1>",
    "<p>" + lista.length + " centros · " + new Date().toLocaleDateString("es-ES") + "</p>",
    "<table><thead><tr>",
    "<th>N\u00ba</th><th>C\u00f3digo</th><th>Centro</th><th>Municipio</th><th>Tipo</th>",
    '<th class="num">Vac. 25/26</th><th class="num">Total</th>',
    "</tr></thead><tbody>",
    filas,
    "</tbody></table>",
    "<script>window.print();window.close();<" + "/script>",
    "</body></html>",
  ].join("");
  win.document.write(html);
  win.document.close();
}

// ─── Componente item de la lista "Mi orden" (sortable) ───────────────────────
function ItemOrden({
  centro,
  posicion,
  total,
}: {
  centro: Centro;
  posicion: number;
  total: number;
}) {
  const { removeCentro, moverArriba, moverAbajo, setOrden, origen } =
    useConcursilloStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: centro.codigo });
  const [editPos, setEditPos] = useState(false);
  const [posInput, setPosInput] = useState(String(posicion));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const v2526 =
    (centro.vacantes.c2526Rh09 ?? 0) +
    (centro.vacantes.c2526AnexoI ?? 0) +
    (centro.vacantes.c2526AnexoVia ?? 0);

  const distancia = useMemo(() => {
    if (!origen || centro.lat == null || centro.lng == null) return null;
    return haversineKm(origen.lat, origen.lng, centro.lat, centro.lng);
  }, [origen, centro.lat, centro.lng]);

  const handleSetPos = () => {
    const n = parseInt(posInput, 10);
    if (!isNaN(n)) setOrden(centro.codigo, n);
    setEditPos(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-white p-3 text-sm transition-shadow",
        isDragging ? "shadow-lg border-madrid-300 z-50" : "border-ink-200 shadow-soft"
      )}
    >
      {/* Drag handle — desktop */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 hidden cursor-grab touch-none text-ink-300 hover:text-ink-500 md:block"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Nº de orden en círculo */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          onClick={() => moverArriba(centro.codigo)}
          className="text-ink-400 hover:text-madrid-600 disabled:opacity-30"
          disabled={posicion === 1}
          aria-label="Subir"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        {editPos ? (
          <input
            type="number"
            value={posInput}
            min={1}
            max={total}
            onChange={(e) => setPosInput(e.target.value)}
            onBlur={handleSetPos}
            onKeyDown={(e) => e.key === "Enter" && handleSetPos()}
            className="w-10 rounded border border-madrid-400 text-center text-xs font-bold text-madrid-700 focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setPosInput(String(posicion)); setEditPos(true); }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors",
              posicion <= 5
                ? "bg-madrid-600 text-white"
                : "bg-ink-100 text-ink-700"
            )}
            title="Pulsa para cambiar posición"
          >
            {posicion}
          </button>
        )}
        <button
          onClick={() => moverAbajo(centro.codigo)}
          className="text-ink-400 hover:text-madrid-600 disabled:opacity-30"
          disabled={posicion === total}
          aria-label="Bajar"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/centro/${centro.codigo}`}
              className="font-medium text-ink-900 hover:text-madrid-600 transition-colors"
              target="_blank"
            >
              {centro.centro}
            </Link>
            <p className="text-xs text-ink-500">
              <span className="font-mono">{centro.codigo}</span>
              {" · "}{centro.localidad}
              {centro.localidad === "Madrid" && centro.distrito
                ? ` · ${centro.distrito}`
                : ""}{" "}
              · {centro.dat ?? "Sin DAT"}
              {distancia != null && (
                <span className="ml-1.5 text-ink-400">
                  · {distancia < 1 ? Math.round(distancia * 1000) + " m" : distancia.toFixed(1) + " km"}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => removeCentro(centro.codigo)}
            className="shrink-0 text-ink-300 hover:text-red-500 transition-colors"
            aria-label="Quitar del orden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {centro.tipo && (
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">
              {centro.tipo}
            </span>
          )}
          {v2526 > 0 && (
            <span className="rounded bg-madrid-50 px-1.5 py-0.5 text-[11px] font-semibold text-madrid-700">
              {v2526} vac. 25/26
            </span>
          )}
          {centro.bilingue && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">
              Bilingüe
            </span>
          )}
          {centro.jornada && (
            <span className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-500">
              {centro.jornada}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente item de "Disponibles" ─────────────────────────────────────────
function ItemDisponible({ centro }: { centro: Centro }) {
  const { addCentro, miOrden } = useConcursilloStore();
  const enLista = miOrden.some((x) => x.codigo === centro.codigo);
  const v2526 =
    (centro.vacantes.c2526Rh09 ?? 0) +
    (centro.vacantes.c2526AnexoI ?? 0) +
    (centro.vacantes.c2526AnexoVia ?? 0);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-ink-100 bg-white p-3 text-sm hover:border-madrid-200 hover:bg-madrid-50/30 transition-colors">
      <div className="min-w-0 flex-1">
        <Link
          href={`/centro/${centro.codigo}`}
          className="font-medium text-ink-900 hover:text-madrid-600 transition-colors"
          target="_blank"
        >
          {centro.centro}
        </Link>
        <p className="text-xs text-ink-500">
          {centro.localidad}
          {centro.localidad === "Madrid" && centro.distrito
            ? ` · ${centro.distrito}`
            : ""}{" "}
          · {centro.dat ?? "—"}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {centro.tipo && (
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">
              {centro.tipo}
            </span>
          )}
          {v2526 > 0 && (
            <span className="rounded bg-madrid-50 px-1.5 py-0.5 text-[11px] font-semibold text-madrid-700">
              {v2526} vac.
            </span>
          )}
          {centro.bilingue && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">
              Bilingüe
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => !enLista && addCentro(centro)}
        disabled={enLista}
        className={cn(
          "shrink-0 rounded-full p-1.5 transition-colors",
          enLista
            ? "text-ink-300 cursor-default"
            : "text-madrid-600 hover:bg-madrid-100"
        )}
        aria-label={enLista ? "Ya en tu lista" : "Añadir a mi lista"}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ListaCentrosClient({ centros }: Props) {
  const { miOrden, filtros, setFiltros, reorderCentro, clearLista, setMiOrden } =
    useConcursilloStore();

  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Cargar usuario y lista de la nube al montar
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user && miOrden.length === 0) {
        const cloudLista = await loadListaFromCloud();
        if (cloudLista && cloudLista.length > 0) setMiOrden(cloudLista);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    if (!user) {
      window.location.href = "/login?next=/lista-centros";
      return;
    }
    setSyncStatus("saving");
    const ok = await syncListaToCloud(miOrden);
    setSyncStatus(ok ? "saved" : "error");
    setTimeout(() => setSyncStatus("idle"), 3000);
  };

  const dats = unique(centros.map((c) => c.dat));
  const tipos = unique(centros.map((c) => c.tipo));
  const jornadas = unique(centros.map((c) => c.jornada));

  const municipios = useMemo(
    () => unique(centros.map((c) => c.localidad)),
    [centros]
  );

  // Distritos de Madrid capital — derivados de los datos
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

  const mostrarDistrito = filtros.municipio === "Madrid" && distritos.length > 0;

  // Centros filtrados para el panel "Disponibles"
  const disponibles = useMemo(() => {
    const t = normalizar(filtros.texto.trim());
    return centros.filter((c) => {
      if (filtros.dat && c.dat !== filtros.dat) return false;
      if (filtros.tipo && c.tipo !== filtros.tipo) return false;
      if (filtros.jornada && c.jornada !== filtros.jornada) return false;
      if (filtros.soloBilingue && !c.bilingue) return false;
      if (filtros.soloConVacantes) {
        const v2526 =
          (c.vacantes.c2526Rh09 ?? 0) +
          (c.vacantes.c2526AnexoI ?? 0) +
          (c.vacantes.c2526AnexoVia ?? 0);
        if (v2526 === 0) return false;
      }
      if (filtros.municipio && c.localidad !== filtros.municipio) return false;
      if (
        filtros.municipio === "Madrid" &&
        filtros.distrito &&
        c.distrito !== filtros.distrito
      )
        return false;
      if (
        t &&
        !normalizar(c.centro).includes(t) &&
        !normalizar(c.localidad).includes(t) &&
        !c.codigo.includes(t)
      )
        return false;
      return true;
    });
  }, [centros, filtros]);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromIdx = miOrden.findIndex((x) => x.codigo === active.id);
      const toIdx = miOrden.findIndex((x) => x.codigo === over.id);
      if (fromIdx >= 0 && toIdx >= 0) reorderCentro(fromIdx, toIdx);
    },
    [miOrden, reorderCentro]
  );

  // Al cambiar municipio: si ya no es Madrid, limpiar distrito
  const handleMunicipioChange = (v: string) => {
    if (v !== "Madrid") {
      setFiltros({ municipio: v, distrito: "" });
    } else {
      setFiltros({ municipio: v });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* ── Panel filtros ── */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-soft">
          <h2 className="font-display font-bold text-ink-900 mb-3 text-sm uppercase tracking-wider">
            Filtros
          </h2>

          <div className="space-y-3 text-sm">
            <FiltroInput
              label="Buscar centro"
              value={filtros.texto}
              onChange={(v) => setFiltros({ texto: v })}
              placeholder="Nombre o código…"
            />

            <FiltroSelect
              label="DAT"
              value={filtros.dat}
              options={dats}
              onChange={(v) => setFiltros({ dat: v })}
            />

            <FiltroSelect
              label="Tipo"
              value={filtros.tipo}
              options={tipos}
              onChange={(v) => setFiltros({ tipo: v })}
            />

            <FiltroSelect
              label="Jornada"
              value={filtros.jornada}
              options={jornadas}
              onChange={(v) => setFiltros({ jornada: v })}
            />

            <FiltroSelect
              label="Municipio"
              value={filtros.municipio}
              options={municipios}
              onChange={handleMunicipioChange}
            />

            {mostrarDistrito && (
              <FiltroSelect
                label="Distrito de Madrid"
                value={filtros.distrito}
                options={distritos}
                onChange={(v) => setFiltros({ distrito: v })}
              />
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.soloConVacantes}
                onChange={(e) => setFiltros({ soloConVacantes: e.target.checked })}
                className="accent-madrid-600"
              />
              <span>Solo con vacantes 25/26</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.soloBilingue}
                onChange={(e) => setFiltros({ soloBilingue: e.target.checked })}
                className="accent-madrid-600"
              />
              <span>Solo bilingües</span>
            </label>

            <button
              type="button"
              onClick={() =>
                setFiltros({
                  texto: "",
                  dat: "",
                  tipo: "",
                  jornada: "",
                  soloConVacantes: true,
                  soloBilingue: false,
                  municipio: "",
                  distrito: "",
                })
              }
              className="text-xs text-madrid-600 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <p className="px-1 text-xs text-ink-500">
          {formatNumber(disponibles.length)} centros coinciden
        </p>
      </aside>

      {/* ── Panel Disponibles ── */}
      <section className="lg:col-span-5 flex flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink-900">
            Disponibles{" "}
            <span className="text-sm font-normal text-ink-500">
              ({formatNumber(disponibles.length)})
            </span>
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-2 pr-1">
          {disponibles.slice(0, 200).map((c) => (
            <ItemDisponible key={c.codigo} centro={c} />
          ))}
          {disponibles.length > 200 && (
            <p className="text-center text-xs text-ink-500 py-2">
              Mostrando los primeros 200. Refina los filtros para ver más.
            </p>
          )}
          {disponibles.length === 0 && (
            <p className="text-center py-12 text-sm text-ink-500">
              No hay centros que coincidan con los filtros.
            </p>
          )}
        </div>
      </section>

      {/* ── Panel Mi Orden ── */}
      <section className="lg:col-span-4 flex flex-col">
        {/* Origen selector */}
        <div className="mb-2">
          <OrigenSelector />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink-900">
            Mi orden{" "}
            <span className="text-sm font-normal text-ink-500">
              ({miOrden.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {miOrden.length > 0 && (
              <>
                <button
                  onClick={() => exportarPDF(miOrden)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 transition-colors shadow-soft"
                  title="Exportar PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => exportarExcel(miOrden)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-madrid-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-madrid-700 transition-colors shadow-soft"
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncStatus === "saving"}
                  title={user ? "Guardar en mi cuenta" : "Inicia sesión para guardar"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shadow-soft",
                    syncStatus === "saved"
                      ? "bg-green-100 text-green-700"
                      : syncStatus === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                  )}
                >
                  {syncStatus === "saving" ? (
                    <Cloud className="h-3.5 w-3.5 animate-pulse" />
                  ) : syncStatus === "saved" ? (
                    <Cloud className="h-3.5 w-3.5" />
                  ) : user ? (
                    <Cloud className="h-3.5 w-3.5" />
                  ) : (
                    <LogIn className="h-3.5 w-3.5" />
                  )}
                  {syncStatus === "saved"
                    ? "Guardado"
                    : syncStatus === "error"
                    ? "Error"
                    : user
                    ? "Guardar"
                    : "Acceder"}
                </button>
                <button
                  onClick={clearLista}
                  className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-red-500 transition-colors"
                  title="Vaciar lista"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-2 pr-1">
          {miOrden.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-ink-500 rounded-xl border-2 border-dashed border-ink-200">
              <Plus className="h-8 w-8 mb-2 text-ink-300" />
              <p>Pulsa + en un centro para añadirlo aquí</p>
              <p className="text-xs mt-1 text-ink-400">
                Arrastra para reordenar · Pulsa el número para cambiar posición
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={miOrden.map((c) => c.codigo)}
                strategy={verticalListSortingStrategy}
              >
                {miOrden.map((c, i) => (
                  <ItemOrden
                    key={c.codigo}
                    centro={c}
                    posicion={i + 1}
                    total={miOrden.length}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── OrigenSelector ────────────────────────────────────────────────────────────
function OrigenSelector() {
  const { origen, setOrigen } = useConcursilloStore();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<
    Array<{ label: string; lat: number; lng: number }>
  >([]);
  const [buscando, setBuscando] = useState(false);

  const buscarSugerencias = useCallback(async (val: string) => {
    setTexto(val);
    if (val.length < 3) {
      setSugerencias([]);
      return;
    }
    setBuscando(true);
    try {
      const url =
        "https://photon.komoot.io/api/?q=" +
        encodeURIComponent(val + ", Madrid, España") +
        "&lang=es&limit=5";
      const res = await fetch(url);
      const json = await res.json();
      const items = (json.features ?? []).map(
        (f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
          label: [f.properties.name, f.properties.street, f.properties.housenumber, f.properties.city]
            .filter(Boolean)
            .join(", "),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        })
      );
      setSugerencias(items);
    } catch {
      setSugerencias([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const seleccionar = (item: { label: string; lat: number; lng: number }) => {
    setOrigen({ label: item.label, lat: item.lat, lng: item.lng });
    setTexto(item.label);
    setSugerencias([]);
    setEditando(false);
  };

  if (!editando && origen) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-ink-50 border border-ink-200 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-ink-700">
          <Navigation className="h-4 w-4 text-madrid-600" />
          <span className="text-xs text-ink-500">Origen:</span>{" "}
          <span className="font-medium">{origen.label}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditando(true);
            setTexto(origen.label);
          }}
          className="text-xs text-madrid-600 hover:underline"
        >
          Cambiar origen
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg bg-ink-50 border border-ink-200 px-3 py-2">
      <div className="flex items-center gap-2">
        <Navigation className="h-4 w-4 text-madrid-600 shrink-0" />
        <input
          type="text"
          value={texto}
          onChange={(e) => buscarSugerencias(e.target.value)}
          placeholder="Escribe un origen para calcular distancias…"
          className="flex-1 bg-transparent text-sm placeholder:text-ink-400 focus:outline-none"
        />
        {buscando && <span className="text-xs text-ink-400">Buscando…</span>}
      </div>
      {sugerencias.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-ink-200 rounded-lg shadow-lg">
          {sugerencias.map((s, i) => (
            <button
              key={i}
              onClick={() => seleccionar(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-madrid-50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers de filtro ────────────────────────────────────────────────────────
function FiltroInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-ink-200 py-1.5 px-2.5 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
      />
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-ink-200 bg-white py-1.5 px-2.5 text-sm focus:border-madrid-600 focus:outline-none focus:ring-2 focus:ring-madrid-600/15"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
