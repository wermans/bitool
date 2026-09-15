"use client";

import * as Dialog from "@radix-ui/react-dialog";

type Space = { id: string; name: string };

/**
 * Modal "Salvar" do menu ⚙ Ações — Título + Space + Salvar. Equivalente
 * simplificado do "Add to a Dashboard" do Looker (sem a árvore de pastas,
 * que fica pra uma fase futura de profundidade — spec seção 8, Fase 2).
 */
export function SaveDialog({
  open,
  onOpenChange,
  chartName,
  onChartNameChange,
  spaceId,
  onSpaceIdChange,
  spaces,
  onSave,
  saving,
  canSave,
  saveLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartName: string;
  onChartNameChange: (v: string) => void;
  spaceId: string;
  onSpaceIdChange: (v: string) => void;
  spaces: Space[];
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  saveLabel: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-md border border-border bg-background p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-sm font-semibold">Salvar gráfico</Dialog.Title>

          <div className="space-y-1">
            <label className="text-xs font-medium">Nome do gráfico</label>
            <input
              value={chartName}
              onChange={(e) => onChartNameChange(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Space</label>
            <select
              value={spaceId}
              onChange={(e) => onSpaceIdChange(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                Cancelar
              </button>
            </Dialog.Close>
            <button
              onClick={onSave}
              disabled={!canSave || saving}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Salvando..." : saveLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
