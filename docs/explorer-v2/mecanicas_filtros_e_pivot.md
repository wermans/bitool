# Mecânicas confirmadas — Filtros e Pivot (2 vídeos analisados)

> Frames extraídos (1 quadro/4s) e lidos tela a tela dos vídeos "Filtering Looks" e
> "Example Working with pivots" (Qwiklabs/Looker). Isto resolve os dois pontos que
> ainda estavam baseados só na documentação. Timestamps aproximados entre parênteses.

---

## A) FILTROS (vídeo "Filtering Looks")

### Onde os filtros aparecem
- Em um **Look salvo** (ex.: "Yearly Revenue"), os filtros ativos aparecem como uma
  linha de **chips resumo** no topo do painel de conteúdo: `Filters (3)` seguido de
  "Products Brand is any value", "Users City is any value", "Users State is any value",
  e ações **"Reset Look"** / **"Explore from Here"** (24s–28s).
- Para editar, entra-se em **Edit mode** ("Edit Look"), que revela o field picker + as
  seções Filters/Visualization/Data (32s em diante).

### Como se adiciona um filtro (a partir do campo)
- No field picker, ao passar o mouse num campo (ex.: dimensão **Brand**) aparecem os
  ícones de ação; o **ícone de funil (filtrar)** adiciona o campo como filtro. Quando
  ativo, o funil fica **azul/destacado** (48s, 80s).

### Painel Filters — builder (Step 3 - Configure filter, 80s–84s)
Cada linha de filtro tem, da esquerda para a direita:
- **⚙ + nome do campo** (ex.: "Products Brand").
- **Dropdown de operador** (ex.: "is equal to" ▾) — varia por tipo de dado.
- **Campo de valor com autocomplete**: ao digitar, abre uma **lista de sugestões**
  (Example Brand 1, Example Brand 10, Example Brand 100, 1000, 1001…). ← typeahead.
- **✕** para remover o filtro inteiro.
- **+** para adicionar mais um valor/condição àquele campo.
- No canto superior direito do painel: checkbox **"Custom Filter"** — alterna para o
  modo de **expressão livre** (filtro customizado por fórmula).

### Valor selecionado vira chip (Step 4 - Process data, 88s–92s)
- Ao escolher "Example Brand 1", o valor aparece como **chip** no campo: `Example Brand 1 ✕`.
- O botão **Run** passa a mostrar o preview de custo, agora "**Will process 15.23 MB
  from cache**".
- Aplicar/rodar reprocessa os dados.

### → Para o BiTool
- Builder de filtro = **campo → operador (dropdown) → valor com typeahead → chips**.
- **Adicionar filtro pelo funil** direto no field picker (além do botão "+ Filtro").
- Checkbox **"Filtro personalizado"** para expressão livre.
- Chips-resumo dos filtros no topo quando o item é visualizado (modo leitura).

---

## B) PIVOT (vídeo "Example Working with pivots")

### Busca hierárquica confirmada (48s–60s)
- Ao buscar "Product Category", a lista mostra os resultados **agrupados sob seus
  Domains**: `Inventory Items → DIMENSIONS → Product Category` e `Products → DIMENSIONS
  → Category`, com o **termo correspondente sublinhado**. Confirma o comportamento de
  busca com cabeçalho de Domain que já estava na spec.
- Estado *stale*: área central diz **"Press 'Run' to explore this data."** e o Run
  mostra "Will process X MB".

### Como se pivota (Example walkthrough 5, 80s–92s)
- No field picker, ao passar o mouse numa **dimensão** (ex.: "Product Department"),
  o **primeiro ícone** é o de **pivot**, com tooltip **"Pivot data"**.
- Clicar nele **pivota** aquela dimensão.

### Resultado do pivot (Example walkthrough 6, 112s–124s)
- A dimensão pivotada vira **grupos de coluna** na tabela: o cabeçalho superior mostra
  "Inventory Items **Product Department** ›" e, abaixo, uma coluna por valor pivotado
  (ex.: **Men** | **Women**), cada uma repetindo a(s) measure(s) ("Order Items Total
  Revenue"). As **linhas** passam a ser a outra dimensão (Product Category: Jeans,
  Fashion Hoodies, Outerwear…).
- A barra **Data** ganha dois controles novos que só existem quando há pivot:
  **"Column Limit"** (input) e **"Row Totals"** (checkbox) — além dos já existentes
  Row Limit e Totals.
- A **visualização** vira automaticamente um gráfico de **séries agrupadas** (barras
  Men em azul, Women em magenta, com legenda embaixo).

### → Para o BiTool
- Pivot é acionado pelo **ícone de pivot no hover do campo** (tooltip "Pivotar dados").
- Efeito na tabela: valores da dimensão pivotada viram **colunas agrupadas** sobre as
  measures; a outra dimensão vira as linhas.
- Exibir **Column Limit** + **Row Totals** apenas quando houver ao menos um pivot.
- A viz deve reagir ao pivot criando **séries** automaticamente.

---

## Resumo do que agora está 100% coberto por vídeo
- Estado inicial, cores por tipo, ícones de hover (pivot/filtrar/info/mais).
- Run/Stop, "Loading Data...", preview de custo (processar X / buscar do cache).
- Seção Visualization + editor Edit com abas por tipo de gráfico.
- Menu de Ações completo + fluxo salvar em dashboard + banner de sucesso.
- **Filtros**: builder campo/operador/valor-typeahead/chips, Custom Filter, chips-resumo.
- **Pivot**: acionamento, layout de colunas agrupadas, Column Limit + Row Totals, viz em séries.
- **Busca hierárquica** por Domain com termo sublinhado.

## Ainda não visto em vídeo (segue da documentação)
- **Drill-down** ao clicar numa célula (janela de detalhe + "Explore from here").
- **AND/OR groups** e **+ Custom expression** no builder de filtros (vistos nos
  screenshots estáticos do Looker, não nestes vídeos).
- **Quick Start (⚡)** em ação.
