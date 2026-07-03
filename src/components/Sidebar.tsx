"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@prisma/client";

type OrgTree = { id: string; name: string; teams: { id: string; name: string }[] }[];

const ICONS: Record<string, string> = {
  overview: "📊",
  me: "👤",
  rankings: "🏆",
  models: "🤖",
  tools: "🛠️",
  live: "🟢",
  admin: "⚙️",
  org: "🏢",
};

function NavLink({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[#2a78d6]/10 text-[#2a78d6]"
          : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}

export function Sidebar({ orgTree, role }: { orgTree: OrgTree; role: Role }) {
  const [orgOpen, setOrgOpen] = useState(true);
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a78d6] text-sm font-bold text-white">
          KS
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">KS Dashboard</div>
          <div className="text-[11px] leading-tight text-[var(--text-muted)]">Claude usage analytics</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <NavLink href="/" label="Tổng quan" icon={ICONS.overview} exact />
        <NavLink href="/me" label="Cá nhân" icon={ICONS.me} />
        <NavLink href="/rankings" label="Xếp hạng" icon={ICONS.rankings} />
        <NavLink href="/models" label="Model" icon={ICONS.models} />
        <NavLink href="/tools" label="Công cụ" icon={ICONS.tools} />
        <NavLink href="/live" label="Phiên trực tuyến" icon={ICONS.live} />

        <button
          onClick={() => setOrgOpen((v) => !v)}
          className="mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>{ICONS.org}</span> Bộ phận / Nhóm
          </span>
          <span>{orgOpen ? "−" : "+"}</span>
        </button>
        {orgOpen && (
          <div className="ml-2 flex flex-col gap-0.5 border-l border-[var(--border)] pl-3">
            {orgTree.map((dept) => (
              <div key={dept.id}>
                <Link
                  href={`/departments/${dept.id}`}
                  className={`block truncate rounded-md px-2 py-1.5 text-sm ${
                    pathname === `/departments/${dept.id}`
                      ? "font-medium text-[#2a78d6]"
                      : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {dept.name}
                </Link>
                {dept.teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className={`ml-3 block truncate rounded-md px-2 py-1 text-[13px] ${
                      pathname === `/teams/${team.id}`
                        ? "font-medium text-[#2a78d6]"
                        : "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    · {team.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}

        {role === "ADMIN" && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <NavLink href="/admin" label="Quản trị" icon={ICONS.admin} />
          </div>
        )}
      </nav>
    </aside>
  );
}
