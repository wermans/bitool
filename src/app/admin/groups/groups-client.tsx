"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Group = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
};

export function GroupsClient({ initialGroups }: { initialGroups: Group[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Erro ao criar grupo."
      );
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este grupo? Usuários perdem o acesso vinculado a ele.")) return;
    const res = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    if (res.ok) setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-3"
      >
        <input
          required
          placeholder="Nome do grupo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar grupo"}
        </button>
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Membros</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {g.description}
                </td>
                <td className="px-3 py-2">{g.memberCount}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDelete(g.id)}
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
    </div>
  );
}
