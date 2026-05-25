import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Registro de cambios · Centros CM",
};

// Revalidar cada 24h
export const revalidate = 86400;

type DataVersion = {
  id: number;
  source: string;
  version: string;
  applied_at: string;
  notas: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  centros_cm: "Centros educativos CM",
  consolidado_vacantes: "Vacantes históricas",
  gtfs_crtm: "Transporte público (CRTM)",
};

export default async function Page() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("data_versions")
    .select("*")
    .order("applied_at", { ascending: false });

  const versions: DataVersion[] = data ?? [];

  return (
    <>
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Registro de cambios
          </h1>
          <p className="text-ink-500 mb-10">
            Historial de actualizaciones de los datos publicados en este sitio.
          </p>

          {versions.length === 0 ? (
            <p className="text-ink-400 italic">No hay entradas registradas todavía.</p>
          ) : (
            <ol className="relative border-l border-ink-200 space-y-10 ml-3">
              {versions.map((v) => {
                const date = new Date(v.applied_at);
                const label = SOURCE_LABELS[v.source] ?? v.source;
                return (
                  <li key={v.id} className="ml-6">
                    <span className="absolute -left-2.5 w-5 h-5 rounded-full bg-madrid-600 border-2 border-white" />
                    <time
                      className="block text-xs font-semibold text-madrid-600 uppercase tracking-wide mb-1"
                      dateTime={date.toISOString()}
                    >
                      {date.toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                    <h2 className="text-base font-semibold text-ink-900">
                      {label}{" "}
                      <span className="font-normal text-ink-500">
                        — versión{" "}
                        {new Date(v.version).toLocaleDateString("es-ES", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </h2>
                    {v.notas && (
                      <p className="mt-1 text-sm text-ink-600">{v.notas}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
