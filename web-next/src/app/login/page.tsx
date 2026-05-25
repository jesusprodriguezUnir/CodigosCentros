import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoginForm } from "@/components/LoginForm";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Iniciar sesión · Centros CM",
  description: "Accede a tu cuenta para guardar tu lista de centros y publicar reseñas.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Si ya hay sesión, redirigir
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(params.next ?? "/");

  return (
    <>
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-sm">
          <div className="rounded-xl border border-ink-200 bg-white p-8 shadow-soft">
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-2 text-center">
              Iniciar sesión
            </h1>
            <p className="text-sm text-ink-600 text-center mb-6">
              Guarda tu lista de centros y publica reseñas.
            </p>

            {params.error === "auth" && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                El enlace ha expirado o no es válido. Solicita uno nuevo.
              </div>
            )}

            <LoginForm redirectTo={params.next ?? "/"} />

            <p className="mt-6 text-center text-xs text-ink-400">
              Al continuar aceptas nuestra{" "}
              <Link href="/privacidad" className="text-madrid-600 hover:underline">
                política de privacidad
              </Link>{" "}
              y los{" "}
              <Link href="/legal" className="text-madrid-600 hover:underline">
                términos de uso
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
