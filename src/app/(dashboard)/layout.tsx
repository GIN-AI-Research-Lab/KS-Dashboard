import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CommandPalette } from "@/components/CommandPalette";
import { SidebarProvider } from "@/components/sidebar/SidebarContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { teams: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
  });

  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden">
        <AutoRefresh />
        <CommandPalette />
        <Sidebar orgTree={departments} role={user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={user.name} role={user.role} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
