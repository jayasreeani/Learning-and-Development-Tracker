import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ViewerProvider } from "@/lib/hooks/ViewerProvider";
import NavBar from "@/components/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Robust profile resolution:
  // 1. Direct query to profiles table
  // 2. RPC fallback to ensure_current_profile (handling both single object and array responses)
  // 3. Guaranteed fallback with role mapping
  let profile = null;

  try {
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (dbProfile) {
      profile = dbProfile;
    } else {
      const { data: rpcProfile } = await supabase.rpc("ensure_current_profile");
      if (rpcProfile) {
        profile = Array.isArray(rpcProfile) ? rpcProfile[0] : rpcProfile;
      }
    }
  } catch (err) {
    console.error("Failed to load profile in AppLayout:", err);
  }

  if (!profile) {
    const isOwnerEmail = user.email === "jayasreeani@gmail.com";
    profile = {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      email: user.email || "",
      role: isOwnerEmail ? "owner" : "member",
      created_at: new Date().toISOString(),
    };
  } else if (user.email === "jayasreeani@gmail.com" && profile.role !== "owner") {
    profile = { ...profile, role: "owner" };
  }

  return (
    <ViewerProvider initialProfile={profile}>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </ViewerProvider>
  );
}
