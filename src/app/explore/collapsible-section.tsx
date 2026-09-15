"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Shell das 3 seções do painel direito (Filters/Visualization/Data) — padrão
 * Looker: cabeçalho escuro quando expandida, claro/cinza quando recolhida.
 * `headerExtra` (ex.: barra de tipos de gráfico) só aparece com a seção
 * aberta, e fica FORA do botão de toggle para não aninhar elementos
 * interativos dentro de um <button>.
 */
export function CollapsibleSection({
  title,
  headerExtra,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
}: {
  title: string;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  // Modo controlado (opcional) — usado pelo menu ⚙ Ações pra forçar a
  // seção Data aberta (ex.: "Obter SQL"). Sem esses props, o componente
  // segue não-controlado como antes.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;

  function toggle() {
    const next = !open;
    if (onOpenChange) onOpenChange(next);
    else setOpenState(next);
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2 transition-colors ${
          open ? "bg-slate-800" : "bg-muted"
        }`}
      >
        <button
          onClick={toggle}
          className={`flex items-center gap-2 text-sm font-semibold outline-none ${
            open ? "text-white" : "text-foreground"
          }`}
        >
          <span className="text-xs">{open ? "▾" : "▸"}</span>
          {title}
        </button>
        {open && headerExtra && (
          <div className="flex flex-1 items-center justify-end gap-2">{headerExtra}</div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border bg-background p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
