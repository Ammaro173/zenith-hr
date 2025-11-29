import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_OPEN_VALUE = "true";

async function getSidebarOpenState(): Promise<boolean> {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
  return sidebarState !== SIDEBAR_OPEN_VALUE;
}

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  // const session = await auth();
  // const currentAdmin = await getCurrentAdmin();
  const isSidebarOpen = await getSidebarOpenState();

  // if (isEmpty(session) || session?.error) {
  //   redirect("/login" as Route);
  // }

  return (
    // <CurrentAdminProvider initialAdmin={currentAdmin}>
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <AppSidebar />
      <SidebarInset className="bg-[#F9FAFB]">
        <AppHeader />
        <main className="@container/protected-layout container mx-auto flex w-full flex-1 flex-col gap-6 px-6 pt-6 pb-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
    // </CurrentAdminProvider>
  );
}
