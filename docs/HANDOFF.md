# BiTool — Base de conhecimento para handoff

> Documento escrito para quem está pegando este projeto pela primeira vez e
> precisa assumir a condução técnica. Cobre: o que existe, por que foi
> construído assim, como rodar, e o que **não** está pronto. Sempre que uma
> afirmação aqui puder ficar desatualizada (ex.: "hoje só existe 1 tabela de
> dados"), ela foi escrita para ser verificada no código, não para ser
> tomada como verdade eterna — o código é a fonte de verdade, este documento
> é o mapa.

---

## 0. Leia isto primeiro: estado do repositório

Antes de mais nada, um alerta operacional que não pode ser perdido na
transição: **nem tudo que está descrito neste documento está commitado**.

- Branch `main`: MVP inicial completo (commit `362541d`).
- Branch `develop` (atual): tem 1 commit em cima do main (`763aa75`, o
  primeiro redesign do Explorer) **mais uma quantidade grande de mudanças
  não commitadas na working tree** — é a reconstrução completa do Explorer
  seguindo a spec em [`docs/explorer-v2/`](./explorer-v2/) (ver seção 5).
- Rode `git status` antes de qualquer coisa. Se ainda houver arquivos
  modificados/untracked como `src/app/explore/actions-menu.tsx`,
  `src/app/explore/data-section.tsx`, `src/hooks/use-manual-query.ts` etc.
  aparecendo como não commitados, **isso precisa ser commitado (e
  idealmente ter um PR aberto de `develop` para `main`) antes de qualquer
  outra pessoa clonar o repo** — do contrário ela recebe uma versão bem
  mais antiga e incompleta do Explorer sem perceber.
- Não existe PR aberto de `develop` → `main` no momento em que este
  documento foi escrito (o ambiente onde o projeto foi construído não tinha
  a CLI `gh` disponível para abrir um automaticamente).

---

## 1. O que é o BiTool

Uma plataforma interna de **Analytics & Métricas self-service**, inspirada
no [Lightdash](https://www.lightdash.com/) e no
[Looker](https://cloud.google.com/looker) (para a UX do Explorer),
construída sobre o [Cube.js](https://cube.dev/) como motor semântico.

Ideia central: analistas/gestores exploram métricas e dimensões
pré-modeladas (não SQL cru) através de uma UI tipo "arrastar e montar
query", com controle de acesso a nível de linha (RLS) automático baseado em
atributos do usuário, e podem salvar essas explorações como gráficos dentro
de dashboards compartilháveis. Um módulo de Alertas monitora essas métricas
e notifica por e-mail quando cruzam um limiar.

**O que o BiTool não é**: não é um substituto de um data warehouse, não faz
ETL, e o dataset de exemplo (`vendas`, 500 linhas fictícias) existe só para
o MVP funcionar fim-a-fim — não há dados reais de negócio aqui.

---

## 2. Arquitetura

```
┌──────────────┐      ┌──────────────────┐      ┌───────────────────┐
│   Next.js    │◄────►│   PostgreSQL      │      │    PostgreSQL      │
│  (app:8080)  │      │   "bitool"        │      │    "analytics"     │
│              │      │   (metadados,     │      │    (dados que o    │
│  NextAuth    │      │    via Prisma)    │      │     Cube consulta) │
│  Prisma      │      └───────────────────┘      └─────────┬──────────┘
│  RBAC/RLS    │                                            │
└──────┬───────┘      ┌──────────────┐      ┌───────────────▼──────────┐
       │              │    Redis     │      │        Cube.js            │
       ├─────────────►│  (fila do    │      │  camada semântica +       │
       │  proxy fino  │   worker de  │      │  cache/pré-agregação      │
       │  (assina RLS │   Alertas)   │      │  (Cube Store nativo)      │
       │  via JWT)    └──────────────┘      └───────────────────────────┘
       │
       └────────────► Mailhog (e-mail de Alertas em dev)
```

Os dois bancos Postgres são **propositalmente separados**: um é
operacional (metadados da própria aplicação — usuários, dashboards,
alertas), o outro é analítico (o dataset que o Cube.js consulta). Em
produção, o segundo normalmente seria um data warehouse de verdade
(Postgres maior, BigQuery, Snowflake, ClickHouse...) — o Cube.js abstrai
qual banco está por trás, então trocar o back-end analítico não deveria
exigir mudar o app.

### 2.1 Por que cada peça foi escolhida

| Peça | Por quê |
|---|---|
| **Next.js 14 (App Router)** | Um único deployável serve UI (React Server/Client Components) e API (route handlers) — sem precisar manter um backend separado para um MVP deste tamanho. Middleware nativo facilita gate de auth por rota. |
| **Cube.js como camada semântica** | Em vez do app falar SQL direto com o banco analítico, as métricas/dimensões são definidas uma vez (`cube/schema/*.js`, versionado em Git — GitOps) e todo cliente (Explorer, Dashboards, Alertas) consulta o mesmo modelo via REST (`/cubejs-api/v1/load`). Isso dá de graça: cache e pré-agregação (Cube Store), um único lugar para aplicar RLS (`queryRewrite`), e independência do banco físico por trás. |
| **Postgres separado para metadados vs. analytics** | Isola a carga transacional da aplicação (users, sessions, dashboards) da carga analítica (queries agregadas em volume). Reflete como isso seria feito de verdade em produção. |
| **Prisma** | ORM type-safe com migrations versionadas — usado só para o banco de metadados. O banco analítico nunca é acessado via Prisma, só via Cube.js. |
| **NextAuth (Credentials + SAML)** | Resolve sessão via JWT sem precisar de um serviço de auth externo. SAML não é um provider OAuth padrão do NextAuth — foi implementado como rotas próprias (`/api/auth/saml/*`) usando `samlify`, que emitem o mesmo cookie de sessão no final, pra manter os dois fluxos de login compatíveis. |
| **RLS via JWT assinado + `queryRewrite`** | Os `UserAttributes` do usuário (ex.: `region: ["BR-SP"]`) são assinados num JWT enviado a cada request ao Cube.js; o `queryRewrite` em `cube/cube.js` injeta esses valores como filtro obrigatório. O Next.js nunca decide "quais linhas o usuário vê" no SQL — quem decide é o Cube, de forma centralizada, então não tem como um endpoint esquecer de aplicar o filtro. |
| **Redis** | Usado **só pela fila do worker de Alertas** — não é o cache do Cube.js. O cache/fila do Cube.js roda no Cube Store nativo (`CUBEJS_CACHE_AND_QUEUE_DRIVER=cubestore`), porque a versão do Cube.js usada aqui não suporta Redis como driver de cache/queue. |
| **node-cron + `instrumentation.ts`** | Scheduler de Alertas roda dentro do próprio processo Next.js (sem worker separado) — mais simples para o volume esperado do MVP; escala mal se o número de alertas crescer muito, ver seção 7. |
| **Docker Compose multi-stage** | Zero dependência local além de Docker — build e execução 100% em container, reprodutível entre máquinas. O `Dockerfile` tem 3 estágios (`deps` → `builder` → `runner`) pra manter a imagem final enxuta (sem devDependencies nem código-fonte). |
| **Radix UI + Tailwind** | Primitivos acessíveis (Dialog, DropdownMenu, Popover, Toast, ToggleGroup) sem trazer um design system pesado — Tailwind cuida do resto do estilo. |
| **Framer Motion** | Transições (fade, layout, width) usadas na UI do Explorer (colapso de seções, troca de estado de gráfico) — decisão explícita de UX para não parecer "seco"/estático. |
| **cmdk** | Motor de busca fuzzy do field picker do Explorer (busca de campos por nome). |
| **ECharts** (`echarts-for-react`) | Biblioteca de gráficos — cobre nativamente os tipos usados (bar/line/pie/sankey/treemap/sunburst/gauge/streamgraph) sem plugins extras. Bullet e dependency-wheel são composições/aproximações feitas em cima do ECharts, não tipos nativos. |
| **@dnd-kit** | Drag-and-drop: reordenar filtros no Explorer/Dashboards e o grid de widgets em Dashboards (`react-grid-layout`). |

---

## 3. Módulos implementados

### 3.1 Bootstrap & Autenticação
- `/setup`: tela de bootstrap, só funciona enquanto não existir nenhum
  usuário — cria o super-admin local. Depois disso fica permanentemente
  fechada (checagem no backend, não só na UI).
- Login por credenciais (e-mail+senha, bcrypt) e SAML SP-initiated
  (`/api/auth/saml/login` → IdP → `/api/auth/callback/saml`).
- **Break-glass**: o super-admin local sempre consegue logar por senha,
  mesmo que o SSO esteja configurado com `disablePasswordLogin=true` para
  os demais usuários — existe pra nunca travar o acesso admin se o IdP cair.
- Sessão JWT (NextAuth) carrega: role, permissions, `isSuperAdmin`,
  `userAttributes` (usados no RLS) e `impersonatedBy`.

### 3.2 Admin (`/admin/*`)
Usuários, Grupos, Atributos de RLS (`UserAttribute`/`UserAttributeValue`),
Roles com matriz de permissões (`Permission`/`RolePermission`), configuração
de SSO (`SsoConfig`), **impersonation** (logar como outro usuário, com
`ImpersonationEvent` de auditoria), e Tokens (Personal Access Tokens +
Service Accounts, para integrações).

### 3.3 Spaces (`/spaces`)
Contêineres de organização para gráficos e dashboards — três tipos:
- `PERSONAL`: só o dono vê.
- `PUBLIC`: qualquer usuário autenticado vê.
- `PRIVATE`: dono + membros dos grupos com acesso concedido
  (`GroupSpaceAccess`, com nível `VIEW`/`EDIT`).

A visibilidade é **sempre resolvida via query ao vivo no Postgres**
(`src/lib/space-access.ts`), nunca a partir de claims do JWT — importante
porque mudanças de grupo devem valer imediatamente, sem esperar o usuário
deslogar/logar de novo.

### 3.4 Dashboards (`/dashboards`)
Grid drag-and-drop (`react-grid-layout`) de widgets (`DashboardWidget` →
`SavedChart`). Dois recursos de destaque:
- **Filtros em cascata**: cada dropdown de valor de filtro consulta o
  Cube.js ao vivo, restringido pelos outros filtros já escolhidos (não é
  uma lista estática).
- **Cross-filtering**: clicar num ponto de um gráfico filtra os demais
  widgets do dashboard.

Dashboards e os gráficos que eles contêm continuam em **auto-run** (buscam
dados sozinhos a cada mudança de query) — isso foi uma decisão explícita:
o modelo "Run manual" (seção 3.5) só se aplica ao Explorer.

### 3.5 Explorer (`/explore`) — o módulo mais profundo do projeto

Reconstruído do zero seguindo uma spec dedicada de paridade de UX com o
**Looker Explore** — ver [`docs/explorer-v2/`](./explorer-v2/) para a fonte
completa (specs, mecânicas extraídas de vídeo, wireframe). Vale a leitura
direta desses arquivos antes de mexer nesta tela.

**Layout**: 3 seções colapsáveis empilhadas (não 4 acordeões como numa
versão anterior) — **Filters → Visualization → Data**, cabeçalho escuro
quando aberta. Field picker à esquerda (recolhível), populado a partir do
meta do Cube.js (`/api/cube/meta`).

**Modelo de execução — Run manual**: mudar campo/filtro/row limit deixa a
query "stale" (indicador visual + botão Run realçado), mas só busca dados
de novo quando o usuário clica **Run**. Durante a busca o botão vira **Stop**
(cancela via `AbortController`). Isso é *só* do Explorer — Dashboards
continua auto-run. Ver `src/hooks/use-manual-query.ts`.

**Top bar**: linhas · tempo de execução (medido no client) · indicador de
cache/consulta nova (via `usedPreAggregations` que o Cube.js devolve) ·
idade dos dados desde o último Run.

**Field picker**: busca fuzzy (cmdk), abas "Todos os campos"/"Em uso",
campos agrupados por Domain (= cube do Cube.js) com subseções
FILTER-ONLY/Dimensões/Measures. Cada campo tem ícones de hover: **▼
filtrar** (funcional — cria/remove um filtro pra aquele campo), **ⓘ info**
(tooltip com tipo/descrição/nome técnico), **⤢ pivot** e **⋮ mais**
(visíveis, mas inertes — "em breve").

**Seção Data**: abas Results / SQL / + Adicionar cálculo, Row Limit e
checkbox Totais no cabeçalho.
- *Results*: tabela dos dados brutos, nulos como `∅`, banner quando bate no
  Row Limit.
- *SQL*: mostra `resultSet.sql()` do Cube.js sob demanda — não exige Run,
  porque compilar SQL não executa a query.
- *+ Adicionar cálculo*: colunas calculadas sobre o resultado (table
  calculations).

**Menu ⚙ Ações**: Salvar (modal), Download CSV (real), Obter SQL/definição
(abre a aba SQL), Combinar resultados (modal, join client-side com outro
gráfico salvo), Remover campos e filtros, Limpar cache e atualizar. Itens
sem equivalente viável hoje (Enviar, Salvar e programar, Compartilhar,
Obter URL de incorporação, Certificar) aparecem desabilitados com tooltip
"em breve" — decisão consciente de mostrar o que falta em vez de esconder.

**Arquitetura interna relevante para quem for mexer aqui**:
- `ChartRenderer` (`src/components/chart-renderer.tsx`) é renderização
  **pura** — recebe `{data, loading, error}` já prontos, não busca nada.
- `CubeChart` (`src/components/cube-chart.tsx`) é o wrapper que busca dados
  automaticamente e delega pro `ChartRenderer` — usado só por Dashboards.
- O Explorer **não usa `CubeChart`** — ele mesmo faz o fetch (via
  `useManualQuery`) e passa os dados prontos direto pro `ChartRenderer`
  (seção Visualization) e pro `ResultsTable` (seção Data), evitando duas
  buscas separadas pra mostrar a mesma coisa de duas formas.

### 3.6 Alertas (`/alerts`)
Monitoramento de métricas com regra própria (`Alert`: cube+measure+operador+
limiar+cron). Scheduler in-process (`instrumentation.ts` chama
`startAlertScheduler()` no boot do servidor) que tickeia a cada minuto e
decide, respeitando o cron individual de cada alerta, quando rodar
(`src/lib/alerts/run-checks.ts`). Também existe `/api/cron/alerts` para
disparo externo/manual, protegido por `CRON_SECRET` (útil se um dia isso
for para um cron gerenciado externo, tipo Kubernetes CronJob, em vez do
scheduler in-process). Notifica por e-mail só na **transição** para
`TRIGGERED` (não manda e-mail de novo a cada tick enquanto o alerta
continuar disparado) — evita spam. `AlertHistory` guarda o histórico.

---

## 4. Modelo de dados (metadados — `prisma/schema.prisma`)

| Modelo | Papel |
|---|---|
| `User`, `Account`, `Session`, `VerificationToken` | Base NextAuth + campos próprios (`isSuperAdmin`, `isActive`, `passwordHash`) |
| `Role`, `Permission`, `RolePermission` | RBAC — permissões no formato `ação:recurso` (ex.: `manage:all`, `update:Space`) |
| `Group`, `UserGroup` | Agrupamento de usuários, usado em `GroupSpaceAccess` e SSO |
| `UserAttribute`, `UserAttributeValue` | Atributos de RLS (ex.: `region`) e os valores atribuídos a cada usuário — é isso que vira `securityContext.userAttributes` no JWT do Cube.js |
| `Project` | Agrupador topo de `Space` (hoje pouco usado além de organização) |
| `Space`, `GroupSpaceAccess` | Ver seção 3.3 |
| `SavedChart` | Uma exploração salva — `cubeQuery` (JSON) + `chartType` + `chartConfig` (JSON, inclui filterState, table calcs, merge config etc.) |
| `Dashboard`, `DashboardWidget` | Um dashboard e seus widgets (posição no grid + referência a um `SavedChart`) |
| `SsoConfig` | Configuração de um provedor SAML (metadata do IdP, `disablePasswordLogin`) |
| `PersonalAccessToken`, `ServiceAccount` | Tokens para acesso programático |
| `Alert`, `AlertHistory` | Ver seção 3.6 |
| `ImpersonationEvent` | Auditoria de impersonation |

O schema completo (campos, enums, relações) está em
[`prisma/schema.prisma`](../prisma/schema.prisma) — não duplicado aqui de
propósito, porque esse arquivo muda com frequência e uma cópia neste
documento ficaria desatualizada rápido.

---

## 5. Onde está a especificação de origem do Explorer

A reconstrução do Explorer (seção 3.5) foi guiada por uma spec escrita
antes do código, em [`docs/explorer-v2/`](./explorer-v2/):

- `spec_explorer_v2.md` — especificação funcional completa, incluindo a
  seção "0.1 Motor: Cube.dev" que mapeia cada conceito de UI (Domain,
  Filters, Pivot...) para o conceito equivalente do Cube.js (cube,
  `filters`, `pivotConfig`...). **Leitura obrigatória antes de mexer no
  Explorer.**
- `mecanicas_do_video.md` — mecânicas de interação confirmadas
  quadro-a-quadro a partir de um vídeo tutorial do Looker Explore (Run/Stop,
  cores por tipo de campo, menu de ações, fluxo de salvar).
- `mecanicas_filtros_e_pivot.md` — mecânica de construção de filtro e de
  pivot no Looker (usado como referência, mesmo para as partes que o BiTool
  ainda não implementa).
- `wireframe_explorer_v2.svg` — layout de referência com callouts numerados.
- `prompt_implementacao_v2.md` — o prompt original de implementação
  (histórico; a maior parte já foi superada pelo plano fasado que foi
  seguido de fato).

A implementação seguiu um plano fasado (Fase 1 a 7) — shell de layout →
filtros → extração do renderer puro → Results/SQL/cálculo → Run manual →
menu de ações → ícones de hover. Isso explica por que o código tem uma
separação clara entre "renderização pura" e "busca de dados": foi uma
decisão de arquitetura tomada no meio do processo (Fase 3) para que Fases
posteriores pudessem reutilizar o mesmo componente de duas formas
diferentes (auto-run em Dashboards, Run manual no Explorer) sem duplicar a
lógica de "como desenhar uma tabela/KPI/gráfico a partir de um resultado".

---

## 6. Subindo o ambiente

### 6.1 Pré-requisitos
- Docker e Docker Compose. **Nada mais** — não precisa Node/npm instalado
  localmente, build e execução acontecem 100% em containers.

### 6.2 Passo a passo

```bash
# 1. Clonar e entrar no repo, garantir que está na branch certa
git clone <repo> && cd bitool
git checkout develop   # ou main, dependendo do que for combinado no handoff

# 2. Copiar o template de variáveis de ambiente
cp .env.example .env

# 3. Gerar segredos aleatórios para NEXTAUTH_SECRET, CUBEJS_API_SECRET e
#    CRON_SECRET (o .env.example vem com um placeholder repetido nos 3)
sed -i.bak "s/replace-with-a-long-random-string/$(openssl rand -hex 32)/1" .env
sed -i.bak "s/replace-with-a-long-random-string/$(openssl rand -hex 32)/1" .env
sed -i.bak "s/replace-with-a-long-random-string/$(openssl rand -hex 32)/1" .env
rm .env.bak

# 4. Subir os serviços (constrói a imagem da app no primeiro run)
docker compose up -d --build

# 5. Aplicar as migrations do Prisma (serviço one-off — usa o estágio
#    "builder" do Dockerfile, que tem a CLI do Prisma; a imagem final
#    "runner" é enxuta e não tem)
docker compose run --rm migrate

# 6. Acessar a aplicação e criar o super-admin
open http://localhost:8080/setup
```

Depois do `/setup`, essa rota fecha permanentemente e todo login passa a
ser por `/login` (credenciais ou SAML, se configurado em `/admin/sso`).

### 6.3 Portas expostas no host

| Serviço | Porta host | Uso |
|---|---|---|
| `app` (Next.js) | `8080` | Único ponto de entrada do usuário |
| `cube` | `4008` | Cube.js Playground/API — útil pra debugar queries direto (interno é `4000`) |
| `postgres` | `55432` | Acesso direto via `psql`/GUI (interno é `5432`) |
| `mailhog` (Web UI) | `8025` | Ver e-mails de Alertas disparados em dev |
| `mailhog` (SMTP) | `1025` | Usado internamente pela app pra enviar e-mail |

As portas de `cube` e `postgres` foram remapeadas (`4008`, `55432`) só pra
evitar conflito com outros serviços comuns já rodando na máquina do
desenvolvedor — containers se comunicam entre si pelas portas internas
padrão via rede Docker do compose.

### 6.4 Variáveis de ambiente

Lista comentada completa em [`.env.example`](../.env.example). As que mais
importam:

| Variável | Para quê |
|---|---|
| `NEXTAUTH_URL` / `APP_URL` | Base URL da app — usada no callback do SAML |
| `NEXTAUTH_SECRET` | Assina a sessão JWT do NextAuth |
| `DATABASE_URL` | Postgres de **metadados** (usado pelo Prisma) |
| `CUBEJS_API_URL` | URL interna do Cube.js (`http://cube:4000/cubejs-api/v1`) |
| `CUBEJS_API_SECRET` | Segredo compartilhado app↔Cube.js pra assinar o JWT de RLS — **precisa ser igual dos dois lados** (ver `docker-compose.yml`) |
| `SAML_CALLBACK_URL` | Fixo em `/api/auth/callback/saml` |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM` | Mailhog em dev — trocar por SMTP real em produção |
| `REDIS_URL` | Fila do worker de Alertas (não é o cache do Cube.js) |
| `CRON_SECRET` | Protege `/api/cron/alerts` de disparo não autorizado |

⚠️ **Pegadinha real do `.env.example`**: as variáveis `CUBEJS_DB_*` (host,
porta, nome do banco, usuário, senha) estão listadas lá, mas o serviço
`cube` no `docker-compose.yml` **não as lê do `.env`** — ele tem esses
valores hardcoded diretamente no `environment:` do serviço. Editar essas
linhas no `.env` não muda a conexão do Cube.js com o banco analítico; para
isso, é preciso editar `docker-compose.yml` diretamente (bloco do serviço
`cube`). Só `CUBEJS_API_SECRET` de fato é injetado via `${...}` a partir do
`.env` nos dois serviços (`app` e `cube`) — e precisa ser o mesmo valor nos
dois, porque é o segredo que assina o JWT de RLS entre eles.

### 6.5 Comandos úteis do dia a dia

```bash
# Logs da aplicação
docker compose logs -f app

# Gerar uma nova migration depois de mudar prisma/schema.prisma
docker compose up -d postgres
docker run --rm --network bitool_default \
  -v "$(pwd)":/app -w /app \
  -e DATABASE_URL="postgresql://bitool:bitool@postgres:5432/bitool?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl >/dev/null && npx prisma migrate dev --name minha_mudanca"

# Prisma Studio (GUI do banco de metadados)
docker run --rm --network bitool_default -p 5555:5555 \
  -v "$(pwd)":/app -w /app \
  -e DATABASE_URL="postgresql://bitool:bitool@postgres:5432/bitool?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl >/dev/null && npx prisma studio --port 5555 --hostname 0.0.0.0"

# Disparar o worker de Alertas manualmente
curl -X POST http://localhost:8080/api/cron/alerts -H "x-cron-secret: <CRON_SECRET do .env>"

# Resetar tudo (apaga volumes/dados!)
docker compose down -v
```

### 6.6 Validar mudanças de código (não existe suíte de testes automatizada)

**Importante para quem for herdar o projeto**: não há testes unitários,
de integração, nem E2E configurados, nem pipeline de CI. Toda validação
feita durante o desenvolvimento foi manual:

```bash
# Type-check + build de produção (roda dentro do estágio "builder" —
# a imagem "runner" final não tem TypeScript/devDependencies instalados)
docker compose build app

# Depois de buildar, recriar o container com a imagem nova
docker compose up -d app

# Smoke test via curl contra o Cube.js real (login, meta, query, sql)
# — não substitui teste automatizado, mas pega regressão de contrato de API
```

Se o projeto for crescer, vale priorizar como dívida técnica: (1) testes de
integração pros `route.ts` de `/api/cube/*` (são a superfície mais frágil,
por dependerem do Cube.js estar de pé), e (2) algum E2E básico do fluxo
Explorer (selecionar campo → Run → ver resultado), que é o fluxo mais
complexo e mais fácil de quebrar silenciosamente.

---

## 7. Decisões de design conscientes (e seus trade-offs)

Registradas aqui porque não são óbvias olhando só o código:

- **Run manual só no Explorer, não em Dashboards.** Decisão explícita do
  responsável pelo produto: dashboards devem carregar prontos ao abrir;
  exploração ad-hoc deve dar controle sobre quando gastar uma query.
- **Cache/queue do Cube.js é Cube Store, não Redis**, mesmo o
  `docker-compose.yml` já subindo um Redis — porque essa versão do Cube.js
  não suporta Redis como `cacheAndQueueDriver`. O Redis existe só pra fila
  de Alertas. Não confundir os dois ao debugar performance de query.
- **"Vai processar X KB" do Looker não foi replicado literalmente** — é um
  conceito de billing do BigQuery, sem equivalente no par Cube.js+Postgres
  usado aqui. Em vez disso, o Explorer mostra um aviso textual ("Consulta
  alterada — clique em Run") quando a query está desatualizada, e um
  indicador real de cache-hit baseado em `usedPreAggregations` (campo que o
  Cube.js devolve quando a query bateu numa pré-agregação).
- **"Limpar cache e atualizar" não força bypass de cache de verdade.**
  Tentativa de usar `renewQuery` na query do Cube.js foi testada contra o
  Cube.js real rodando neste projeto e **rejeitada** (`"renewQuery" is not
  allowed`) — não é um campo suportado nesta versão do client/servidor. O
  item do menu hoje só dispara um novo Run normal. Se isso for importante,
  a via provável é mexer no `refreshKey` da pré-agregação, não no client.
- **Pivot é só visual, não funcional.** O ícone existe no field picker
  (spec pedia), mas está deliberadamente inerte — decisão do responsável
  pelo produto de deixar pra uma fase futura.
- **Table calculations só aparecem no gráfico "table" da seção
  Visualization, não na aba Results da seção Data.** `ResultsTable` mostra
  só os dados brutos da query; quem aplica os cálculos de tabela é o
  `ChartRenderer`, no branch de `chartType === "table"`. Se um dia as duas
  visões precisarem ficar consistentes, essa é a lacuna a fechar.
- **Ordenação e pivot de verdade na aba Results ficaram de fora.** O
  responsável pelo produto sinalizou que isso é necessidade futura, mas
  pediu explicitamente pra não construir agora — só ficar registrado pra
  quando chegar a vez.
- **Menu ⚙ Ações mostra itens sem função (Compartilhar, Enviar, Salvar e
  programar, Obter URL de incorporação, Certificar) desabilitados com
  tooltip "em breve"**, em vez de escondê-los — decisão consciente de
  transparência sobre o que falta, tomada junto com o responsável pelo
  produto.
- **`FilterGroupsEditor` foi movido de `src/app/dashboards/[id]/` para
  `src/components/`** para ser compartilhado entre Dashboards e Explorer —
  o mesmo builder de filtros (AND/OR, chips, drag-to-reorder) atende os
  dois, evitando duas implementações divergentes.

---

## 8. Limitações conhecidas / dívida técnica (lido honestamente, sem retoque)

Herdadas do MVP original:
- `npm audit` acusa vulnerabilidades (1 moderate, 2 high) que só se
  resolvem migrando pro Next.js 16 — não aplicado de propósito, por ser
  major version com breaking changes fora do escopo do MVP.
- Validação XSD do SAML é permissiva (`samlify.setSchemaValidator` aceita
  qualquer coisa) — aceitável pra MVP/homologação; produção precisa de um
  validador real (ex.: `@authenio/samlify-node-xmllint`).
- `isPinned` (Space/Dashboard/SavedChart) é global — afixado para todo
  mundo com acesso, não por usuário individualmente.

Do Explorer v2 (ver também seção 7 para o porquê de cada uma):
- Sem testes automatizados e sem CI (seção 6.6).
- Pivot, drill-down, Quick Start (⚡), editor de visualização com abas
  contextuais por tipo de gráfico (Style/Comparison/Formatting etc.),
  Forecast, certificação de conteúdo — todos fazem parte da spec original
  mas foram deliberadamente deixados pra uma "Fase de profundidade" futura
  (ver seção 8 da spec em `docs/explorer-v2/spec_explorer_v2.md`).
- Ordenação de coluna e menu por coluna (⚙) na aba Results são inertes
  (ícones presentes, sem função).
- Popover "Opções de busca" do field picker (restringir busca a
  rótulo/descrição/grupo/Domain) é cosmético — os checkboxes não afetam o
  resultado da busca de fato.
- "Limpar cache e atualizar" não garante bypass de cache real (ver seção 7).
- O dataset analítico (`vendas`) é fictício/gerado aleatoriamente — só
  serve pra validar o pipeline fim-a-fim, não representa dado de negócio.

---

## 9. Por onde continuar

Na ordem que faz mais sentido dado o estado atual:

1. **Commitar e abrir o PR de `develop` → `main`** (seção 0) antes de
   qualquer outra coisa — sem isso, o trabalho mais recente (Fases 4-7 do
   Explorer) só existe na máquina onde foi feito.
2. Ler `docs/explorer-v2/spec_explorer_v2.md`, seção 8 ("Escopo faseado"),
   pra decidir com o time de produto se as pendências da Fase 2 de
   profundidade (drill-down, Quick Start, editor avançado) entram no
   roadmap.
3. Avaliar se vale a pena investir em teste automatizado pros endpoints
   `/api/cube/*` antes de continuar adicionando funcionalidade — são a
   parte mais fácil de quebrar silenciosamente (dependem do Cube.js estar
   no ar e da forma exata da resposta do REST API dele).
4. Se o volume de Alertas crescer, revisitar o scheduler in-process
   (`instrumentation.ts`) — hoje ele reavalia todos os alertas habilitados
   a cada tick de 1 minuto dentro do mesmo processo da aplicação web; não
   escala como um worker dedicado escalaria.
