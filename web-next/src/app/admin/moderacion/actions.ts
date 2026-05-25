"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Sin permisos");
  return supabase;
}

export async function hideReview(reviewId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("reviews")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", reviewId);
  revalidatePath("/admin/moderacion");
}

export async function unhideReview(reviewId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("reviews")
    .update({ hidden_at: null })
    .eq("id", reviewId);
  revalidatePath("/admin/moderacion");
}

export async function hideComment(commentId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("comments")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", commentId);
  revalidatePath("/admin/moderacion");
}

export async function unhideComment(commentId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("comments")
    .update({ hidden_at: null })
    .eq("id", commentId);
  revalidatePath("/admin/moderacion");
}

export async function resolveFlag(flagId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("flags")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", flagId);
  revalidatePath("/admin/moderacion");
}
