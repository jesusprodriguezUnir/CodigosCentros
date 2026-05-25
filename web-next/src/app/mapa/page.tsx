import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase/server";
import { MapaClient } from "./MapaClient";
import type { Centro } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mapa de centros educativos · Madrid | Centros CM",
  description:
    "Visualiza en el mapa todos los centros educativos públicos de la Comunidad de Madrid. Filtra por DAT y encuentra tu destino ideal.",
};

export const revalidate = 3600;

const SELECT_FIELDS = "codigo, nombre, municipio, dat, tipo, jornada, bilingue, vacantes, lat, lng";

export default async function Page() {
  const supabase = await createServerClient();

  const PAGE_SIZE = 1000;
  let allRows: {
    codigo: string; nombre: string; municipio: string;
    dat: string | null; tipo: string | null; jornada: string | null;
    bilingue: boolean | null; vacantes: Record<string, number> | null;
    lat: number | null; lng: number | null;
  }[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from("centros")
      .select(SELECT_FIELDS)
      .not("lat", "is", null)
      .order("nombre", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data as typeof allRows);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const centros: Centro[] = allRows.map((row) => {
    const v = row.vacantes ?? {};
    const vacantes = {
      c2223: v.c2223 ?? 0, c2324: v.c2324 ?? 0, c2425: v.c2425 ?? 0,
      c2526Rh09: v.c2526Rh09 ?? 0, c2526AnexoI: v.c2526AnexoI ?? 0, c2526AnexoVia: v.c2526AnexoVia ?? 0,
    };
    return {
      codigo: row.codigo, centro: row.nombre, localidad: row.municipio ?? "",
      vacantes, total: Object.values(vacantes).reduce((a, b) => a + b, 0),
      dat: row.dat ?? undefined, tipo: row.tipo ?? undefined,
      jornada: row.jornada ?? undefined, bilingue: row.bilingue ?? undefined,
      lat: row.lat ?? undefined, lng: row.lng ?? undefined,
    };
  });

  return (
    <>
      <Header />
      <main>
        <MapaClient centros={centros} />
      </main>
      <Footer />
    </>
  );
}
