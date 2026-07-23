# BiTool

Plataforma interna de Analytics & Métricas — camada semântica em Cube.js,
governança/RLS, Spaces & Dashboards, Explorer ad-hoc e Alertas. Inspirada em
Lightdash e Cube.js.

## Arquitetura

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│   Next.js   │◄────►│  PostgreSQL │      │   PostgreSQL      │
│  (app:8080) │      │  (metadados │      │   (analytics —    │
│             │      │   via       │      │    dados que o    │
│  NextAuth   │      │   Prisma)   │      │    Cube consulta)  │
│  Prisma     │      └─────────────┘      └────────┬──────────┘
│  RBAC/RLS   │                                     │
└──────┬──────┘      ┌─────────────┐      ┌─────────▼─────────┐
       │              │    Redis    │      │      Cube.js      │
       ├─────────────►│ (fila de    │      │  camada semântica  │
       │  proxy fino   │  Alertas)  │      │  cache/pré-agreg.  │
       │  (RLS via JWT)└─────────────┘      │  via Cube Store    │
       │                                     └────────────────────┘
       └────────────► Mailhog (e-mail de Alertas, dev)
```

- **Metadados** (usuários, roles, spaces, dashboards, tokens, alertas) vivem
  no Postgres via Prisma.
- **Modelagem semântica** (métricas/dimensões/joins do Cube.js) vive em
  código versionado em [`cube/schema`](./cube/schema) — GitOps, não no banco.
- **Cache e pré-agregação** de queries são 100% responsabilidade do Cube.js
  (Cube Store). O Next.js nunca cacheia dados — só assina o contexto de
  segurança (RLS) e repassa a query.
- **RLS dinâmico**: os `UserAttributes` de cada usuário (ex.: `region`) são
  assinados num JWT e lidos pelo `queryRewrite` em [`cube/cube.js`](./cube/cube.js)
  para filtrar linhas automaticamente.

## Pré-requisitos

- Docker e Docker Compose
- Nenhuma outra dependência local é necessária — build e execução acontecem
  inteiramente em containers.

## Subindo o ambiente

```bash
# 1. Copie o template de variáveis de ambiente
cp .env.example .env

# 2. Gere segredos aleatórios para NEXTAUTH_SECRET, CUBEJS_API_SECRET e
#    CRON_SECRET (o .env.example vem com placeholders)
#    Em macOS/Linux:
sed -i.bak "s/replace-with-a-long-random-string/$(openssl rand -hex 32)/1" .env
sed -i.bak "s/replace-with-a-long-random-string/$(openssl rand -hex 32)/1" .env
sed -i.bak "s/replace-with-a-long-random-string/$(openssl rand -hex 32)/1" .env
rm .env.bak

# 3. Suba os serviços (constrói a imagem da aplicação no primeiro run)
docker compose up -d --build

# 4. Aplique as migrations do Prisma (serviço one-off, roda e finaliza)
docker compose run --rm migrate

