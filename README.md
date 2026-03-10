# Rota Solidaria

PT-BR: Este README esta disponivel em tres idiomas para facilitar contribuicoes internacionais.
EN: This README is available in three languages to support international contributors.
ES: Este README esta disponible en tres idiomas para facilitar contribuciones internacionales.

PT-BR: Este e um projeto voluntario, totalmente sem fins lucrativos, criado para apoiar a coordenacao de ajuda humanitaria para vitimas de desastres.
EN: This is a volunteer project, entirely non-profit, created to support the coordination of humanitarian aid for disaster victims.
ES: Este es un proyecto voluntario, totalmente sin fines de lucro, creado para apoyar la coordinacion de ayuda humanitaria para victimas de desastres.

## PT-BR

Plataforma web open-source, sem fins lucrativos, para coordenacao de doacoes, logistica e voluntariado em acoes humanitarias.

### Documentacao

- [PRD](./docs/PRD.md)
- [Documento Tecnico Inicial](./docs/TECHNICAL.md)

### Stack

- Frontend: Next.js + React + TypeScript
- Backend/BaaS: Supabase (Auth, Postgres, Storage)

### Como rodar local

#### 1. Pre-requisitos

- Node.js 20+
- npm 10+

#### 2. Instalar dependencias

```bash
npm install
```

#### 3. Configurar ambiente local (`.env.local`)

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

#### 4. Subir a aplicacao

```bash
npm run dev
```

Acesse `http://localhost:3000`.

### Banco de dados (Supabase SQL)

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

### Fluxo de contribuicao

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

### Regras de governanca

- Nunca fazer push direto na `main`.
- Sempre trabalhar em branch secundaria.
- Sempre abrir PR antes de merge.
- Priorizar seguranca, qualidade arquitetural e rastreabilidade.

### Responsabilidades por area

#### Produto e requisitos

- Manter PRD atualizado.
- Definir escopo de MVP e criterios de aceite.

#### Frontend

- Entregar fluxos de usuario com acessibilidade e responsividade.
- Garantir consistencia visual e de navegacao.

#### Supabase/Backend

- Evoluir esquema SQL e RLS com revisao de seguranca.
- Preservar cadeia de custodia e auditoria append-only.

#### Seguranca e LGPD

- Minimizar exposicao de dados pessoais.
- Garantir controles de acesso por papel (RBAC).

#### Qualidade e governanca

- Revisar PRs com foco em risco/regressao.
- Manter padroes de branch, commit e documentacao.

### Equipe

Projeto desenvolvido voluntariamente por:

