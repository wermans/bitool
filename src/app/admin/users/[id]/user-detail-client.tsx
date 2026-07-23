"use client";

import { useState } from "react";

type Group = { id: string; name: string };
type Attribute = { id: string; name: string };

export function UserDetailClient({
  userId,
  selectedGroupIds,
  groups,
  attributes,
  attributeValues,
}: {
  userId: string;
  selectedGroupIds: string[];
  groups: Group[];
  attributes: Attribute[];
  attributeValues: Record<string, string[]>;
}) {
  const [groupIds, setGroupIds] = useState<string[]>(selectedGroupIds);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      attributes.map((a) => [a.id, (attributeValues[a.id] ?? []).join(", ")])
    )
  );
  const [savingGroups, setSavingGroups] = useState(false);
  const [savingAttrs, setSavingAttrs] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleGroup(id: string) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function saveGroups() {
    setSavingGroups(true);
    await fetch(`/api/admin/users/${userId}/groups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds }),
    });
    setSavingGroups(false);
    setMessage("Grupos atualizados.");
  }

  async function saveAttributes() {
    setSavingAttrs(true);
    const payload = Object.fromEntries(
      Object.entries(values).map(([attrId, raw]) => [
        attrId,
        raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      ])
    );
    await fetch(`/api/admin/users/${userId}/attributes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingAttrs(false);
    setMessage("Atributos (RLS) atualizados.");
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="space-y-3 rounded-md border border-border p-4">
        <h3 className="font-medium">Grupos</h3>
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum grupo cadastrado ainda.
          </p>
        )}
        <div className="space-y-2">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={groupIds.includes(g.id)}
                onChange={() => toggleGroup(g.id)}
              />
              {g.name}
            </label>
          ))}
        </div>
        <button
          onClick={saveGroups}
          disabled={savingGroups}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {savingGroups ? "Salvando..." : "Salvar grupos"}
        </button>
      </section>

      <section className="space-y-3 rounded-md border border-border p-4">
        <h3 className="font-medium">Atributos de RLS</h3>
        <p className="text-xs text-muted-foreground">
          Valores separados por vírgula. Repassados ao Cube.js como
          securityContext.userAttributes.
        </p>
        {attributes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum atributo cadastrado ainda — crie em /admin/attributes.
          </p>
        )}
        <div className="space-y-2">
          {attributes.map((a) => (
            <div key={a.id} className="space-y-1">
              <label className="text-xs font-medium">{a.name}</label>
              <input
                value={values[a.id] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [a.id]: e.target.value }))
                }
                placeholder="ex: BR-SP, BR-RJ"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        {attributes.length > 0 && (
          <button
            onClick={saveAttributes}
            disabled={savingAttrs}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingAttrs ? "Salvando..." : "Salvar atributos"}
          </button>
        )}
      </section>

      {message && (
        <p className="text-sm text-green-700 sm:col-span-2">{message}</p>
      )}
    </div>
  );
}
