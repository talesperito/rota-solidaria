# Documento Técnico Inicial — Sistema de Coordenação Humanitária

## 1. Arquitetura Geral

Modelo BaaS centrado no Supabase.

Web App → Supabase Auth → Postgres → Storage → Edge Functions

---

## 2. Stack Recomendada

### Frontend

- React ou Next.js
- TypeScript
- Interface responsiva
- Geolocation API do navegador

---

### Backend

- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions opcionais para lógica específica

---

## 3. Banco de Dados

Modelo relacional com Row Level Security (RLS).

Principais entidades:

- users
- roles
- projects
- project_managers
- needs
- donations
- deliveries
- service_tasks
- hubs
- incidents
- batches
- audit_logs
- evidence_files

---

## 4. Autenticação

- Cadastro básico (email + senha ou telefone)
- Perfis atribuídos por gestores ou administrador master
- Não há auto-criação de gestores

---

## 5. Storage

Utilizado apenas para fotos de evidência.

Políticas:

- Compressão obrigatória antes do upload
- Limite de tamanho configurado
- Proibição de vídeo e áudio

---

## 6. Logs de Auditoria

Tabela append-only.

Campos recomendados:

- id
- actor_user_id
- actor_role
- action_type
- entity_type
- entity_id
- before_state (JSON)
- after_state (JSON)
- timestamp
- ip (opcional)
- geo (opcional)

---

## 7. Segurança

- RLS em todas as tabelas sensíveis
- Controle rigoroso de permissões
- Proteção contra acesso indevido a dados pessoais
- Sem exposição pública de informações sensíveis

---

## 8. Governança Open-Source

Repositório público no GitHub.

Regras:

- Branch main protegida
- Push direto proibido
- Merge apenas via Pull Request aprovado
- Revisão obrigatória por mantenedores
- Contribuições externas via branches secundárias
- Integração contínua recomendada

---

## 9. Escalabilidade

Sistema projetado para:

- Baixo volume inicial
- Crescimento progressivo
- Infraestrutura mínima
- Otimização de storage

---

## 10. Riscos Técnicos e Mitigações

Exposição de dados pessoais → RBAC + RLS  
Sobrecarga de storage → Compressão + limites  
Uso indevido → Logs + governança  
Conectividade limitada → Interface leve e resiliente  
