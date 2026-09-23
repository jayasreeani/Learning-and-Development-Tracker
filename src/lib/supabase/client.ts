import { createBrowserClient } from "@supabase/ssr";

// Not generic over the Database type: the hand-written row types in
// ./types.ts are used directly at each call site instead (see useTable.ts),
// which keeps this client simple and avoids fighting supabase-js's strict
// generated-schema shape for a hand-maintained type file.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
