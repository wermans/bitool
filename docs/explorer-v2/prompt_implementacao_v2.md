# Prompt de implementação — BiTool Explorer v2 (paridade Looker)

Cole o bloco abaixo no VS Code / assistente de código. Ele assume que a spec completa
(`spec_explorer_v2.md`) e o wireframe (`wireframe_explorer_v2.svg`) estão disponíveis
para consulta.

---

```
Contexto
--------
BiTool é um BI interno sobre camada semântica Cube.js. A tela "Explorer" é um query
builder ad-hoc. Vou redesenhá-la para ter paridade de interface e usabilidade com o
Looker Explore (Google Cloud), mantendo o vocabulário do Looker: "Domain" (= cube do
Cube.js), Filters, Visualization, Data / Results / SQL, Quick Start, "Todos os campos"
/ "Em uso". Preserve toda a lógica de query já existente; a mudança é de UI/UX e de
realocação de componentes.

Estrutura alvo da tela
----------------------
TOP BAR: contagem de linhas + tempo da query ("500 linhas · 4.31s") com link "Ver
detalhes de performance"; idade dos dados; seletor de Time Zone; botão Run; menu de
engrenagem "Ações".

PAINEL ESQUERDO (Field Picker):
- Título = nome do Domain ativo + ícone ⚡ Quick Start + botão ‹ para colapsar o painel.
- "Encontrar um campo" + link "Opções de busca" (popover p/ restringir escopo da busca).
- Campo de busca. A busca sempre mostra o Domain como cabeçalho de grupo acima dos
  campos correspondentes (dimensões antes de measures).
- Abas: "Todos os campos" (default) e "Em uso".
- Campos agrupados por Domain (nós expansíveis) com badge de contagem de campos usados.
  Subseções por Domain, nesta ordem: FILTER-ONLY FIELDS, DIMENSÕES, MEASURES. Grupo
  "Campos personalizados" no topo com botão "+ Adicionar".
- Ícones ao passar o mouse em cada campo: pivot, filtrar-por-campo, info (tooltip com
  tipo + descrição + nome técnico domain.campo), e "⋮ mais". Campo selecionado fica
  com fundo destacado (dimensão azul claro, measure âmbar claro).
- Rodapé: "N campos | N exibidos" + link "Ir para camada semântica".

PAINEL DIREITO: exatamente 3 seções colapsáveis, nesta ordem vertical fixa. Cabeçalho
da seção fica ESCURO quando expandida e claro quando recolhida.

  1) Filters — builder campo → operador → valor. Multiseleção vira chips. Trilho AND/OR
     à esquerda; botões "+ Filtro", "+ Novo grupo", "+ Expressão personalizada".
     IMPORTANTE: reaproveitar o componente de filtro já usado nos Dashboards.

  2) Visualization — cabeçalho contém a barra de tipos de gráfico (tabela, barras,
     colunas, área, linha, dispersão, pizza, single value, ...), rótulo do tipo ativo,
     "···" (mais tipos), "Forecast" e "Edit". Corpo renderiza a viz a partir dos dados.
     Trocar o tipo NÃO dispara novo Run (usa dados já carregados).

  3) Data — cabeçalho com abas: Data | Results | SQL | + Adicionar cálculo. À direita:
     input "Row Limit" (default 500) e checkbox "Totais".
     - Results: tabela (colunas coloridas por tipo, ícone de ordenação, "⚙ por coluna"
       com ordenar/esconder/formatar/copiar valores). Banner "Limite de linhas atingido"
       quando o resultado bate no Row Limit. Nulos exibidos como ∅.
     - SQL: query gerada (read-only, com highlight, botão copiar).
     - "+ Adicionar cálculo": editor de coluna calculada / cálculo de tabela. É aqui que
       vive o antigo bloco "% do total".

MENU "Ações" (engrenagem, conforme permissão): Salvar (como bloco em dashboard novo/
existente ou como item salvo), Download (CSV/Excel/JSON), Enviar, Salvar e programar,
Compartilhar (URL), Obter URL de incorporação, Obter SQL/definição, Combinar resultados
(substitui o antigo "Mesclar com outro gráfico"), Remover campos e filtros, Limpar cache
e atualizar.

Motor de dados: Cube.dev
------------------------
O sistema roda sobre Cube.dev (agregação + modelagem de dimensões/fatos). A UX é a do
Looker, mas o backend é o Cube. Traduzir:
- Domain = cube; Dimensão = dimension; Measure = measure.
- A query da tela é um Cube Query { measures, dimensions, filters, timeDimensions,
  order, limit } enviado a /cubejs-api/v1/load.
- Filtro = item em `filters` { member, operator, values }; datas via
  `timeDimensions[].dateRange`. Operadores: equals, notEquals, contains, gt, gte, lt,
  lte, set, notSet, inDateRange...
- PIVOT NÃO muda a query: é `pivotConfig` aplicado ao resultSet (tablePivot/chartPivot).
  Por isso Column Limit e Row Totals só aparecem quando há pivot.
- Aba SQL mostra resultSet.sql() (read-only).
- Typeahead de valores de filtro = query de distinct values da dimensão via /v1/load.
- Preview de custo: usar cache hit / pre-aggregations do Cube; se não houver estimativa
  de bytes, mostrar só "resultado do cache".

Comportamento / execução — DECIDIDO: Run manual (padrão Looker)
--------------------------------------------------------------
- Mudanças (adicionar campo, filtro, pivot, alterar limits) marcam a query como STALE e
  NÃO re-executam sozinhas; o botão Run fica realçado e mostra o preview de custo ao lado.
- A idade dos dados indica desatualização até o clique em Run.
- Durante a execução: Run vira Stop (vermelho) + spinner; área mostra "Carregando dados...".
- Estado inicial/limpo: "Pressione Run para explorar os dados".
- Trocar tipo de visualização NÃO exige novo Run (usa dados já carregados).
- Colapsar painel esquerdo via ‹ com slide horizontal ~150ms.
- Pivotar (ícone de pivot no hover do campo, tooltip "Pivotar dados") transforma os
  valores da dimensão em colunas agrupadas sobre as measures.

Escopo desta entrega (Fase 1)
-----------------------------
Field picker completo (Domains, busca hierárquica, abas Todos/Em uso, ícones de hover);
as 3 seções (Filters, Visualization, Data com abas Results/SQL/+cálculo, Row Limit,
Totais); menu Ações com Salvar/Download/Compartilhar/Obter SQL/Combinar/Limpar cache.

Fora de escopo agora (Fase 2, deixar como TODO): drill-down ao clicar em célula;
links/ações de dados com reticências (…); Quick Start; Opções de busca com escopo
avançado; Forecast; editor avançado de visualização (Edit); certificação de conteúdo.

Requisitos não-funcionais
-------------------------
- Preservar 100% da funcionalidade atual, apenas realocando (colunas calculadas → +
  Adicionar cálculo em Data; mesclar gráfico → Combinar resultados no menu Ações; nome
  do gráfico + Space + salvar → menu Ações/rodapé).
- Manter acessibilidade (navegação por teclado nas abas/seções, aria nos accordions).
- Componentizar: FieldPicker, DomainTree, FieldRow, FiltersSection, VizSection,
  DataSection (com TabsResults/SQL/Calc), ActionsMenu, TopBar.
```

---

## Como conduzir a implementação (sugestão de ordem)

1. **TopBar + shell de layout** (grid esquerda/direita, 3 seções colapsáveis vazias).
2. **FieldPicker** (Domains, busca hierárquica, abas, ícones de hover, seleção destacada).
3. **DataSection** (abas Data/Results/SQL/+cálculo, Row Limit, Totais, tabela) — realocar a tabela atual.
4. **FiltersSection** (reusar componente dos Dashboards).
5. **VizSection** (barra de tipos + realocar barra de ícones atual).
6. **ActionsMenu** (menu da engrenagem).
7. **Polimento** (estados stale/Run, animações de colapso, banner de limite, ∅).
