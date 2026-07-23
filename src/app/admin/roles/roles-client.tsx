"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Permission = { id: string; action: string; subject: string };
type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
};

const ACTIONS = ["view", "create", "update", "delete"];

export function RolesClient({
  initialRoles,
  permissions,
}: {
  initialRoles: Role[];
  permissions: Permission[];
}) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const wildcard = permissions.find(
    (p) => p.action === "manage" && p.subject === "all"
  );
  const subjects = Array.from(
    new Set(permissions.filter((p) => p.subject !== "all").map((p) => p.subject))
  ).sort();

  function permissionId(subject: string, action: string) {
    return permissions.find((p) => p.subject === subject && p.action === action)?.id;
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta role?")) return;
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível remover.");
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreate((s) => !s)}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        {showCreate ? "Cancelar" : "Nova role"}
      </button>

      {showCreate && (
        <CreateRoleForm
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      <div className="space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-md border border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium">{role.name}</span>
                {role.isSystem && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    nativa
                  </span>
                )}
                {role.description && (
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setExpandedId((id) => (id === role.id ? null : role.id))
                  }
                  className="text-sm font-medium text-primary underline"
                >
                  {expandedId === role.id ? "Fechar" : "Permissões"}
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="text-sm text-red-600 underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            {expandedId === role.id && (
              <PermissionMatrix
                role={role}
                subjects={subjects}
                wildcardId={wildcard?.id}
                permissionId={permissionId}
                onSaved={(permissionIds) =>
                  setRoles((prev) =>
                    prev.map((r) =>
                      r.id === role.id ? { ...r, permissionIds } : r
                    )
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionMatrix({
  role,
  subjects,
  wildcardId,
  permissionId,
  onSaved,
}: {
  role: Role;
  subjects: string[];
  wildcardId: string | undefined;
  permissionId: (subject: string, action: string) => string | undefined;
  onSaved: (permissionIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(role.permissionIds)
  );
  const [saving, setSaving] = useState(false);

  function toggle(id: string | undefined) {
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const permissionIds = Array.from(selected);
    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds }),
    });
    setSaving(false);
    if (res.ok) onSaved(permissionIds);
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {wildcardId && (
        <label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={selected.has(wildcardId)}
            onChange={() => toggle(wildcardId)}
          />
          Acesso total (manage:all)
        </label>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Subject</th>
              {ACTIONS.map((action) => (
                <th key={action} className="px-2 py-1 text-left">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject} className="border-t border-border">
                <td className="px-2 py-1 font-mono text-xs">{subject}</td>
                {ACTIONS.map((action) => {
                  const id = permissionId(subject, action);
                  return (
                    <td key={action} className="px-2 py-1">
                      <input
                        type="checkbox"
                        disabled={!id}
                        checked={id ? selected.has(id) : false}
                        onChange={() => toggle(id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar permissões"}
      </button>
    </div>
  );
}

function CreateRoleForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Erro ao criar role."
      );
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-3"
    >
      <input
        required
        placeholder="Nome da role"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Criando..." : "Criar role"}
      </button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}
