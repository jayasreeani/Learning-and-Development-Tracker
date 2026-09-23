"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/supabase/types";

interface ViewerContextValue {
  id: string | null;
  email: string | null;
  profile: Profile | null;
  role: Role;
  canManage: boolean;
  isOwner: boolean;
  loaded: boolean;
}

const ViewerContext = createContext<ViewerContextValue>({
  id: null,
  email: null,
  profile: null,
  role: "member",
  canManage: false,
  isOwner: false,
  loaded: false,
});

export function useViewer() {
  return useContext(ViewerContext);
}

export function ViewerProvider({
  initialProfile,
  children,
}: {
  initialProfile: Profile | null;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loaded, setLoaded] = useState(!!initialProfile);

  useEffect(() => {
    const supabase = createClient();
    if (!profile) return;

    const channel = supabase
      .channel(`realtime:profiles:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          setProfile(payload.new as Profile);
          setLoaded(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const role = profile?.role ?? "member";

  return (
    <ViewerContext.Provider
      value={{
        id: profile?.id ?? null,
        email: profile?.email ?? null,
        profile,
        role,
        canManage: role === "owner" || role === "manager",
        isOwner: role === "owner",
        loaded,
      }}
    >
      {children}
    </ViewerContext.Provider>
  );
}
