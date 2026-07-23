"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attribute = {
  id: string;
  name: string;
  description: string | null;
  defaultValue: string | null;
};

export function AttributesClient({
  initialAttributes,
}: {
  initialAttributes: Attribute[];
}) {
  const router = useRouter();
  const [attributes, setAttributes] = useState(initialAttributes);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, defaultValue }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Erro ao criar atributo."
      );
      return;
    }
    setName("");
    setDescription("");
    setDefaultValue("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este atributo? Os valores por usuário serão perdidos."))
      return;
    const res = await fetch(`/api/admin/attributes/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setAttributes((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-4"
      >
        <input
          required
          placeholder="Nome (ex: region)"
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
        <input
          placeholder="Valor padrão (opcional)"
          value={defaultValue}
          onChange={(e) => setDefaultValue(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar atributo"}
        </button>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Valor padrão</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {attributes.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono font-medium">{a.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {a.description}
                </td>
                <td className="px-3 py-2">{a.defaultValue}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDelete(a.id)}
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
