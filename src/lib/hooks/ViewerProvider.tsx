"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, Profile, Role } from "@/lib/supabase/types";

interface ViewerContextValue {
  id: string | null;
  email: string | null;
  profile: Profile | null;
  member: Member | null;
  role: Role;
  canManage: boolean;
  isOwner: boolean;
  loaded: boolean;
}

const ViewerContext = createContext<ViewerContextValue>({
  id: null,
  email: null,
  profile: null,
  member: null,
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
  const [member, setMember] = useState<Member | null>(null);
  const [loaded, setLoaded] = useState(!!initialProfile);

  useEffect(() => {
    const supabase = createClient();

    async function ensureViewer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Resolve profile
        if (!profile) {
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
        }

        // Resolve linked member from roster
        const { data: dbMember } = await supabase
          .from("members")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (dbMember) {
          setMember(dbMember);
        } else if (user.email) {
          // Fallback match by email or name if not yet linked by user_id
          const { data: matchByEmail } = await supabase
            .from("members")
            .select("*")
            .ilike("email", user.email)
            .maybeSingle();

          if (matchByEmail) {
            setMember(matchByEmail);
          } else {
            const nameSearch = user.user_metadata?.name || user.email.split("@")[0];
            const { data: matchByName } = await supabase
              .from("members")
              .select("*")
              .ilike("name", `%${nameSearch}%`)
              .maybeSingle();

            if (matchByName) setMember(matchByName);
          }
        }

        setLoaded(true);
      }
    }

    ensureViewer();

    if (!profile?.id) return;

    const profileChannel = supabase
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
      supabase.removeChannel(profileChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const emailLower = (profile?.email || "").toLowerCase();
  const nameLower = (profile?.name || member?.name || "").toLowerCase();
  const isJayasree =
    emailLower.includes("jayasree") ||
    nameLower.includes("jayasree") ||
    emailLower === "jayasreeani@gmail.com";

  const isProjectLead =
    member?.project_role === "Lead" ||
    nameLower.includes("gopika") ||
    nameLower.includes("anuvindha");

  const isProjectManager =
    member?.project_role === "Manager" || isJayasree;

  let computedRole: Role = profile?.role ?? "member";
  if (isJayasree) {
    computedRole = "owner";
  } else if (isProjectManager && computedRole === "member") {
    computedRole = "manager";
  } else if (isProjectLead && computedRole === "member") {
    computedRole = "lead";
  }

  const canManage =
    computedRole === "owner" ||
    computedRole === "manager" ||
    computedRole === "lead" ||
    isProjectLead ||
    isProjectManager ||
    isJayasree;

  const isOwner = computedRole === "owner" || isJayasree;

  return (
    <ViewerContext.Provider
      value={{
        id: profile?.id ?? null,
        email: profile?.email ?? null,
        profile,
        member,
        role: computedRole,
        canManage,
        isOwner,
        loaded,
      }}
    >
      {children}
    </ViewerContext.Provider>
  );
}
