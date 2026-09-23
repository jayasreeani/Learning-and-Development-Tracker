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

  // Guarantees a profiles row exists for this account, creating one on the
  // spot (first signup ever = owner, otherwise member) if the signup
  // trigger somehow didn't run for it. Without this, a missing row silently
  // fell back to "member" and every manager-only control in the app just
  // didn't render, with no error shown anywhere.
  const { data: profile } = await supabase.rpc("ensure_current_profile");

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
