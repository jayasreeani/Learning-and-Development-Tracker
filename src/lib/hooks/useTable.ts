"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TableName =
  | "members"
  | "trainings"
  | "training_plans"
  | "training_requests"
  | "skill_events"
  | "profiles"
  | "invites";

/**
 * Loads every row of a table and keeps it live via Supabase Realtime —
 * mirrors the original artifact's db.collection(...).onSnapshot() pattern.
 */
export function useTable<T extends { id: string; created_at?: string }>(
  table: TableName,
  orderBy: string = "created_at"
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from(table)
        .select("*")
        .order(orderBy, { ascending: true });
      if (!cancelled) {
        setRows((data as T[]) || []);
        setLoaded(true);
      }
    }
    load();

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as T;
              if (prev.some((r) => r.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as T;
              return prev.map((r) => (r.id === row.id ? row : r));
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { id: string };
              return prev.filter((r) => r.id !== oldRow.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, orderBy, supabase]);

  return { rows, loaded, supabase };
}
