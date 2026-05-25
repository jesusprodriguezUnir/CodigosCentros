import { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

const BASE_URL = "https://codigos-centros.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("centros")
    .select("codigo, updated_at")
    .order("codigo");

  const centroUrls: MetadataRoute.Sitemap = (data ?? []).map((c) => ({
    url: `${BASE_URL}/centro/${c.codigo}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/concursillo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/mapa`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...centroUrls,
  ];
}
