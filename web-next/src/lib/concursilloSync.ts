import { createClient } from "@/lib/supabase/client";
import type { Centro } from "@/lib/types";

const SLUG = "default";

export async function syncListaToCloud(centros: Centro[]): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("user_listas")
    .upsert(
      { user_id: user.id, slug: SLUG, payload: centros, updated_at: new Date().toISOString() },
      { onConflict: "user_id,slug" }
    );

  return !error;
}

export async function loadListaFromCloud(): Promise<Centro[] | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_listas")
    .select("payload")
    .eq("user_id", user.id)
    .eq("slug", SLUG)
    .maybeSingle();

  return (data?.payload as Centro[]) ?? null;
}
