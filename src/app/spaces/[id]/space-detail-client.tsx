"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Dashboard = { id: string; name: string; isPinned: boolean };
type Chart = { id: string; name: string; chartType: string; isPinned: boolean };
type Group = { id: string; name: string };
type Access = { groupId: string; access: "VIEW" | "EDIT" };

export function SpaceDetailClient({
  spaceId,
  spaceType,
  isPinned,
  canEdit,
  dashboards,
  charts,
  groups,
  currentAccess,
}: {
  spaceId: string;
  spaceType: "PERSONAL" | "PUBLIC" | "PRIVATE";
  isPinned: boolean;
  canEdit: boolean;
  dashboards: Dashboard[];
  charts: Chart[];
  groups: Group[];
  currentAccess: Access[];
}) {
  const router = useRouter();
  const [pinned, setPinned] = useState(isPinned);
  const [creatingDashboard, setCreatingDashboard] = useState(false);

  async function togglePin() {
    const next = !pinned;
    setPinned(next);
    await fetch(`/api/spaces/${spaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: next }),
    });
    router.refresh();
  }

  async function createDashboard() {
    setCreatingDashboard(true);
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId, name: "Novo dashboard" }),
    });
    setCreatingDashboard(false);
    if (res.ok) {
      const dashboard = await res.json();
      router.push(`/dashboards/${dashboard.id}`);
    }
  }

  return (
    <div className="space-y-8">
      {canEdit && (
        <div className="flex gap-2">
          <button
            onClick={togglePin}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            {pinned ? "Desafixar space" : "Afixar space"}
          </button>
          <button
            onClick={createDashboard}
            disabled={creatingDashboard}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {creatingDashboard ? "Criando..." : "Novo dashboard"}
          </button>
          <Link
            href={`/explore?spaceId=${spaceId}`}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            Novo gráfico
          </Link>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Dashboards
        </h2>
        {dashboards.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum dashboard ainda.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => (
            <Link
              key={d.id}
              href={`/dashboards/${d.id}`}
              className="rounded-md border border-border p-4 hover:bg-muted"
            >
              {d.name} {d.isPinned && "📌"}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Gráficos</h2>
        {charts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum gráfico ainda.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {charts.map((c) => (
            <Link
              key={c.id}
              href={`/explore?chartId=${c.id}`}
              className="rounded-md border border-border p-4 hover:bg-muted"
            >
              {c.name} {c.isPinned && "📌"}
              <p className="text-xs text-muted-foreground">{c.chartType}</p>
            </Link>
          ))}
        </div>
      </section>

      {spaceType === "PRIVATE" && canEdit && (
        <GroupAccessEditor
          spaceId={spaceId}
          groups={groups}
          currentAccess={currentAccess}
        />
      )}
    </div>
  );
}

function GroupAccessEditor({
  spaceId,
  groups,
  currentAccess,
}: {
  spaceId: string;
  groups: Group[];
  currentAccess: Access[];
}) {
  const [access, setAccess] = useState<Record<string, "NONE" | "VIEW" | "EDIT">>(
    () => {
      const map: Record<string, "NONE" | "VIEW" | "EDIT"> = {};
      groups.forEach((g) => {
        map[g.id] = currentAccess.find((a) => a.groupId === g.id)?.access ?? "NONE";
      });
      return map;
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const groupsPayload = Object.entries(access)
      .filter(([, v]) => v !== "NONE")
      .map(([groupId, v]) => ({ groupId, access: v as "VIEW" | "EDIT" }));
    await fetch(`/api/spaces/${spaceId}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: groupsPayload }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Acesso por grupo
      </h2>
      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo cadastrado — crie em /admin/groups.
        </p>
      )}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="flex items-center gap-3 text-sm">
            <span className="w-40">{g.name}</span>
            <select
              value={access[g.id]}
              onChange={(e) =>
                setAccess((prev) => ({
                  ...prev,
                  [g.id]: e.target.value as "NONE" | "VIEW" | "EDIT",
                }))
              }
              className="rounded-md border border-border bg-background px-2 py-1"
            >
              <option value="NONE">Sem acesso</option>
              <option value="VIEW">Visualizar</option>
              <option value="EDIT">Editar</option>
            </select>
          </div>
        ))}
      </div>
      {groups.length > 0 && (
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar acesso"}
        </button>
      )}
      {saved && <p className="text-sm text-green-700">Acesso atualizado.</p>}
    </section>
  );
}
