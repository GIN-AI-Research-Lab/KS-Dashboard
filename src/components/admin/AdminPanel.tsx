"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/i18n/I18nProvider";
import type { Translate } from "@/i18n/lookup";
import type { Role } from "@prisma/client";

interface DepartmentRow {
  id: string;
  name: string;
  userCount: number;
}
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  image: string | null;
  createdAt: string;
}

const ROLES: Role[] = ["ADMIN", "DEPARTMENT_HEAD", "MEMBER"];
const TABS = ["users", "departments"] as const;
type Tab = (typeof TABS)[number];

export function AdminPanel({
  initialDepartments,
  initialUsers,
}: {
  initialDepartments: DepartmentRow[];
  initialUsers: UserRow[];
}) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("users");
  const [departments, setDepartments] = useState(initialDepartments);
  const [users, setUsers] = useState(initialUsers);
  const TAB_LABELS: Record<Tab, string> = { users: t("admin.tabUsers"), departments: t("admin.tabDepartments") };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              tab === tabKey
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {TAB_LABELS[tabKey]}
          </button>
        ))}
      </div>

      {tab === "departments" && (
        <DepartmentsTab departments={departments} setDepartments={setDepartments} t={t} />
      )}
      {tab === "users" && (
        <UsersTab users={users} setUsers={setUsers} departments={departments} t={t} />
      )}
    </div>
  );
}

function DepartmentsTab({
  departments,
  setDepartments,
  t,
}: {
  departments: DepartmentRow[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentRow[]>>;
  t: Translate;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      const { department } = await res.json();
      setDepartments((prev) => [...prev, { id: department.id, name: department.name, userCount: 0 }]);
      setName("");
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin.confirmDeleteDept"))) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    if (res.ok) setDepartments((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <Card title={t("admin.deptSectionTitle")}>
      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("admin.deptNamePlaceholder")}
          className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          onClick={create}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] active:opacity-90 disabled:opacity-60 disabled:hover:bg-accent"
        >
          {t("admin.addButton")}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 font-medium">{t("admin.colName")}</th>
            <th className="py-2 font-medium">{t("admin.colUserCount")}</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id} className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/5">
              <td className="py-2 font-medium">{d.name}</td>
              <td className="py-2">{d.userCount}</td>
              <td className="py-2 text-right">
                <button onClick={() => remove(d.id)} className="text-xs text-[#d03b3b] transition-colors hover:underline">
                  {t("admin.deleteButton")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function UsersTab({
  users,
  setUsers,
  departments,
  t,
}: {
  users: UserRow[];
  setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
  departments: DepartmentRow[];
  t: Translate;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" as Role, departmentId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    if (!form.name || !form.email || form.password.length < 8) {
      setError(t("admin.errorRequired"));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        departmentId: form.departmentId || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { user } = await res.json();
      setUsers((prev) => [
        ...prev,
        { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId, image: user.image ?? null, createdAt: user.createdAt },
      ]);
      setForm({ name: "", email: "", password: "", role: "MEMBER", departmentId: "" });
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? t("admin.errorCreateFailed"));
    }
  }

  async function updateUser(id: string, patch: Partial<Pick<UserRow, "role" | "departmentId">>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin.confirmDeleteUser"))) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <Card title={t("admin.usersSectionTitle")}>
      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-5">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={t("admin.namePlaceholder")}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent md:col-span-1"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder={t("admin.emailPlaceholder")}
          type="email"
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent md:col-span-1"
        />
        <input
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={t("admin.tempPasswordPlaceholder")}
          type="text"
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent md:col-span-1"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </select>
        <select
          value={form.departmentId}
          onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">{t("admin.departmentPlaceholder")}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={create}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] active:opacity-90 disabled:opacity-60 disabled:hover:bg-accent"
        >
          {t("admin.createAccountButton")}
        </button>
        {error && <span className="text-xs text-[#d03b3b]">{error}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pr-3 font-medium">{t("admin.colName")}</th>
              <th className="py-2 pr-3 font-medium">{t("admin.colEmail")}</th>
              <th className="py-2 pr-3 font-medium">{t("admin.colRole")}</th>
              <th className="py-2 pr-3 font-medium">{t("admin.colDepartment")}</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/5">
                <td className="py-2 pr-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Avatar image={u.image} name={u.name} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                    {u.name}
                  </span>
                </td>
                <td className="py-2 pr-3 text-[var(--text-secondary)]">{u.email}</td>
                <td className="py-2 pr-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                    className="rounded-md border border-[var(--border)] bg-transparent px-1.5 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`roles.${r}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={u.departmentId ?? ""}
                    onChange={(e) => updateUser(u.id, { departmentId: e.target.value || null })}
                    className="rounded-md border border-[var(--border)] bg-transparent px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => remove(u.id)} className="text-xs text-[#d03b3b] transition-colors hover:underline">
                    {t("admin.deleteButton")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
