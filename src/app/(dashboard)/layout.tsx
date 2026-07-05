import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getLastActivity } from "@/lib/stats";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CommandPalette } from "@/components/CommandPalette";
import { SidebarProvider } from "@/components/sidebar/SidebarContext";
import { SmoothScroll } from "@/components/SmoothScroll";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  const [departments, lastActivity] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { teams: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
    getLastActivity(),
  ]);

  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden">
        <AutoRefresh />
        <CommandPalette />
        <Sidebar orgTree={departments} role={user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={user.name} role={user.role} lastActivity={lastActivity} />
          <main id="scroll-main" className="flex-1 overflow-y-auto">
            <div id="scroll-content" className="p-6">{children}</div>
          </main>
          <SmoothScroll />
        </div>
      </div>
    </SidebarProvider>
  );
}
