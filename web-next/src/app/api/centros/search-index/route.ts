import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  const supabase = await createServerClient();
  const rows: Array<{ codigo: string; nombre: string; municipio: string | null; distrito: string | null }> = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from("centros")
      .select("codigo, nombre, municipio, distrito")
      .order("nombre")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    page++;
  }
  return NextResponse.json(rows, { headers: { "cache-control": "s-maxage=3600, stale-while-revalidate" } });
}
