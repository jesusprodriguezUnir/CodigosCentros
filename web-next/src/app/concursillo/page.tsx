import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase/server";
import { ConcursilloClient } from "./ConcursilloClient";
import type { Centro } from "@/lib/types";

export const metadata: Metadata = {
  title: "Concursillo · Prepara tu petición de destinos | Centros CM",
  description:
    "Ordena los centros educativos de Madrid según tus preferencias. Filtros por DAT, tipo, jornada y bilingüismo. Exporta tu lista a Excel.",
};

export const revalidate = 3600;

type SupabaseCentro = {
  codigo: string;
  nombre: string;
  municipio: string;
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

const SELECT_FIELDS =
  "codigo, nombre, municipio, dat, tipo, titularidad, jornada, bilingue, idiomas_bilingue, etapa, vacantes, updated_at, lat, lng";

export default async function Page() {
  const supabase = await createServerClient();

  // Cargar todos los centros (7757) en bloques de 1000
  const PAGE_SIZE = 1000;
  let allRows: SupabaseCentro[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from("centros")
      .select(SELECT_FIELDS)
      .order("nombre", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data as SupabaseCentro[]);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const centros: Centro[] = allRows.map((row) => {
    const v = row.vacantes ?? {};
    const vacantes = {
      c2223: v.c2223 ?? 0,
      c2324: v.c2324 ?? 0,
      c2425: v.c2425 ?? 0,
      c2526Rh09: v.c2526Rh09 ?? 0,
      c2526AnexoI: v.c2526AnexoI ?? 0,
      c2526AnexoVia: v.c2526AnexoVia ?? 0,
    };
    return {
      codigo: row.codigo,
      centro: row.nombre,
      localidad: row.municipio ?? "",
      vacantes,
      total:
        vacantes.c2223 +
        vacantes.c2324 +
        vacantes.c2425 +
        vacantes.c2526Rh09 +
        vacantes.c2526AnexoI +
        vacantes.c2526AnexoVia,
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
  });

  return (
    <>
      <Header />
      <main className="container py-6">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">
            Concursillo
          </h2>
          <p className="mt-1 text-ink-600">
            Ordena tus destinos preferidos, filtra por DAT/tipo/jornada y exporta
            tu lista a Excel.{" "}
            <span className="font-semibold text-madrid-700">
              {centros.length.toLocaleString("es-ES")} centros disponibles.
            </span>
          </p>
        </div>
        <ConcursilloClient centros={centros} />
      </main>
      <Footer />
    </>
  );
}
