"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Loader2, CheckCircle } from "lucide-react";

interface Props {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h2 className="text-xl font-bold text-ink-900">Revisa tu correo</h2>
        <p className="max-w-sm text-ink-600 text-sm">
          Hemos enviado un enlace mágico a{" "}
          <span className="font-semibold">{email}</span>. Pulsa el enlace para
          iniciar sesión.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-madrid-600 hover:underline mt-2"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1"
        >
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.es"
            required
            className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15"
          />
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-madrid-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-madrid-700 transition-colors disabled:opacity-60"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        Enviar enlace mágico
      </button>

      <p className="text-center text-xs text-ink-500">
        Sin contraseña · Solo necesitas tu correo electrónico
      </p>
    </form>
  );
}
