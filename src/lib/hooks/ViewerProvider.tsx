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

    async function ensureProfile() {
      if (!profile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (dbProfile) {
            setProfile(dbProfile);
          } else {
            const isOwnerEmail = user.email === "jayasreeani@gmail.com";
            setProfile({
              id: user.id,
              name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
              email: user.email || "",
              role: isOwnerEmail ? "owner" : "member",
              created_at: new Date().toISOString(),
            });
          }
          setLoaded(true);
        }
      }
    }

    ensureProfile();

    if (!profile?.id) return;

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

  const role =
    profile?.email === "jayasreeani@gmail.com"
      ? "owner"
      : profile?.role ?? "member";

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
