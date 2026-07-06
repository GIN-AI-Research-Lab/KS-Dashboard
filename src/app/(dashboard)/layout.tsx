import { auth } from "@/auth";
import { getLastActivity } from "@/lib/stats";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CommandPalette } from "@/components/CommandPalette";
import { SidebarProvider } from "@/components/sidebar/SidebarContext";
import { SmoothScroll } from "@/components/SmoothScroll";
import { getMenuSettings } from "@/lib/menu-config";
import { resolveSidebarItems } from "@/lib/menu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  const [settings, lastActivity] = await Promise.all([getMenuSettings(), getLastActivity()]);

  const items = resolveSidebarItems(user.role, settings).map((m) => ({
    key: m.key,
    href: m.href,
    icon: m.icon,
    labelKey: m.labelKey,
    exact: m.exact,
  }));

  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden">
        <AutoRefresh />
        <CommandPalette />
        <Sidebar items={items} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={user.name} role={user.role} image={user.image} lastActivity={lastActivity} />
          <main id="scroll-main" className="flex-1 overflow-y-auto">
            <div id="scroll-content" className="p-6">{children}</div>
          </main>
          <SmoothScroll />
        </div>
      </div>
    </SidebarProvider>
  );
}