| Nome                          | Contato                                                 |
| ----------------------------- | ------------------------------------------------------- |
| Tales Giuliano Vieira         | [LinkedIn](https://www.linkedin.com/in/peritotales)     |
| Joao Victor Nazareth de Souza | [LinkedIn](https://www.linkedin.com/in/dev-joao-victor) |

### Licenca

PolyForm Noncommercial License 1.0.0. Veja [LICENSE](./LICENSE).

## EN

Open-source, non-profit web platform to coordinate donations, logistics, and volunteering in humanitarian operations.

### Documentation

- [PRD](./docs/PRD.md)
- [Initial Technical Document](./docs/TECHNICAL.md)

### Stack

- Frontend: Next.js + React + TypeScript
- Backend/BaaS: Supabase (Auth, Postgres, Storage)

### Local setup

#### 1. Prerequisites

- Node.js 20+
- npm 10+

#### 2. Install dependencies

```bash
npm install
```

#### 3. Configure local environment (`.env.local`)

Copy the example file:

```bash
cp .env.example .env.local
```

Fill it with your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_KEY"
```

Notes:

- `.env.local` is for local use and must not be committed.
- `.env.example` is the versioned template in the repository.

#### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

### Database (Supabase SQL)

To prepare the database in a new project, run the scripts in this order:

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

### Contribution flow

1. Create a feature branch from `main`:

```bash
git checkout main
git pull
git checkout -b feat/feature-name
```

2. Make clear and focused commits.
3. Open a Pull Request with mandatory review.
4. Include in the PR:

- Scope
- Technical impacts
- Validation steps

### Governance rules

- Never push directly to `main`.
- Always work on a feature branch.
- Always open a PR before merging.
- Prioritize security, architecture quality, and traceability.

### Responsibilities by area

#### Product and requirements

- Keep the PRD updated.
- Define MVP scope and acceptance criteria.

#### Frontend

- Deliver user flows with accessibility and responsiveness.
- Ensure visual and navigation consistency.

#### Supabase/Backend

- Evolve SQL schema and RLS with security review.
- Preserve chain of custody and append-only audit logs.

#### Security and privacy

- Minimize personal data exposure.
- Ensure role-based access controls (RBAC).

#### Quality and governance

- Review PRs focusing on risk/regression.
- Maintain branch, commit, and documentation standards.

### Team

Project developed voluntarily by:

| Name                          | Contact                                                 |
| ----------------------------- | ------------------------------------------------------- |
| Tales Giuliano Vieira         | [LinkedIn](https://www.linkedin.com/in/peritotales)     |
| Joao Victor Nazareth de Souza | [LinkedIn](https://www.linkedin.com/in/dev-joao-victor) |
| Yan Carlos Silva Amorim       | [Contato Empresa](65 99612-8425)                        |

### License

PolyForm Noncommercial License 1.0.0. See [LICENSE](./LICENSE).

## ES

Plataforma web open-source, sin fines de lucro, para coordinar donaciones, logistica y voluntariado en acciones humanitarias.

### Documentacion

- [PRD](./docs/PRD.md)
- [Documento Tecnico Inicial](./docs/TECHNICAL.md)

### Stack

- Frontend: Next.js + React + TypeScript
- Backend/BaaS: Supabase (Auth, Postgres, Storage)

### Como ejecutar en local

#### 1. Requisitos previos

- Node.js 20+
- npm 10+

#### 2. Instalar dependencias

```bash
npm install
```

#### 3. Configurar entorno local (`.env.local`)

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Completa con las credenciales del proyecto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="TU_CLAVE_ANON_PUBLICA"
```

Notas:

- `.env.local` es para uso local y no debe subirse al repositorio.
- `.env.example` es el modelo versionado en el repositorio.

#### 4. Iniciar la aplicacion

```bash
npm run dev
```

Abre `http://localhost:3000`.

### Base de datos (Supabase SQL)

Para preparar la base de datos en un proyecto nuevo, ejecuta los scripts en este orden:

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

### Flujo de contribucion

1. Crea una rama de feature desde `main`:

```bash
git checkout main
git pull
git checkout -b feat/nombre-de-feature
```

2. Haz commits claros y objetivos.
3. Abre un Pull Request con revision obligatoria.
4. Incluye en el PR:

- Alcance
- Impactos tecnicos
- Pasos de validacion

### Reglas de gobernanza

- Nunca hacer push directo a `main`.
- Trabajar siempre en rama secundaria.
- Abrir siempre un PR antes del merge.
- Priorizar seguridad, calidad arquitectonica y trazabilidad.

### Responsabilidades por area

#### Producto y requisitos

- Mantener el PRD actualizado.
- Definir alcance del MVP y criterios de aceptacion.

#### Frontend

- Entregar flujos de usuario con accesibilidad y responsividad.
- Garantizar consistencia visual y de navegacion.

#### Supabase/Backend

- Evolucionar el esquema SQL y RLS con revision de seguridad.
- Preservar cadena de custodia y auditoria append-only.

#### Seguridad y privacidad

- Minimizar exposicion de datos personales.
- Garantizar controles de acceso por rol (RBAC).

#### Calidad y gobernanza

- Revisar PRs con foco en riesgo/regresion.
- Mantener estandares de branch, commit y documentacion.

### Equipo

Proyecto desarrollado de forma voluntaria por:

| Nombre                        | Contacto                                                |
| ----------------------------- | ------------------------------------------------------- |
| Tales Giuliano Vieira         | [LinkedIn](https://www.linkedin.com/in/peritotales)     |
| Joao Victor Nazareth de Souza | [LinkedIn](https://www.linkedin.com/in/dev-joao-victor) |
| Yan Carlos Silva Amorim       | [Contato Empresa](65 99612-8425)                        |

### Licencia

PolyForm Noncommercial License 1.0.0. Ver [LICENSE](./LICENSE).
