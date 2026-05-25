"use client";

import { useState } from "react";
import { Star, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  centroCodigo: string;
  onSuccess: () => void;
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-ink-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function FormReseña({ centroCodigo, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMsg("Selecciona una puntuación.");
      return;
    }
    if (body.trim().length < 30) {
      setErrorMsg("La reseña debe tener al menos 30 caracteres.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      centro_codigo: centroCodigo,
      user_id: user.id,
      rating,
      body: body.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        setErrorMsg("Ya has publicado una reseña para este centro.");
      } else {
        setErrorMsg(error.message);
      }
      setStatus("error");
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 block mb-2">
          Puntuación
        </label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div>
        <label
          htmlFor="body"
          className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 block mb-1"
        >
          Tu reseña <span className="font-normal normal-case">(mínimo 30 caracteres)</span>
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Comparte tu experiencia con este centro…"
          className="w-full rounded-lg border border-ink-200 p-3 text-sm placeholder:text-ink-400 focus:border-madrid-600 focus:outline-none focus:ring-4 focus:ring-madrid-600/15 resize-none"
        />
        <p className="mt-0.5 text-right text-xs text-ink-400">
          {body.length} / 30+
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-lg bg-madrid-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-madrid-700 transition-colors disabled:opacity-60"
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Publicar reseña
      </button>
    </form>
  );
}
