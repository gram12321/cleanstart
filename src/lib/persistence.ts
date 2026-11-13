import { supabase } from "./supabase";

export const STORAGE_KEYS = {
  library: "krydsvaerk-library-v1",
  drafts: "krydsvaerk-drafts-v1",
  dictionaries: "krydsvaerk-ordboger-v1",
  builtinDictionarySettings: "krydsvaerk-indbyggede-ordboger-v1",
  legacyDictionary: "krydsvaerk-ordbog",
  play: "krydsvaerk-play-v1",
} as const;

export type PersistedData = Record<string, unknown>;

export type PublicCrossword = { id: string; name: string; puzzle: unknown };
export type SharedDictionary = { id: string; name: string; entries: unknown; owner_id: string };

let loading: Promise<PersistedData> | null = null;

export function loadPersistedData(): Promise<PersistedData> {
  loading ??= loadPersistedDataOnce();
  return loading;
}

async function loadPersistedDataOnce(): Promise<PersistedData> {
  if (!supabase) throw new Error("Supabase er ikke konfigureret.");

  let { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) {
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw result.error;
    session = result.data.session;
  }
  if (!session) throw new Error("Kunne ikke oprette en anonym bruger.");

  const { data: rows, error: readError } = await supabase
    .from("user_persistence")
    .select("key, value")
    .eq("user_id", session.user.id);
  if (readError) throw readError;

  const data: PersistedData = Object.fromEntries((rows ?? []).map(row => [row.key, row.value]));
  const { data: publicCrosswords, error: publicReadError } = await supabase
    .from("published_crosswords")
    .select("id, name, puzzle")
    .order("created_at", { ascending: true });
  if (publicReadError) throw publicReadError;
  data.__public_crosswords = publicCrosswords ?? [];
  const { data: sharedDictionaries, error: dictionaryError } = await supabase
    .from("shared_dictionaries").select("id, name, entries, owner_id").order("name");
  if (dictionaryError) throw dictionaryError;
  data.__shared_dictionaries = sharedDictionaries ?? [];
  if (data.__local_storage_migrated !== true) {
    const migration: Record<string, unknown> = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try { migration[key] = JSON.parse(raw); } catch { /* Ignore malformed legacy data. */ }
    }
    const existing = new Set(Object.keys(data));
    const rowsToWrite = Object.entries(migration)
      .filter(([key]) => !existing.has(key))
      .map(([key, value]) => ({ user_id: session!.user.id, key, value }));
    rowsToWrite.push({ user_id: session.user.id, key: "__local_storage_migrated", value: true });
    const { error: migrationError } = await supabase.from("user_persistence").upsert(rowsToWrite, { onConflict: "user_id,key" });
    if (migrationError) throw migrationError;
    Object.assign(data, migration, { __local_storage_migrated: true });
  }
  return data;
}

export async function setSharedDictionary(dictionary: { id: string; name: string; entries: unknown } | null, id?: string): Promise<void> {
  if (!supabase) throw new Error("Supabase er ikke konfigureret.");
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("Supabase-sessionen er udløbet.");
  if (!dictionary) {
    if (!id) return;
    const { error } = await supabase.from("shared_dictionaries").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("shared_dictionaries").upsert({
    id: dictionary.id, owner_id: session.user.id, name: dictionary.name, entries: dictionary.entries, updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw error;
}

export async function publishPublicCrossword(name: string, puzzle: unknown): Promise<PublicCrossword> {
  if (!supabase) throw new Error("Supabase er ikke configured.");
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("Supabase-sessionen er udløbet.");
  const { data, error } = await supabase.from("published_crosswords")
    .insert({ owner_id: session.user.id, name, puzzle })
    .select("id, name, puzzle")
    .single();
  if (error) throw error;
  return data as PublicCrossword;
}

export async function savePersistedValue(key: string, value: unknown): Promise<void> {
  if (!supabase) throw new Error("Supabase er ikke konfigureret.");
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("Supabase-sessionen er udløbet.");
  const { error } = await supabase.from("user_persistence").upsert(
    { user_id: session.user.id, key, value },
    { onConflict: "user_id,key" },
  );
  if (error) throw error;
}
