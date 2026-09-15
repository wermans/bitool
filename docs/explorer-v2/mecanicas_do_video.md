# Mecânicas confirmadas pelo vídeo (Tutoriel Looker Data Explorer — Alexis Vildier)

> Extraí frames do vídeo (1 quadro/5s) e li tela a tela. Abaixo, cada mecânica de
> interface/animação **confirmada visualmente**, com o timestamp aproximado onde
> aparece. Isto substitui os pontos que na spec v2 estavam marcados como
> "⚠️VERIFICAR-VÍDEO". O tutorial cobre o fluxo: login → seleção de Explore →
> montar query → visualização (single value e barras) → customizar (Edit) →
> salvar em dashboard. **Não** houve construção de filtros na tela (a seção Filters
> ficou recolhida o tempo todo), então as mecânicas de Filters seguem baseadas na
> documentação oficial.

## Seleção de Explore / Domain (≈15s, 110s)
- Há uma tela/menu **"Explore"** com busca **"Find an Explore"** e os Explores
  agrupados por modelo (ex.: *E-Commerce Training* → Events, Order Items; *FAA* →
  Airports, Flights; *Looker Basics* → Fruit Basket). Alguns itens têm ícone **ⓘ**.
- → No BiTool: este é o seletor de **Domain**. Vale ter a mesma busca "Encontrar um
  Domain" e agrupamento por modelo/pasta.

## Estado inicial do Explore (20s)
- Painel esquerdo: nome do Domain + **‹ colapsar**, "Search Fields Below", abas
  **All Fields / In Use**, grupo **Custom Fields (+ Add)**, depois o Domain
  expandido com subseções **DIMENSIONS** e **MEASURES**.
- Painel direito: 3 seções **recolhidas** com cabeçalho claro — **Filters**,
  **Visualization**, **Data**. A barra **Data** já mostra abas **Data | Results |
  SQL**, **Add calculation**, **Row Limit (500)**, **Totals**.
- Área central com empty state: **"Select some dimensions or measures."**
- Rodapé esquerdo: **"17 fields"** + **"Go to LookML"**.

## Cores por tipo de campo (confirmado 20s–135s)
- **Dimensões**: texto **preto/escuro**; quando viram coluna, cabeçalho **azul claro**.
- **Measures**: texto **laranja/âmbar** na lista; coluna com cabeçalho **âmbar/tan**.
- Campo **selecionado** na lista fica com **fundo destacado** (dim = azul claro,
  measure = âmbar claro).

## Ícones de hover por campo (25s, 120s)
- Ao passar o mouse num campo aparecem, à direita: **filtrar** (funil), **ⓘ info**,
  **⋮ mais** (e para dimensões, o ícone de **pivot**). Confirmado sobre "Average
  Elevation" (25s) e "Facility Type" (120s).

## Execução da query — Run / Stop (30s, 130s)
- Ao adicionar um campo, a query roda. Durante a execução:
  - A aba do navegador muda para **"(Running) - Explore..."**.
  - O botão **Run** vira **Stop** (vermelho) com spinner ao lado.
  - Área de dados mostra **"Loading Data..."** com spinner.
- Ao concluir, topo mostra **"N rows · 0.9s · just now"** e o botão volta a **Run**.

## Preview de custo antes de rodar (125s, 145s) — recurso interessante
- Quando a query está *stale*, ao lado do **Run** aparece uma estimativa:
  - **"Will process 463.9 KB"** (primeira execução), ou
  - **"Will fetch 5 rows from cache"** (quando o resultado virá do cache).
- → Ótimo para portar ao BiTool/Cube.js: mostrar custo/origem (cache vs. query) antes do Run.

## Seção Visualization + barra de tipos (35s em diante)
- Cabeçalho **escuro** quando aberta, com **barra de ícones de tipo de gráfico**
  (tabela, colunas, barras, área, linha, dispersão, pizza, mapa, single value...),
  seguido de **···** (mais), **Forecast** e **Edit** + engrenagem/▾.
- Trocar o tipo de gráfico é **imediato**, sem novo Run (usa os dados já carregados).

