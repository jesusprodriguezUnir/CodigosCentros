import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase/server";
import { ModerationPanel } from "./ModerationPanel";

export const metadata: Metadata = {
  title: "Moderación · Admin · Centros CM",
};

export default async function Page() {
  const supabase = await createServerClient();

  // Verificar autenticación y rol admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/moderacion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // Obtener flags pendientes con el contenido relacionado
  const { data: flagsRaw } = await supabase
    .from("flags")
    .select(
      `
      id, target_type, target_id, reason, created_at,
      review:reviews!flags_target_id_fkey (
        id, centro_codigo, body, rating, hidden_at,
        profile:profiles!reviews_user_id_fkey ( display_name )
      ),
      comment:comments!flags_target_id_fkey (
        id, body, hidden_at,
        profile:profiles!comments_user_id_fkey ( display_name )
      )
    `
    )
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  // Supabase devuelve arrays en las joins; normalizamos a objeto o null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flags = (flagsRaw ?? []).map((f: any) => ({
    ...f,
    review: Array.isArray(f.review) ? f.review[0] ?? null : f.review,
    comment: Array.isArray(f.comment) ? f.comment[0] ?? null : f.comment,
  }));

  const pendingCount = flags.length;

  return (
    <>
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="font-display text-3xl font-bold text-ink-900">
              Moderación
            </h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-madrid-600 text-white text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-ink-500">
            Reportes de contenido pendientes de revisión.
          </p>
          <ModerationPanel flags={flags} />
        </div>
      </main>
      <Footer />
    </>
  );
}
