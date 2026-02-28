# Rota Solidaria

Plataforma web open-source, sem fins lucrativos, para coordenacao de doacoes, logistica e voluntariado em acoes humanitarias.

## Documentacao

- [PRD](./docs/PRD.md)
- [Documento Tecnico Inicial](./docs/TECHNICAL.md)

## Stack

- Frontend: Next.js + React + TypeScript
- Backend/BaaS: Supabase (Auth, Postgres, Storage)

## Como rodar local

### 1. Pre-requisitos

- Node.js 20+
- npm 10+

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar ambiente local (`.env.local`)

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Preencha com as credenciais do projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_PUBLICA"
```

Observacoes:

- `.env.local` e para uso local e nao deve ser commitado.
- `.env.example` e o modelo versionado no repositorio.

### 4. Subir a aplicacao

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Banco de dados (Supabase SQL)

Para preparar o banco em um projeto novo, execute os scripts na ordem:

1. `supabase/001_foundation.sql`
2. `supabase/002_helpers_rls.sql`
3. `supabase/003_audit.sql`
4. `supabase/004_admin_helpers.sql`
5. `supabase/005_hubs.sql`
6. `supabase/006_needs.sql`
7. `supabase/007_donations.sql`
8. `supabase/008_deliveries.sql`
9. `supabase/009_incidents.sql`
10. `supabase/010_volunteers_shifts.sql`

## Fluxo de contribuicao

1. Crie branch secundaria a partir da `main`:

```bash
git checkout main
git pull
git checkout -b feat/nome-da-feature
```

2. Faca commits claros e objetivos.
3. Abra Pull Request com revisao obrigatoria.
4. Descreva no PR:
- Escopo
- Impactos tecnicos
- Como validar

## Regras de governanca

- Nunca fazer push direto na `main`.
- Sempre trabalhar em branch secundaria.
- Sempre abrir PR antes de merge.
- Priorizar seguranca, qualidade arquitetural e rastreabilidade.

## Responsabilidades por area

### Produto e requisitos

- Manter PRD atualizado.
- Definir escopo de MVP e criterios de aceite.

### Frontend

- Entregar fluxos de usuario com acessibilidade e responsividade.
- Garantir consistencia visual e de navegacao.

### Supabase/Backend

- Evoluir esquema SQL e RLS com revisao de seguranca.
- Preservar cadeia de custodia e auditoria append-only.

### Seguranca e LGPD

- Minimizar exposicao de dados pessoais.
- Garantir controles de acesso por papel (RBAC).

### Qualidade e governanca

- Revisar PRs com foco em risco/regressao.
- Manter padroes de branch, commit e documentacao.

## Equipe

Projeto desenvolvido voluntariamente por:

| Nome | Contato |
|---|---|
| Tales Giuliano Vieira | [LinkedIn](https://www.linkedin.com/in/peritotales) |
| Joao Victor Nazareth de Souza | [LinkedIn](https://www.linkedin.com/in/dev-joao-victor) |

## Licenca

PolyForm Noncommercial License 1.0.0. Veja [LICENSE](./LICENSE).
