"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/**
 * Menu ⚙ Ações (spec seção 6) — reproduz o "Explore actions gear menu" do
 * Looker. Itens sem equivalente viável no BiTool hoje (Enviar, Salvar e
 * programar, Compartilhar, Obter URL de incorporação, Certificar) ficam
 * visíveis porém desabilitados com tooltip "em breve" — decisão tomada
 * junto com o usuário ao planejar o Explorer v2, em vez de escondê-los.
 */
export function ActionsMenu({
  onSave,
  canSave,
  onDownloadCsv,
  canDownload,
  onGetSql,
  canGetSql,
  onCombineResults,
  canCombineResults,
  onClearFieldsAndFilters,
  canClearFieldsAndFilters,
  onClearCacheAndRefresh,
  canClearCacheAndRefresh,
}: {
  onSave: () => void;
  canSave: boolean;
  onDownloadCsv: () => void;
  canDownload: boolean;
  onGetSql: () => void;
  canGetSql: boolean;
  onCombineResults: () => void;
  canCombineResults: boolean;
  onClearFieldsAndFilters: () => void;
  canClearFieldsAndFilters: boolean;
  onClearCacheAndRefresh: () => void;
  canClearCacheAndRefresh: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          title="Explore actions"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ⚙
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 rounded-md border border-border bg-background p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <Item onSelect={onSave} disabled={!canSave}>
            Salvar...
          </Item>
          <Item onSelect={onDownloadCsv} disabled={!canDownload}>
            Download (CSV)
          </Item>
          <Item disabled title="Em breve">
            Enviar
          </Item>
          <Item disabled title="Em breve">
            Salvar e programar
          </Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <Item disabled title="Em breve">
            Compartilhar
          </Item>
          <Item disabled title="Em breve">
            Obter URL de incorporação
          </Item>
          <Item onSelect={onGetSql} disabled={!canGetSql}>
            Obter SQL / definição
          </Item>
          <Item onSelect={onCombineResults} disabled={!canCombineResults}>
            Combinar resultados
          </Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <Item onSelect={onClearFieldsAndFilters} disabled={!canClearFieldsAndFilters}>
            Remover campos e filtros
          </Item>
          <Item onSelect={onClearCacheAndRefresh} disabled={!canClearCacheAndRefresh}>
            Limpar cache e atualizar
          </Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <Item disabled title="Em breve">
            Certificar
          </Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Item({
  children,
  onSelect,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={disabled}
      title={disabled ? title ?? "Indisponível" : undefined}
      className="flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-sm outline-none data-[disabled]:cursor-default data-[disabled]:text-muted-foreground/50 data-[highlighted]:bg-muted"
    >
      {children}
    </DropdownMenu.Item>
  );
}
