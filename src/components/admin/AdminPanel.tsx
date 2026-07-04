"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/access";
import type { Role } from "@prisma/client";

interface DepartmentRow {
  id: string;
  name: string;
  teamCount: number;
  userCount: number;
}
interface TeamRow {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  userCount: number;
}
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  departmentId: string | null;
  createdAt: string;
}

const ROLES: Role[] = ["ADMIN", "DEPARTMENT_HEAD", "TEAM_LEAD", "MEMBER"];
const TABS = ["users", "departments", "teams"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { users: "Người dùng", departments: "Bộ phận", teams: "Nhóm" };

export function AdminPanel({
  initialDepartments,
  initialTeams,
  initialUsers,
}: {
  initialDepartments: DepartmentRow[];
  initialTeams: TeamRow[];
  initialUsers: UserRow[];
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [departments, setDepartments] = useState(initialDepartments);
  const [teams, setTeams] = useState(initialTeams);
  const [users, setUsers] = useState(initialUsers);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              tab === t
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "departments" && (
        <DepartmentsTab departments={departments} setDepartments={setDepartments} />
      )}
      {tab === "teams" && (
        <TeamsTab teams={teams} setTeams={setTeams} departments={departments} />
      )}
      {tab === "users" && (
        <UsersTab users={users} setUsers={setUsers} departments={departments} teams={teams} />
      )}
    </div>
  );
}

function DepartmentsTab({
  departments,
  setDepartments,
}: {
  departments: DepartmentRow[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentRow[]>>;
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
      setDepartments((prev) => [...prev, { id: department.id, name: department.name, teamCount: 0, userCount: 0 }]);
      setName("");
    }
  }

  async function remove(id: string) {
    if (!confirm("Xoá bộ phận này? Các nhóm và người dùng liên quan sẽ mất liên kết bộ phận.")) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    if (res.ok) setDepartments((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <Card title="Bộ phận">
      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên bộ phận mới"
          className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          onClick={create}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] active:opacity-90 disabled:opacity-60 disabled:hover:bg-accent"
        >
          Thêm
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 font-medium">Tên</th>
            <th className="py-2 font-medium">Số nhóm</th>
            <th className="py-2 font-medium">Số người</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id} className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/5">
              <td className="py-2 font-medium">{d.name}</td>
              <td className="py-2">{d.teamCount}</td>
              <td className="py-2">{d.userCount}</td>
              <td className="py-2 text-right">
                <button onClick={() => remove(d.id)} className="text-xs text-[#d03b3b] transition-colors hover:underline">
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function TeamsTab({
  teams,
  setTeams,
  departments,
}: {
  teams: TeamRow[];
  setTeams: React.Dispatch<React.SetStateAction<TeamRow[]>>;
  departments: DepartmentRow[];
}) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || !departmentId) return;
    setBusy(true);
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, departmentId }),
    });
    setBusy(false);
    if (res.ok) {
      const { team } = await res.json();
      const dept = departments.find((d) => d.id === departmentId);
      setTeams((prev) => [
        ...prev,
        { id: team.id, name: team.name, departmentId, departmentName: dept?.name ?? "", userCount: 0 },
      ]);
      setName("");
    }
  }

  async function remove(id: string) {
    if (!confirm("Xoá nhóm này?")) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    if (res.ok) setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <Card title="Nhóm">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên nhóm mới"
          className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          onClick={create}
          disabled={busy || !departmentId}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] active:opacity-90 disabled:opacity-60 disabled:hover:bg-accent"
        >
          Thêm
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 font-medium">Tên nhóm</th>
            <th className="py-2 font-medium">Bộ phận</th>
            <th className="py-2 font-medium">Số người</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id} className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/5">
              <td className="py-2 font-medium">{t.name}</td>
              <td className="py-2 text-[var(--text-secondary)]">{t.departmentName}</td>
              <td className="py-2">{t.userCount}</td>
              <td className="py-2 text-right">
                <button onClick={() => remove(t.id)} className="text-xs text-[#d03b3b] transition-colors hover:underline">
                  Xoá
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
  teams,
}: {
  users: UserRow[];
  setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
  departments: DepartmentRow[];
  teams: TeamRow[];
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" as Role, departmentId: "", teamId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    if (!form.name || !form.email || form.password.length < 8) {
      setError("Điền đủ tên, email và mật khẩu (tối thiểu 8 ký tự).");
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
        teamId: form.teamId || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { user } = await res.json();
      setUsers((prev) => [
        ...prev,
        { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId, departmentId: user.departmentId, createdAt: user.createdAt },
      ]);
      setForm({ name: "", email: "", password: "", role: "MEMBER", departmentId: "", teamId: "" });
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể tạo người dùng.");
    }
  }

  async function updateUser(id: string, patch: Partial<Pick<UserRow, "role" | "departmentId" | "teamId">>) {
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
    if (!confirm("Xoá người dùng này? Toàn bộ dữ liệu phiên liên quan sẽ bị xoá.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <Card title="Người dùng">
      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-6">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Họ tên"
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent md:col-span-1"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email"
          type="email"
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent md:col-span-1"
        />
        <input
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="Mật khẩu tạm"
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
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          value={form.departmentId}
          onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, teamId: "" }))}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">— Bộ phận —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={form.teamId}
          onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">— Nhóm —</option>
          {teams
            .filter((t) => !form.departmentId || t.departmentId === form.departmentId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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
          Tạo tài khoản
        </button>
        {error && <span className="text-xs text-[#d03b3b]">{error}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pr-3 font-medium">Tên</th>
              <th className="py-2 pr-3 font-medium">Email</th>
              <th className="py-2 pr-3 font-medium">Vai trò</th>
              <th className="py-2 pr-3 font-medium">Bộ phận</th>
              <th className="py-2 pr-3 font-medium">Nhóm</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/5">
                <td className="py-2 pr-3 font-medium">{u.name}</td>
                <td className="py-2 pr-3 text-[var(--text-secondary)]">{u.email}</td>
                <td className="py-2 pr-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                    className="rounded-md border border-[var(--border)] bg-transparent px-1.5 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
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
                <td className="py-2 pr-3">
                  <select
                    value={u.teamId ?? ""}
                    onChange={(e) => updateUser(u.id, { teamId: e.target.value || null })}
                    className="rounded-md border border-[var(--border)] bg-transparent px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {teams
                      .filter((t) => !u.departmentId || t.departmentId === u.departmentId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => remove(u.id)} className="text-xs text-[#d03b3b] transition-colors hover:underline">
                    Xoá
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