# 5. Acesse a aplicação
open http://localhost:8080/setup
```

No primeiro acesso, `/setup` pede a criação do super-admin local
(break-glass — continua funcionando mesmo depois de habilitar SSO/SAML e
desativar login por senha para os demais usuários). Depois disso, `/setup`
fica permanentemente fechado e todo mundo entra por `/login`.

### Portas expostas no host

| Serviço          | Porta host | Uso                                             |
| ---------------- | ---------- | ------------------------------------------------ |
| `app` (Next.js)  | `8080`     | Aplicação — único ponto de entrada do usuário     |
| `cube`           | `4008`     | Cube.js Playground/API (debug) — `4000` interno   |
| `postgres`       | `55432`    | Acesso direto ao banco via `psql`/GUI (opcional)  |
| `mailhog`        | `8025`     | UI web para ver e-mails de Alertas em dev          |
| `mailhog` (SMTP) | `1025`     | Usado internamente pela aplicação                  |

As portas de `cube` e `postgres` foram remapeadas em relação ao padrão de
mercado (`4000`/`5432`) só para evitar conflito com outros serviços comuns
rodando na máquina do desenvolvedor — a comunicação entre containers usa as
portas internas normais (`postgres:5432`, `cube:4000`) via rede Docker.

## Módulos implementados

- **Bootstrap & Auth** — `/setup` (super-admin local), login por
  credenciais e SAML (EntraID/Okta/genérico) via rota própria em
  `/api/auth/callback/saml`, RBAC (Role → Permission) e RLS dinâmico via
  `UserAttributes`.
- **Admin** (`/admin/*`) — usuários, grupos, atributos de RLS, roles com
  matriz de permissões, configuração de SSO, impersonation (com log de
  auditoria) e tokens (Personal Access Tokens + Service Accounts).
- **Spaces** (`/spaces`) — Pessoais/Públicos/Privados-por-grupo, pinning,
  controle de acesso resolvido sempre via query ao vivo no Postgres.
- **Explorer** (`/explore`) — consulta ad-hoc às measures/dimensions do
  Cube.js, preview em tabela/bar/line/pie/kpi, salva como gráfico num Space.
- **Dashboards** (`/dashboards`) — grid drag-and-drop (`react-grid-layout`),
  **filtros em cascata** (cada dropdown de valor consulta o Cube.js ao vivo,
  restringido pelos demais filtros já escolhidos) e **cross-filtering** real
  entre gráficos (clicar num ponto filtra os outros widgets).
- **Alertas** (`/alerts`) — monitoramento de métricas com engine própria:
  scheduler in-process (`instrumentation.ts` + `node-cron`) que respeita o
  cron individual de cada alerta, mais `/api/cron/alerts` para disparo
  manual/externo (protegido por `CRON_SECRET`). Notifica por e-mail
  (Mailhog em dev) só na transição para `TRIGGERED`, evitando spam.

## Comandos úteis

```bash
# Ver logs da aplicação
docker compose logs -f app

# Rodar uma nova migration depois de alterar prisma/schema.prisma
#   (gera os arquivos de migration localmente — precisa do Postgres já no ar)
docker compose up -d postgres
docker run --rm --network bitool_default \
  -v "$(pwd)":/app -w /app \
  -e DATABASE_URL="postgresql://bitool:bitool@postgres:5432/bitool?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl >/dev/null && npx prisma migrate dev --name minha_mudanca"

# Abrir o Prisma Studio (GUI do banco de metadados)
docker run --rm --network bitool_default -p 5555:5555 \
  -v "$(pwd)":/app -w /app \
  -e DATABASE_URL="postgresql://bitool:bitool@postgres:5432/bitool?schema=public" \
  node:20-alpine sh -c "apk add --no-cache openssl >/dev/null && npx prisma studio --port 5555 --hostname 0.0.0.0"

# Disparar o worker de Alertas manualmente (fora do scheduler automático)
curl -X POST http://localhost:8080/api/cron/alerts -H "x-cron-secret: <CRON_SECRET do seu .env>"

# Resetar tudo (containers + volumes — apaga os dados)
docker compose down -v
```

## Estrutura do repositório

```
src/
  app/                # App Router — páginas e rotas de API
    admin/             # Telas de administração (/admin/*)
    api/               # Rotas de API (auth, admin, spaces, dashboards, cube, alerts...)
    dashboards/         # Visualização/edição de dashboards
    explore/            # Explorer ad-hoc
    spaces/             # Gestão de Spaces
    alerts/             # Gestão de Alertas
  lib/                # Lógica compartilhada (auth, RBAC, RLS, Cube client, alerts engine)
  components/          # Componentes de UI reutilizáveis (ex.: CubeChart)
  hooks/               # Hooks client-side (ex.: useCubeQuery)
  instrumentation.ts   # Bootstrap do scheduler de Alertas ao subir o servidor
prisma/
  schema.prisma        # Metadados (users, roles, spaces, dashboards, alerts...)
  migrations/           # Histórico de migrations
cube/
  cube.js               # Config do Cube.js — RLS via queryRewrite
  schema/                # Modelagem semântica versionada (GitOps)
docker/
  postgres/init.sql     # Cria o banco "analytics" + dados de exemplo
```

## Variáveis de ambiente

Veja [`.env.example`](./.env.example) para a lista completa comentada. As
mais importantes:

| Variável             | Descrição                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `NEXTAUTH_URL`/`APP_URL` | Sempre `http://localhost:8080` em dev — usado no callback SAML |
| `DATABASE_URL`         | Postgres de metadados (usado pelo Prisma)                        |
| `CUBEJS_API_URL`       | URL interna do Cube.js (`http://cube:4000/cubejs-api/v1`)         |
| `CUBEJS_API_SECRET`    | Segredo compartilhado entre app e Cube.js para assinar o RLS      |
| `CRON_SECRET`          | Protege `/api/cron/alerts` contra disparo não autorizado          |
| `SMTP_HOST`/`SMTP_PORT`| Mailhog em dev — trocar por um SMTP real em produção              |

## Limitações conhecidas (MVP)

- `npm audit` ainda acusa 3 vulnerabilidades (1 moderate, 2 high) que só se
  resolvem com upgrade para Next.js 16 — não aplicado aqui de propósito, por
  ser um salto de major version com breaking changes no App Router fora do
  escopo deste MVP.
- Validação XSD do SAML é permissiva (`samlify.setSchemaValidator` aceita
  tudo) — adequado para MVP/homologação; para produção, plugar um validador
  real (ex.: `@authenio/samlify-node-xmllint`).
- `Space.isPinned`/`Dashboard.isPinned`/`SavedChart.isPinned` são globais
  (afixado para todos que têm acesso), não por usuário.
