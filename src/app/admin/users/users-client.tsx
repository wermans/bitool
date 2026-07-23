"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  authMethod: string;
  roleId: string | null;
  roleName: string | null;
};

type RoleOption = { id: string; name: string };

export function UsersClient({
  initialUsers,
  roles,
}: {
  initialUsers: UserRow[];
  roles: RoleOption[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);

  async function updateUser(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                ...data,
                roleName:
                  roles.find((r) => r.id === updated.roleId)?.name ?? null,
              }
            : u
        )
      );
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreate((s) => !s)}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        {showCreate ? "Cancelar" : "Novo usuário"}
      </button>

      {showCreate && (
        <CreateUserForm
          roles={roles}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Ativo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {u.name}
                  {u.isSuperAdmin && (
                    <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs text-amber-900">
                      super-admin
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.authMethod}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.roleId ?? ""}
                    onChange={(e) =>
                      updateUser(u.id, { roleId: e.target.value || null })
                    }
                    className="rounded-md border border-border bg-background px-2 py-1"
                  >
                    <option value="">Sem role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={u.isActive}
                    onChange={(e) =>
                      updateUser(u.id, { isActive: e.target.checked })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-sm font-medium text-primary underline"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserForm({
  roles,
  onCreated,
}: {
  roles: RoleOption[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, roleId: roleId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Erro ao criar usuário."
      );
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2"
    >
      <input
        required
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        required
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        required
        type="password"
        minLength={8}
        placeholder="Senha inicial"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <select
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">Sem role</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:col-span-2"
      >
        {loading ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
