"use client";

import { useTransition } from "react";
import {
  hideReview, unhideReview,
  hideComment, unhideComment,
  resolveFlag,
} from "./actions";

// ── tipos inline ─────────────────────────────────────────────

type FlagRow = {
  id: string;
  target_type: "review" | "comment";
  target_id: string;
  reason: string | null;
  created_at: string;
  review?: {
    id: string;
    centro_codigo: string;
    body: string;
    rating: number;
    hidden_at: string | null;
    profile?: { display_name: string | null };
  } | null;
  comment?: {
    id: string;
    body: string;
    hidden_at: string | null;
    profile?: { display_name: string | null };
  } | null;
};

// ── helpers ──────────────────────────────────────────────────

function Badge({ hidden }: { hidden: boolean }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        hidden
          ? "bg-ink-200 text-ink-500"
          : "bg-green-100 text-green-700"
      }`}
    >
      {hidden ? "Oculto" : "Visible"}
    </span>
  );
}

// ── fila de flag ─────────────────────────────────────────────

function FlagCard({ flag }: { flag: FlagRow }) {
  const [pending, startTransition] = useTransition();
  const isReview = flag.target_type === "review";
  const content = isReview ? flag.review : flag.comment;
  if (!content) return null;

  const isHidden = !!content.hidden_at;

  const toggleHide = () =>
    startTransition(async () => {
      if (isReview) {
        if (isHidden) await unhideReview(content.id);
        else await hideReview(content.id);
      } else {
        if (isHidden) await unhideComment(content.id);
        else await hideComment(content.id);
      }
    });

  const resolve = () =>
    startTransition(async () => {
      await resolveFlag(flag.id);
    });

  const authorName =
    content.profile?.display_name ?? "Anónimo";

  return (
    <div className="border border-ink-200 rounded-xl p-5 bg-white space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wide font-semibold text-madrid-600">
            {isReview ? "Reseña" : "Comentario"}
          </span>
          {isReview && flag.review && (
            <span className="ml-2 text-xs text-ink-400">
              Centro{" "}
              <a
                href={`/centro/${flag.review.centro_codigo}`}
                className="underline hover:text-madrid-600"
                target="_blank"
                rel="noreferrer"
              >
                {flag.review.centro_codigo}
              </a>
              {" · "}{"★".repeat(flag.review.rating)}
            </span>
          )}
        </div>
        <Badge hidden={isHidden} />
      </div>

      <p className="text-sm text-ink-700 italic">&laquo;{content.body}&raquo;</p>

      <div className="flex items-center gap-2 text-xs text-ink-400">
        <span>Autor: <strong className="text-ink-700">{authorName}</strong></span>
        <span>·</span>
        <span>
          Reportado el{" "}
          {new Date(flag.created_at).toLocaleDateString("es-ES", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
        {flag.reason && (
          <>
            <span>·</span>
            <span>Motivo: {flag.reason}</span>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={toggleHide}
          disabled={pending}
          className="text-sm px-3 py-1.5 rounded-lg border border-ink-200 hover:border-ink-400 transition-colors disabled:opacity-50"
        >
          {isHidden ? "Mostrar" : "Ocultar"}
        </button>
        <button
          onClick={resolve}
          disabled={pending}
          className="text-sm px-3 py-1.5 rounded-lg bg-ink-900 text-white hover:bg-ink-700 transition-colors disabled:opacity-50"
        >
          Marcar resuelto
        </button>
      </div>
    </div>
  );
}

// ── componente principal ─────────────────────────────────────

export function ModerationPanel({ flags }: { flags: FlagRow[] }) {
  if (flags.length === 0) {
    return (
      <p className="text-ink-400 italic mt-8">
        Sin reportes pendientes. ¡Todo limpio!
      </p>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      {flags.map((f) => (
        <FlagCard key={f.id} flag={f} />
      ))}
    </div>
  );
}
