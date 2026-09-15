"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MergeConfigEditor } from "./merge-config-editor";
import type { MergeConfig } from "@/lib/cube-types";

/**
 * "Combinar resultados" do menu ⚙ Ações — mesmo `MergeConfigEditor` que já
 * existia inline na seção Data, só que agora num modal (spec seção 6:
 * "Combinar resultados" é item do menu, não um checkbox fixo na tela).
 */
export function CombineResultsDialog({
  open,
  onOpenChange,
  ownDimensions,
  merge,
  onChange,
  excludeChartId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownDimensions: string[];
  merge: MergeConfig | undefined;
  onChange: (m: MergeConfig | undefined) => void;
  excludeChartId?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-md border border-border bg-background p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-sm font-semibold">Combinar resultados</Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            Junta o resultado desta query com o de outro gráfico salvo, casando pela dimensão
            escolhida em cada lado.
          </Dialog.Description>

          {ownDimensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Selecione ao menos uma dimensão para poder combinar resultados.
            </p>
          ) : (
            <MergeConfigEditor
              ownDimensions={ownDimensions}
              merge={merge}
              onChange={onChange}
              excludeChartId={excludeChartId}
            />
          )}

          <div className="flex justify-end pt-2">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                Fechar
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
