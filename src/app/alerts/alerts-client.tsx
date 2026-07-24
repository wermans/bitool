"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/toast";

type HistoryItem = {
  id: string;
  status: "OK" | "TRIGGERED" | "ERROR";
  value: number;
  message: string | null;
  triggeredAt: string;
};

type AlertRow = {
  id: string;
  name: string;
  operator: "GREATER_THAN" | "LESS_THAN" | "EQUALS" | "NOT_EQUALS";
  threshold: number;
  frequencyCron: string;
  recipients: string[];
  isEnabled: boolean;
  lastStatus: "OK" | "TRIGGERED" | "ERROR";
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
  chartName: string;
  history: HistoryItem[];
};

type Chart = { id: string; name: string };

const OPERATOR_LABELS: Record<AlertRow["operator"], string> = {
  GREATER_THAN: "maior que",
  LESS_THAN: "menor que",
  EQUALS: "igual a",
  NOT_EQUALS: "diferente de",
};

const STATUS_STYLES: Record<AlertRow["lastStatus"], string> = {
  OK: "bg-green-100 text-green-800",
  TRIGGERED: "bg-red-100 text-red-800",
  ERROR: "bg-amber-100 text-amber-800",
};

export function AlertsClient({
  canCreate,
  initialAlerts,
  charts,
}: {
  canCreate: boolean;
  initialAlerts: AlertRow[];
  charts: Chart[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function toggleEnabled(id: string, isEnabled: boolean) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isEnabled } : a)));
    } else {
      toast({ title: "Não foi possível atualizar o alerta", variant: "error" });
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover este alerta?")) return;
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Alerta removido", variant: "success" });
    } else {
      toast({ title: "Não foi possível remover o alerta", variant: "error" });
    }
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          {showCreate ? "Cancelar" : "Novo alerta"}
        </button>
      )}

      {showCreate && (
        <CreateAlertForm
          charts={charts}
          onCreated={(alert) => {
            setAlerts((prev) => [{ ...alert, history: [] }, ...prev]);
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
        {alerts.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="rounded-md border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[a.lastStatus]}`}>
                    {a.lastStatus}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.chartName} — dispara quando {OPERATOR_LABELS[a.operator]} {a.threshold} (
                  {a.frequencyCron})
                </p>
                <p className="text-xs text-muted-foreground">
                  destinatários: {a.recipients.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={a.isEnabled}
                    onChange={(e) => toggleEnabled(a.id, e.target.checked)}
                  />
                  ativo
                </label>
                <button
                  onClick={() => setExpandedId((id) => (id === a.id ? null : a.id))}
                  className="text-xs font-medium text-primary underline"
                >
                  histórico
                </button>
                <button onClick={() => remove(a.id)} className="text-xs text-red-600 underline">
                  remover
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedId === a.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 border-t border-border pt-3">
                    {a.history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sem disparos registrados ainda.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {a.history.map((h) => (
                          <li key={h.id}>
                            <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLES[h.status]}`}>
                              {h.status}
                            </span>{" "}
                            {new Date(h.triggeredAt).toLocaleString("pt-BR")} — {h.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        </AnimatePresence>
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum alerta configurado ainda.</p>
        )}
      </div>
    </div>
  );
}

function CreateAlertForm({
  charts,
  onCreated,
}: {
  charts: Chart[];
  onCreated: (alert: Omit<AlertRow, "history">) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [savedChartId, setSavedChartId] = useState("");
  const [operator, setOperator] = useState<AlertRow["operator"]>("LESS_THAN");
  const [threshold, setThreshold] = useState("");
  const [recipients, setRecipients] = useState("");
  const [frequencyCron, setFrequencyCron] = useState("*/15 * * * *");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        savedChartId,
        operator,
        threshold: Number(threshold),
        recipients: recipients.split(",").map((r) => r.trim()).filter(Boolean),
        frequencyCron,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        title: "Erro ao criar alerta",
        description: typeof data.error === "string" ? data.error : undefined,
        variant: "error",
      });
      return;
    }
    const alert = await res.json();
    const chart = charts.find((c) => c.id === savedChartId);
    toast({ title: "Alerta criado", description: name, variant: "success" });
    onCreated({
      id: alert.id,
      name: alert.name,
      operator: alert.operator,
      threshold: alert.threshold,
      frequencyCron: alert.frequencyCron,
      recipients: alert.recipients,
      isEnabled: alert.isEnabled,
      lastStatus: alert.lastStatus,
      lastCheckedAt: alert.lastCheckedAt,
      lastTriggeredAt: alert.lastTriggeredAt,
      chartName: chart?.name ?? "",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
      <input
        required
        placeholder="Nome do alerta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
      />
      <select
        required
        value={savedChartId}
        onChange={(e) => setSavedChartId(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
      >
        <option value="">Selecione o gráfico...</option>
        {charts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={operator}
        onChange={(e) => setOperator(e.target.value as AlertRow["operator"])}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="GREATER_THAN">maior que</option>
        <option value="LESS_THAN">menor que</option>
        <option value="EQUALS">igual a</option>
        <option value="NOT_EQUALS">diferente de</option>
      </select>
      <input
        required
        type="number"
        step="any"
        placeholder="Valor limite"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="Destinatários (e-mails separados por vírgula)"
        value={recipients}
        onChange={(e) => setRecipients(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        value={frequencyCron}
        onChange={(e) => setFrequencyCron(e.target.value)}
        placeholder="Expressão cron (ex: */15 * * * *)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:col-span-2"
      >
        {loading ? "Criando..." : "Criar alerta"}
      </button>
    </form>
  );
}