## Painel "Edit" da visualização (40s–55s, 145s–195s)
Painel lateral direito dentro de Visualization, com **abas que mudam conforme o tipo**:
- **Single value** → abas **Style · Comparison · Formatting**. Campos: *Collection*
  (dropdown, ex. "Shoreline"), *Value Color* (com **paleta** de cores + aba Custom),
  *Show Title* (toggle), *Title Override* (input), *Value Format* ("Spreadsheet-style
  format code").
- **Barras** → abas **Plot · Series · Values · X · Y**. Campos vistos: *Series
  Positioning* (Grouped / Stacked / Stacked Percentage), *Grid Layout*, *Inner
  Spacing*, *Value Labels* (toggle), *Label Null Columns*, *Value Colors*, *Font Size*;
  e em **X/Y**: *Configure Axes* (Top/Bottom), *Scale Type* (Linear / Logarithmic),
  *Show Axis Name*, *Show Axis Values*, *Unpin Axis From Zero*, *Axis Name*, *Axis Format*.
- → No BiTool: o editor de visualização deve ter **abas contextuais por tipo de
  gráfico**, não um formulário único.

## Ordenação na tabela (135s)
- Cabeçalho de coluna mostra **seta de ordenação** (ex.: "Airports Average Elevation ↓")
  — clicar ordena asc/desc. Cada coluna tem **⚙** próprio.

## Menu de Ações (engrenagem) — conteúdo exato (60s)
Ordem e atalhos confirmados:
- **Save...** → submenu: *As a new dashboard* (⇧⌘S), *To an existing dashboard* (⌘M),
  *As a Look*.
- **Download** (⌘L)
- **Send** (⌥⇧S)
- **Save and schedule** (⌥⇧M)
- **Share** (⌘U)
- **Get LookML** (⌘A) → no BiTool: **"Obter definição / SQL"**.
- **Merge results**
- **Remove fields and filters** (⌘K)
- **Clear cache and refresh** (⇧⌘↵)
- Tooltip do ícone: **"Explore actions"**.

## Fluxo "Salvar em dashboard" (65s–95s)
- Modal **"Add to a Dashboard in this folder"**, cabeçalho informa o tipo da viz
  ("The selected visualization is [ícone] Single Value").
- Campos: **Title** (input), **Folder** (árvore de pastas: Shared → Developer Student,
  Users, LookML Dashboards...), lista de dashboards da pasta com **Filter by title...**.
- Botões: **New Dashboard** (abre prompt "Enter the new Dashboard name:") e **Save to
  Dashboard**.
- Após salvar: **banner verde** de sucesso — *"'Average elevation' has been added to
  the 'Airports/Flights' Dashboard."* com link para o dash e **✕** para dispensar.

## Dashboard de destino (100s, 220s–230s)
- Tiles em modo de edição com **Add Tile / Filters / Settings / Cancel / Save**.
- Cada tile tem **handle de arrastar** (⠿) e **⋮** de opções; redimensionável pelo canto.

---

## O que NÃO apareceu no vídeo (manter da documentação)
- Construção de **Filters** (campo → operador → valor, AND/OR, grupos, expressão).
- **Drill-down** ao clicar numa célula.
- **Quick Start** (⚡) em ação.
- **Pivot** aplicado (o ícone existe, mas não foi acionado nos frames).

## Recomendações novas para a spec (vindas do vídeo)
1. Adotar **preview de custo/origem** ao lado do Run ("Vai processar X" / "Vai buscar N
   linhas do cache").
2. Botão **Run ↔ Stop** com spinner e "Loading Data..." durante execução.
3. **Editor de visualização com abas contextuais por tipo** (Style/Comparison/Formatting
   p/ single value; Plot/Series/Values/X/Y p/ barras) — não um único formulário.
4. **Banner verde de sucesso** ao salvar em dashboard, com link para o destino.
5. **Empty state** exatamente "Selecione dimensões ou measures." (não "Selecione um Domain").
6. Modal de salvar com **árvore de pastas + filtro por título + New Dashboard**.
