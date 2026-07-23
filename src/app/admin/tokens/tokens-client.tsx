"use client";

import { useState } from "react";

type Pat = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type ServiceAccount = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  expiresAt: string | null;
  roleId: string | null;
  createdAt: string;
};

type Role = { id: string; name: string };

export function TokensClient({
  myTokens,
  serviceAccounts,
  roles,
  canManageServiceAccounts,
}: {
  myTokens: Pat[];
  serviceAccounts: ServiceAccount[];
  roles: Role[];
  canManageServiceAccounts: boolean;
}) {
  return (
    <>
      <PatSection initialTokens={myTokens} />
      {canManageServiceAccounts && (
        <ServiceAccountsSection
          initialAccounts={serviceAccounts}
          roles={roles}
        />
      )}
    </>
  );
}

function RevealedToken({ token }: { token: string }) {
  return (
    <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="mb-1 font-medium">
        Copie agora — este valor não será mostrado novamente:
      </p>
      <code className="break-all">{token}</code>
    </div>
  );
}

function PatSection({ initialTokens }: { initialTokens: Pat[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/tokens/pat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setRevealed(data.token);
      setTokens((prev) => [
        {
          id: data.id,
          name: data.name,
          lastUsedAt: null,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
        },
        ...prev,
      ]);
      setName("");
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revogar este token?")) return;
    const res = await fetch(`/api/admin/tokens/pat/${id}`, { method: "DELETE" });
    if (res.ok) setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <section className="space-y-3">
      <h3 className="font-medium">Personal Access Tokens</h3>
      <form onSubmit={create} className="flex gap-2">
        <input
          required
          placeholder="Nome do token"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Gerando..." : "Gerar token"}
        </button>
      </form>
      {revealed && <RevealedToken token={revealed} />}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Criado em</th>
              <th className="px-3 py-2">Último uso</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2">
                  {new Date(t.createdAt).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">
                  {t.lastUsedAt
                    ? new Date(t.lastUsedAt).toLocaleString("pt-BR")
                    : "nunca"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => revoke(t.id)}
                    className="text-sm text-red-600 underline"
                  >
                    Revogar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ServiceAccountsSection({
  initialAccounts,
  roles,
}: {
  initialAccounts: ServiceAccount[];
  roles: Role[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roleId, setRoleId] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/tokens/service-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, roleId: roleId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Erro ao criar.");
      return;
    }
    const data = await res.json();
    setRevealed(data.token);
    setAccounts((prev) => [data, ...prev]);
    setName("");
    setDescription("");
    setRoleId("");
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/tokens/service-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive } : a))
      );
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta service account?")) return;
    const res = await fetch(`/api/admin/tokens/service-accounts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <section className="space-y-3">
      <h3 className="font-medium">Service Accounts</h3>
      <form
        onSubmit={create}
        className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-4"
      >
        <input
          required
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar"}
        </button>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </form>
      {revealed && <RevealedToken token={revealed} />}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Ativa</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {a.description}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={a.isActive}
                    onChange={(e) => toggleActive(a.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => remove(a.id)}
                    className="text-sm text-red-600 underline"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
