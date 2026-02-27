# Rota Solidária

> Plataforma web de código aberto para uso não comercial, voltada à coordenação de doações, logística e voluntariado em ações humanitárias.

---

## Sobre o Projeto

O **Rota Solidária** é uma iniciativa voluntária e sem fins lucrativos, desenvolvida por um grupo de desenvolvedores que acreditam que a tecnologia pode tornar a ajuda humanitária mais eficiente, segura e rastreável.

A plataforma foi criada para apoiar:

- **Operações emergenciais** - resposta rápida a desastres e crises
- **Ações sociais contínuas** - coordenação de projetos de longo prazo
- **Governança multi-nível** - administradores, gestores e voluntários com permissões bem definidas
- **Cadeia de custódia de recursos** - rastreabilidade completa das doações
- **Auditoria e transparência** - logs imutáveis de todas as ações

Não há fins lucrativos, publicidade ou monetização. Este é um projeto da comunidade, para a comunidade.

---

## Funcionalidades Principais (MVP)

- Cadastro e gestão de projetos humanitários
- Perfis com controle de acesso por função (RBAC): Administrador, Gestor, Voluntário Logístico, Voluntário de Serviço e Doador
- Registro e rastreamento de doações de itens
- Logística e transporte colaborativo
- Pontos de entrega (Hubs) georreferenciados
- Cadeia de custódia com estados: Oferecida -> Coletada -> Em transporte -> Recebida -> Distribuída
- Gestão por lotes
- Evidências de entrega (foto única com compressão)
- Reporte de incidentes
- Logs de auditoria append-only
- Conformidade com LGPD

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React / Next.js + TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Edge Functions | Supabase Edge Functions |
| Hospedagem | A definir |

---

## Documentação

- [`PRD.md`](./docs/PRD.md) - Documento de Requisitos do Produto
- [`TECHNICAL.md`](./docs/TECHNICAL.md) - Documento Técnico Inicial

---

## Como Contribuir

Este é um projeto aberto a contribuições voluntárias para uso não comercial.

1. Faça um fork do repositório
2. Crie uma branch a partir da `main`: `git checkout -b feat/sua-feature`
3. Faça suas alterações e commit
4. Abra um Pull Request descrevendo o que foi feito

> A branch `main` é protegida. Todo código deve entrar via Pull Request com revisão.

---

## Equipe

Projeto desenvolvido voluntariamente por:

| Nome | Contato |
|---|---|
| Tales Giuliano Vieira | [LinkedIn](https://www.linkedin.com/in/peritotales) |
| _Seu nome aqui_ | _Seu LinkedIn ou contato_ |

> Quer fazer parte? Abra uma issue ou envie um Pull Request.

---

## Licença

Este projeto está licenciado sob a **PolyForm Noncommercial License 1.0.0**. Veja o arquivo [LICENSE](./LICENSE).

---

<p align="center">
  Feito com propósito. Sem fins lucrativos. Por pessoas, para pessoas.
</p>
