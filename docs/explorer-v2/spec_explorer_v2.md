# Especificação v2 — BiTool Explorer com paridade de UX Looker Explore

> **Meta:** reproduzir a interface e a usabilidade do **Looker Explore** o mais fielmente possível, mantendo os nomes e conceitos do Looker (Domains¹, Filters, Visualization, Data / Results / SQL, Quick Start, In Use, etc.), incluindo ícones, ações e microinterações.
>
> **Fontes desta spec:**
> - [Looker · Como criar e editar análises detalhadas](https://docs.cloud.google.com/looker/docs/creating-and-editing-explores?hl=pt-br) (seção "Seletor de campo")
> - [Looker · Como visualizar e interagir com análises](https://docs.cloud.google.com/looker/docs/viewing-and-interacting-with-explores?hl=pt-br) (anatomia da página, menu de ações, drill-down)
> - Screenshots anexados pelo usuário (anatomia numerada 1–10).
> - Wireframe de apoio: `wireframe_explorer_v2.svg`.
>
> **Atualização (vídeo analisado):** um vídeo tutorial da feature foi processado quadro a quadro. As mecânicas dinâmicas (Run/Stop, cores por tipo, editor de visualização, menu de ações, salvar em dashboard, preview de custo) foram **confirmadas visualmente** e estão detalhadas em `mecanicas_do_video.md`. Os antigos marcadores "⚠️VERIFICAR-VÍDEO" foram resolvidos. O que o vídeo não mostrou (construção de Filters, drill-down, pivot em ação, Quick Start) permanece baseado na documentação oficial.
>
> ¹ "Domain" é o nome que **você** adotou para o cube do Cube.js. No Looker o equivalente chama-se *view/Explore*. Mantemos "Domain" na sua UI e o resto do vocabulário igual ao Looker.

---

## 0. Correção estrutural importante vs. spec v1

A v1 propunha **4 sanfonas** empilhadas (Filters, Charts, Results, SQL). Os screenshots do Looker real mostram que a estrutura correta do painel direito é de **3 seções colapsáveis**, e que Results/SQL **não são seções** — são **abas dentro da seção Data**:

```
┌─ Top bar (row count · tempo · timezone · Run · ⚙ Ações) ─────────────┐
├─ PAINEL ESQUERDO ────────────┬─ PAINEL DIREITO ─────────────────────┤
│  Field Picker (Domains)      │  ▾ Filters            (seção 1)       │
│   - nome do Domain + ⚡       │  ▾ Visualization      (seção 2)       │
│   - busca + Opções de busca  │       [barra de tipos de gráfico]     │
│   - abas Todos / Em uso      │  ▾ Data               (seção 3)       │
│   - grupos por Domain        │     [ Data | Results | SQL | +cálc ]  │
│   - footer: contagem + link  │     [ Row Limit ] [ ☐ Totais ]        │
└──────────────────────────────┴───────────────────────────────────────┘
```

Ordem vertical fixa: **Filters (topo) → Visualization (meio) → Data (base)**. Cada uma expande/colapsa de forma independente; o cabeçalho fica **escuro** quando expandida e **claro/cinza** quando recolhida (padrão Looker).

---

## 0.1 Motor: Cube.dev (mapeamento técnico — importante)

O BiTool roda sobre **Cube.dev** como motor de agregação e modelagem de dimensões/fatos. A UX é a do Looker, mas o backend é o Cube. Traduzir os conceitos de UI assim:

| UI (vocabulário Looker) | Cube.dev |
|---|---|
| **Domain** | **cube** (`cubes:` no data model) |
| Dimensão | **dimension** |
| Measure | **measure** |
| Query montada na tela | objeto **Cube Query** `{ measures, dimensions, filters, timeDimensions, order, limit }` enviado a **`/cubejs-api/v1/load`** |
| Filtro (campo+operador+valor) | item em **`filters`** `{ member, operator, values }` — datas via **`timeDimensions[].dateRange`** |
| Operadores do dropdown | operadores do Cube: `equals`, `notEquals`, `contains`, `gt`, `gte`, `lt`, `lte`, `set`, `notSet`, `inDateRange`... |
| **Pivot** (dimensão → colunas) | **`pivotConfig`** aplicado no `resultSet.tablePivot()/chartPivot()` — o Cube **não** muda a query; o pivot é formatação do resultSet |
| Aba **SQL** | **`resultSet.sql()`** (SQL gerado pelo Cube), read-only |
| Row Limit / Column Limit | **`limit`** da query / limite no pivotConfig |
| Totais / Row Totals | totais no cliente sobre o resultSet |
| Preview "vai processar X / cache" | metadados do Cube: pre-aggregations / cache hit; se o dialeto não expõe bytes, indicar apenas "resultado do cache" |
| **Em uso** | membros presentes na query atual |
| Typeahead de valores no filtro | query de dimensão (distinct values) via `/v1/load` |

Observações-chave:
- **Pivot = `pivotConfig` do resultSet**, não uma query nova → por isso Column Limit/Row Totals só aparecem quando há pivot.
- Filtros de **data** devem preferir **`timeDimensions` + `dateRange`/`granularity`**.
- A aba SQL exibe `resultSet.sql()`.

---

## 1. Top bar

| # | Elemento | Comportamento |
|---|----------|---------------|
| 1 | Contagem de linhas + tempo de execução | "500 linhas · 4.31s". Link **Ver detalhes de performance** abre painel de performance da query. |
| 2 | Idade dos dados | "agora há pouco" / "3 min atrás". Hover → data/hora absoluta. |
| 3 | Time Zone | Seletor de fuso (se habilitado). |
| 4 | **Run** | Executa/re-executa a query. Fica realçado quando a query está *stale*. **Durante a execução vira "Stop" (vermelho) com spinner**, a aba mostra "(Running)" e a área de dados exibe "Loading Data...". **Preview de custo/origem ao lado do Run**: "Vai processar 463.9 KB" (query nova) ou "Vai buscar N linhas do cache" (resultado cacheado). |
| 5 | **⚙ Ações** | Menu de engrenagem (ver seção 6). |

Título "Explorer" à esquerda.

---

## 2. Painel esquerdo — Field Picker (Domains)

### 2.1 Cabeçalho
- **Nome do Domain** ativo em destaque (ex.: `Vendas`).
- **⚡ Quick Start** ao lado do nome — aparece quando o Domain tem consultas modeladas; abre atalhos de análise pré-configurados.
- **‹ (colapsar)** — recolhe todo o painel esquerdo, expandindo a área de dados. Animação: slide horizontal, ~150ms.
- Ícone **ⓘ info** do Domain (opcional) com descrição do cube.

### 2.2 Busca
- Label **"Encontrar um campo"** + link **"Opções de busca"** à direita.
- Campo de busca com placeholder "Comece a digitar para buscar...".
- **Opções de busca** (popover): permite restringir o escopo da busca a — rótulo do campo, descrição do campo, rótulo do grupo, rótulo do Domain. (Equivale ao "Search Options" do Looker.)
- **Comportamento hierárquico:** o resultado sempre exibe o **Domain como cabeçalho de grupo** acima dos campos correspondentes (dimensões antes de measures). Buscar filtra as folhas mas mantém o nó-pai (Domain) visível.

### 2.3 Abas
- **Todos os campos** (default) · **Em uso**.
- **Todos os campos:** lista todos os campos disponíveis, agrupados por Domain, ordenados dimensões→measures.
- **Em uso:** apenas campos já adicionados à query atual.
- Aba ativa com sublinhado azul (padrão Looker).

### 2.4 Grupos por Domain
- Cada Domain é um nó **expansível/colapsável** (▸/▾).
- **Badge de contagem** à direita do nome do Domain = nº de campos daquele Domain atualmente na query (ex.: `Vendas … 2`).
- Subseções internas, nesta ordem, com rótulo em caixa alta cinza:
  - **FILTER-ONLY FIELDS** (campos usados só como filtro, ex. granularidade de data).
  - **DIMENSÕES**.
  - **MEASURES**.
- **Campos personalizados** aparecem como um grupo próprio no topo, com botão **+ Adicionar**.

### 2.5 Estados e ícones por campo (hover) — callout **A**
Ao passar o mouse sobre um campo, aparecem ícones de ação (e ficam fixos/negrito quando ativos):
- **⤢ Pivot** — pivota/despivota o campo. Cinza = inativo, negrito = pivotado.
- **▼ Filtrar por campo** — adiciona/remove o campo como filtro. Cinza = inativo, negrito = filtro ativo.
- **ⓘ Info** — tooltip com: tipo do dado, descrição (se houver) e nome técnico (`domain.campo` no formato Cube.js). Para perfis com permissão, inclui a definição SQL do campo + link para a camada semântica.
- **⋮ Mais** — menu de criação de campo personalizado / cálculo (conforme permissão).
- **Seleção:** campo selecionado fica com **fundo destacado** — dimensões em tom azul claro, measures em tom âmbar/laranja claro (paleta Looker).
- Clicar no nome do campo adiciona/remove da query e dispara re-execução (ou marca a query como *stale* até o Run, conforme configuração — ver 7.1).

### 2.6 Rodapé
- **"N campos | N exibidos"** à esquerda.
- Link **"Ir para camada semântica"** à direita (equivalente ao "Go to LookML"; leva à definição do Domain no Cube.js). Visível conforme permissão.

---

## 3. Seção Filters (seção 1, topo) — **confirmado em vídeo** ("Filtering Looks")

Builder idêntico ao do Looker (e reaproveita o componente de filtros já existente nos Dashboards do BiTool). Cada linha de filtro, da esquerda para a direita:
- **⚙ ícone** + **nome do campo** (ex.: "Products Brand").
- **Operador** (dropdown: "é igual a", "é", "está no ano", "está nos últimos", "está entre", etc., variando por tipo).
- **Campo de valor com autocomplete/typeahead** — ao digitar, abre lista de sugestões (ex.: "Example Brand 1", "Example Brand 10"...). Valor escolhido vira **chip** (`Example Brand 1 ✕`); multiseleção acumula chips.
- **✕** remove o filtro inteiro; **+** adiciona outro valor/condição ao mesmo campo.
- **Checkbox "Filtro personalizado" (Custom Filter)** no canto sup. direito do painel → alterna para modo de **expressão livre**.
- **Trilho AND/OR** à esquerda agrupando condições; clicável para alternar lógica.
- Botões: **+ Filtro**, **+ Novo grupo** (grupo aninhado c/ própria lógica), **+ Expressão personalizada**.
- **Também é possível adicionar um filtro pelo ícone de funil no hover do campo** (no field picker) — o funil fica azul quando ativo.
- Quando o item é apenas visualizado (modo leitura/Look salvo), os filtros ativos aparecem como **chips-resumo** no topo: "Filters (N)" + resumo de cada um.
- Aplicar/alterar filtro dispara re-execução (ou marca *stale*).
- Cabeçalho da seção fica **escuro** quando expandida.

---

## 4. Seção Visualization (seção 2, meio)

- Cabeçalho escuro contém a **barra de tipos de visualização** (ícones): tabela, barras, colunas, área, linha, dispersão, pizza/rosca, single value, mapa, etc. + rótulo do tipo ativo (ex.: "Single Value") + **···** (mais tipos) + **⤳ Forecast** + **⚌ Edit** (editor avançado de configuração do gráfico).
- Corpo: render da visualização escolhida, a partir dos dados da seção Data.
- Trocar o tipo é **instantâneo** (não requer novo Run — usa os dados já carregados). **Confirmado no vídeo.**
- **Editor "Edit"** (painel lateral direito, dentro de Visualization) com **abas contextuais por tipo de gráfico**:
  - *Single value*: abas **Style · Comparison · Formatting** (Collection, Value Color com paleta, Show Title, Title Override, Value Format).
  - *Barras*: abas **Plot · Series · Values · X · Y** (Series Positioning Grouped/Stacked/Stacked%, Grid Layout, Inner Spacing, Value Labels, Value Colors, Font Size; eixos: Scale Type Linear/Log, Show Axis Name/Values, Unpin From Zero, Axis Format).
  - → Implementar como **abas que mudam conforme o tipo**, não um formulário único.

---

## 5. Seção Data (seção 3, base)

Cabeçalho escuro com **abas internas**:
- **Data** (▾ colapsa a seção) · **Results** · **SQL** · **+ Adicionar cálculo**.
- À direita: **Row Limit** (input numérico, default 500) e **☐ Totais** (checkbox que adiciona linha de totais).

### 5.1 Aba Results
- Tabela de dados: colunas = dimensões/measures selecionadas; linhas = resultado.
- **Cabeçalho de coluna** com cor por tipo (dimensão azul, measure âmbar), **ícone de ordenação ⇅** e **⚙ por coluna** (menu: ordenar, esconder, formatar, copiar valores, fixar).
- **Banner de aviso** "Limite de linhas atingido. Resultados podem estar incompletos." quando o resultado bate no Row Limit (dispensável com ✕).
- Numeração de linhas à esquerda.
- Valores nulos exibidos como **∅**.

### 5.2 Aba SQL
- Mostra a **query gerada** (SQL/consulta Cube.js) read-only, com syntax highlight. Botão copiar.

### 5.3 + Adicionar cálculo
- Abre editor de **coluna calculada / cálculo de tabela** (equivalente ao "Add calculation" + "Table calculations" do Looker). É aqui que vive o antigo bloco "% do total" — colado à query, não ao dado bruto. Suporta funções sobre as colunas do resultado.

---

## 6. Menu ⚙ Ações (callout 5)

Reproduzir o "Explore actions gear menu" do Looker, condicionado a permissões:
- **Salvar** → como bloco em novo dashboard / dashboard existente / como Look (item salvo).
- **Download** → resultados em CSV, Excel, JSON, etc.
- **Enviar** → entrega única.
- **Salvar e programar** → entrega recorrente.
- **Compartilhar** → URL curta/expandida da análise.
- **Obter URL de incorporação** → embed.
- **Obter SQL / definição** → equivalente ao "Get LookML"; expõe a query/definição para reuso.
- **Combinar resultados** → merge com outras queries (equivalente ao "Merge results"; substitui o antigo checkbox "Mesclar com outro gráfico").
- **Remover campos e filtros** → limpa a query.
- **Limpar cache e atualizar** → força nova execução ignorando cache.
- **Certificar / Remover certificação** → se certificação de conteúdo estiver ativa.

---

## 7. Interações, estados e microanimações

### 7.1 Modelo de execução — **DECIDIDO: (b) Run manual (padrão Looker)**
- Cada mudança (adicionar campo, filtro, pivot, alterar row/column limit) **marca a query como *stale*** — NÃO re-executa sozinha.
- O botão **Run** fica realçado enquanto houver mudanças não executadas; ao lado dele aparece o **preview de custo/origem** ("Vai processar X" / "Vai buscar N linhas do cache").
- A **idade dos dados** ("agora há pouco" / "3 min atrás") indica desatualização até o usuário clicar em **Run**.
- Durante a execução: botão vira **Stop** (vermelho) + spinner; área de dados mostra "Carregando dados...".
- Estado inicial/limpo mostra "Pressione Run para explorar os dados" (equivalente ao "Press Run to explore this data" do Looker).
- **Trocar o tipo de visualização NÃO exige novo Run** (usa os dados já carregados).

### 7.2 Drill-down (callout B)
- Clicar em qualquer valor de célula abre uma **janela de detalhe** com os registros que compõem aquele agregado.
- Dentro dela: **Analisar a partir daqui** (nova análise usando aqueles campos), **Baixar resultados**, e drill adicional clicando em outro valor.
- Presença de links/ações num valor é indicada por **reticências (…)** após o valor.

### 7.3 Colapsos e transições
- Painel esquerdo colapsa via **‹** (slide horizontal ~150ms).
- Seções Filters/Visualization/Data expandem/colapsam com o cabeçalho alternando escuro↔claro (confirmado no vídeo).
- Ordenação de coluna via seta no cabeçalho (ex.: "Coluna ↓"); cada coluna tem **⚙** próprio (confirmado no vídeo).

### 7.5 Feedback ao salvar (confirmado no vídeo)
- Salvar dispara modal **"Adicionar a um dashboard"** (título + árvore de pastas + filtro por título + botão "Novo dashboard").
- Sucesso mostra **banner verde**: "'X' foi adicionado ao dashboard 'Y'." com link para o destino e ✕ para dispensar.

### 7.4 Pivot — **confirmado em vídeo** ("Working with pivots")
- Acionado pelo **ícone de pivot no hover do campo** (primeiro ícone; tooltip "Pivotar dados").
- A dimensão pivotada vira **grupos de coluna**: o cabeçalho mostra o campo pivotado (ex.: "Product Department ›") e, abaixo, uma coluna por valor (ex.: **Men | Women**), cada uma repetindo a(s) measure(s). A outra dimensão vira as **linhas**.
- A barra **Data** ganha, **somente quando há pivot**, os controles **Column Limit** (input) e **Row Totals** (checkbox), além de Row Limit e Totais.
- A **visualização** reage automaticamente criando **séries** (ex.: barras agrupadas Men/Women com legenda).

---

## 8. Escopo faseado

**Fase 1 (paridade visual + core):** field picker com Domains/busca hierárquica/abas Todos·Em uso; 3 seções (Filters, Visualization, Data com abas Results/SQL/+cálculo); Row Limit; Totais; ícones de hover por campo (pivot/filtrar/info); menu ⚙ Ações com Salvar/Download/Compartilhar/Obter SQL/Combinar/Limpar cache; auto ou manual run.

**Fase 2 (profundidade):** drill-down completo; links/ações de dados (…); Quick Start; Opções de busca com escopo; cálculos de tabela avançados; Forecast; editor avançado de visualização (Edit); certificação de conteúdo; copiar valores de coluna.

---

## 9. Checklist de aceite (Fase 1)

- [ ] Top bar com contagem de linhas, tempo, timezone, Run e ⚙ Ações.
- [ ] Painel esquerdo: nome do Domain + ⚡ Quick Start + colapsar; busca + Opções de busca; abas Todos os campos / Em uso.
- [ ] Campos agrupados por Domain com badge de contagem e subseções FILTER-ONLY / DIMENSÕES / MEASURES.
- [ ] Ícones de hover por campo: pivot, filtrar, info, mais; seleção destacada (dim azul / measure âmbar).
- [ ] Busca mostra o Domain como cabeçalho de grupo.
- [ ] Rodapé "N campos | N exibidos" + link para camada semântica.
- [ ] Painel direito com 3 seções colapsáveis, ordem Filters → Visualization → Data, cabeçalho escuro quando aberto.
- [ ] Filters: builder campo/operador/valor, chips, AND/OR, +Filtro, +Novo grupo, +Expressão (reusa componente de dashboards).
- [ ] Visualization: barra de tipos de gráfico + render sem exigir novo Run.
- [ ] Data: abas Data | Results | SQL | +Adicionar cálculo; Row Limit; Totais; banner de limite; nulos como ∅; ⚙ por coluna.
- [ ] Menu ⚙ Ações com os itens da seção 6 (conforme permissão).
- [ ] Nenhuma funcionalidade atual perdida (colunas calculadas, mesclar, nome do gráfico, Space, salvar) — apenas realocadas.

---

## 10. Prompt de implementação — ver arquivo `prompt_implementacao_v2.md`
