import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/server-session";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_OPEN_VALUE = "true";

export const dynamic = "force-dynamic";

async function getSidebarOpenState(): Promise<boolean> {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
  return sidebarState === SIDEBAR_OPEN_VALUE;
}

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();
  if (session?.error || !session?.data?.user) {
    redirect("/login");
  }

  const isSidebarOpen = await getSidebarOpenState();

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <AppHeader />
        <main className="@container/protected-layout container mx-auto flex w-full flex-1 flex-col gap-6 px-6 pt-6 pb-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
