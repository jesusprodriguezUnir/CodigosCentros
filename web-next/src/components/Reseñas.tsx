"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, Flag, MessageSquare, ChevronDown, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FormReseña } from "./FormReseña";
import type { Review, Comment } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

// ─── Estrellas readonly ───────────────────────────────────────────────────────
function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            size === "lg" ? "h-5 w-5" : "h-4 w-4",
            n <= rating ? "fill-amber-400 text-amber-400" : "text-ink-200"
          )}
        />
      ))}
    </div>
  );
}

// ─── Resumen estadístico ──────────────────────────────────────────────────────
function ResumenReseñas({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const media = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({
    stars: n,
    count: reviews.filter((r) => r.rating === n).length,
  }));

  return (
    <div className="flex items-center gap-6 rounded-xl bg-ink-50 p-4 mb-6">
      <div className="text-center shrink-0">
        <p className="text-4xl font-bold text-ink-900 leading-none">
          {media.toFixed(1)}
        </p>
        <Stars rating={Math.round(media)} size="sm" />
        <p className="text-xs text-ink-500 mt-1">{reviews.length} reseña{reviews.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex-1 space-y-1">
        {dist.map(({ stars, count }) => (
          <div key={stars} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-ink-500">{stars}</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <div className="flex-1 rounded-full bg-ink-200 h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{
                  width: reviews.length
                    ? `${(count / reviews.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <span className="w-4 text-right text-ink-400">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Item de reseña ───────────────────────────────────────────────────────────
function ItemReseña({
  review,
  currentUserId,
  centroCodigo,
}: {
  review: Review;
  currentUserId: string | null;
  centroCodigo: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profile:profiles(display_name, avatar_url)")
      .eq("review_id", review.id)
      .is("hidden_at", null)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  }, [review.id, supabase]);

  const toggleComments = async () => {
    if (!expanded) await loadComments();
    setExpanded((v) => !v);
  };

  const handleFlag = async () => {
    if (!currentUserId) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    await supabase.from("flags").insert({
      target_type: "review",
      target_id: review.id,
      user_id: currentUserId,
      reason: "Reportado por usuario",
    });
    alert("Reseña reportada. Gracias.");
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (commentBody.trim().length < 5) return;
    setSending(true);
    await supabase.from("comments").insert({
      review_id: review.id,
      user_id: currentUserId,
      body: commentBody.trim(),
    });
    setCommentBody("");
    await loadComments();
    setSending(false);
  };

  const displayName = review.profile?.display_name ?? "Usuario";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 space-y-3">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-madrid-100 flex items-center justify-center text-sm font-bold text-madrid-700 shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-medium text-sm text-ink-900">{displayName}</p>
            <p className="text-xs text-ink-400">
              {new Date(review.created_at).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={review.rating} />
          <button
            onClick={handleFlag}
            className="text-ink-300 hover:text-red-400 transition-colors p-1"
            title="Reportar"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      <p className="text-sm text-ink-700 leading-relaxed">{review.body}</p>

      {/* Pie: botón comentarios */}
      <button
        onClick={toggleComments}
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-madrid-600 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Responder
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {/* Comentarios */}
      {expanded && (
        <div className="space-y-2 pl-4 border-l-2 border-ink-100">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium text-ink-800">
                {c.profile?.display_name ?? "Usuario"}
              </span>{" "}
              <span className="text-ink-600">{c.body}</span>
              <span className="text-xs text-ink-400 ml-2">
                {new Date(c.created_at).toLocaleDateString("es-ES")}
              </span>
            </div>
          ))}
          <form onSubmit={handleComment} className="flex gap-2 mt-2">
            <input
              type="text"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Escribe una respuesta…"
              minLength={5}
              className="flex-1 rounded-lg border border-ink-200 py-1.5 px-3 text-xs focus:border-madrid-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-madrid-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-madrid-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  centroCodigo: string;
}

export function Reseñas({ centroCodigo }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const PAGE_SIZE = 10;

  const supabase = createClient();

  const loadReviews = useCallback(
    async (reset = false) => {
      const from = reset ? 0 : page * PAGE_SIZE;
      const { data, count } = await supabase
        .from("reviews")
        .select("*, profile:profiles(display_name, avatar_url)", { count: "exact" })
        .eq("centro_codigo", centroCodigo)
        .is("hidden_at", null)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      const items = (data as Review[]) ?? [];
      setReviews((prev) => (reset ? items : [...prev, ...items]));
      setHasMore((from + PAGE_SIZE) < (count ?? 0));
      if (!reset) setPage((p) => p + 1);
      setLoading(false);
    },
    [centroCodigo, page, supabase]
  );

  useEffect(() => {
    loadReviews(true);
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCodigo]);

  const yaReseñó = user
    ? reviews.some((r) => r.user_id === user.id)
    : false;

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-ink-900 mb-4">
        Reseñas de docentes
      </h2>

      {/* Resumen */}
      {reviews.length > 0 && <ResumenReseñas reviews={reviews} />}

      {/* Botón escribir reseña */}
      {!showForm && (
        <div className="mb-6">
          {user ? (
            !yaReseñó && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-madrid-600 px-4 py-2 text-sm font-semibold text-madrid-700 hover:bg-madrid-50 transition-colors"
              >
                <Star className="h-4 w-4" />
                Escribir una reseña
              </button>
            )
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(`/centro/${centroCodigo}`)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Inicia sesión para escribir una reseña
            </Link>
          )}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-madrid-200 bg-madrid-50/40 p-5">
          <h3 className="font-semibold text-ink-900 mb-4">Tu reseña</h3>
          <FormReseña
            centroCodigo={centroCodigo}
            onSuccess={() => {
              setShowForm(false);
              loadReviews(true);
            }}
          />
          <button
            onClick={() => setShowForm(false)}
            className="mt-3 text-xs text-ink-500 hover:underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-ink-500 py-4">Cargando reseñas…</p>
      ) : reviews.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-ink-200 p-8 text-center text-sm text-ink-500">
          Todavía no hay reseñas para este centro. ¡Sé el primero!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ItemReseña
              key={r.id}
              review={r}
              currentUserId={user?.id ?? null}
              centroCodigo={centroCodigo}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => loadReviews(false)}
              className="w-full rounded-lg border border-ink-200 py-2 text-sm text-ink-600 hover:bg-ink-50 transition-colors"
            >
              Ver más reseñas
            </button>
          )}
        </div>
      )}
    </section>
  );
}
