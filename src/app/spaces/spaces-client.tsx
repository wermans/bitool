"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SpaceRow = {
  id: string;
  name: string;
  type: "PERSONAL" | "PUBLIC" | "PRIVATE";
  isPinned: boolean;
  ownerName: string | null;
  isOwner: boolean;
};

const TYPE_LABELS: Record<SpaceRow["type"], string> = {
  PERSONAL: "Pessoal",
  PUBLIC: "Público",
  PRIVATE: "Privado",
};

export function SpacesClient({ initialSpaces }: { initialSpaces: SpaceRow[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const groups: SpaceRow["type"][] = ["PUBLIC", "PRIVATE", "PERSONAL"];

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowCreate((s) => !s)}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        {showCreate ? "Cancelar" : "Novo space"}
      </button>

      {showCreate && (
        <CreateSpaceForm onCreated={() => { setShowCreate(false); router.refresh(); }} />
      )}

      {groups.map((type) => {
        const items = initialSpaces.filter((s) => s.type === type);
        if (items.length === 0) return null;
        return (
          <section key={type} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {TYPE_LABELS[type]}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Link
                  key={s.id}
                  href={`/spaces/${s.id}`}
                  className="rounded-md border border-border p-4 hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.isPinned && <span className="text-xs">📌</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    dono: {s.ownerName}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {initialSpaces.length === 0 && !showCreate && (
        <p className="text-sm text-muted-foreground">
          Nenhum space ainda. Crie o primeiro acima.
        </p>
      )}
    </div>
  );
}

function CreateSpaceForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceRow["type"]>("PUBLIC");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Erro ao criar space.");
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
        placeholder="Nome do space"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SpaceRow["type"])}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="PUBLIC">Público</option>
        <option value="PRIVATE">Privado (por grupo)</option>
        <option value="PERSONAL">Pessoal</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Criando..." : "Criar space"}
      </button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}
