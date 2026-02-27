# PRD — Sistema de Coordenação de Doações e Voluntariado

## 1. Visão do Produto

Plataforma web open-source para coordenação eficiente, segura e rastreável de doações, logística e voluntariado em ações humanitárias, operada por entidades públicas ou privadas verificadas.

Suporta:

- Operações emergenciais (desastres)
- Ações sociais contínuas
- Governança multi-nível
- Cadeia de custódia de recursos
- Auditoria completa

Não há fins lucrativos, publicidade ou monetização.

---

## 2. Objetivos

### Objetivo principal

Organizar ajuda material e humana de forma confiável, reduzindo desperdício, desorganização e riscos pessoais.

### Objetivos secundários

- Permitir coordenação descentralizada por gestores locais
- Garantir rastreabilidade das ações
- Facilitar logística colaborativa
- Minimizar exposição de dados pessoais
- Operar com baixo custo e infraestrutura mínima

---

## 3. Stakeholders

- Administrador Master (global)
- Gestores Operacionais (prefeituras, ONGs etc.)
- Voluntários (logística e serviço)
- Doadores
- Beneficiários indiretos

---

## 4. Perfis de Usuário (RBAC)

### Administrador Master

Responsabilidades:

- Criar e remover Gestores Operacionais
- Criar/encerrar projetos globais
- Acesso total a dados e logs
- Governança do sistema

---

### Gestor Operacional

Responsável por um projeto ou região.

Pode:

- Criar necessidades
- Cadastrar pontos de entrega
- Validar entregas
- Encerrar demandas
- Visualizar dados operacionais
- Gerenciar voluntários dentro do projeto

Não pode:

- Alterar configurações globais
- Criar outros gestores
- Apagar logs históricos

---

### Voluntário Logístico

Pode:

- Assumir entregas ou transportes
- Informar disponibilidade
- Enviar prova de entrega (foto única)
- Reportar incidentes

Telefone obrigatório para contato externo.

---

### Voluntário de Serviço

Pode:

- Assumir tarefas presenciais (mutirões etc.)
- Informar datas/horários disponíveis

---

### Doador

Pode:

- Oferecer itens ou ajuda
- Informar quantidade, peso estimado e localização
- Acompanhar status da doação

---

## 5. Plataforma

- Aplicação web responsiva
- Uso em desktop e mobile via navegador
- Arquitetura preparada para PWA futura
- Sem app nativo no MVP

---

## 6. Escopo Funcional do MVP

### 6.1 Projetos

Criados apenas pelo Administrador Master.

Contêm:

- Nome
- Descrição
- Área geográfica
- Status (ativo/inativo)
- Gestores responsáveis

---

### 6.2 Necessidades (Demandas)

Criadas por Gestores.

Tipos:

- Doação material
- Transporte/logística
- Prestação de serviço
- Transporte de pessoas (sensível)

Campos:

- Descrição
- Categoria
- Quantidade necessária
- Prioridade
- Prazo
- Local de destino (GPS)
- Status

---

### 6.3 Doações de Itens

Doador informa:

- Tipo de item
- Quantidade
- Peso aproximado (opcional)
- Localização automática (GPS)
- Disponibilidade de retirada

Sistema cria uma tarefa logística correspondente.

---

### 6.4 Logística e Transporte

Voluntários logísticos podem:

- Visualizar demandas abertas
- Assumir tarefas
- Contatar envolvidos via telefone externo
- Registrar conclusão

Comunicação ocorre fora da plataforma.

---

### 6.5 Prestação de Serviços

Gestores podem criar tarefas como:

- Mutirões
- Reparos
- Atendimento técnico

Voluntários podem se inscrever informando disponibilidade.

---

### 6.6 Pontos de Entrega (Hubs)

Cadastrados por Gestores.

Campos:

- Nome
- Endereço
- Coordenadas GPS
- Capacidade (opcional)
- Horário de funcionamento
- Responsável local
- Status operacional

---

### 6.7 Cadeia de Custódia de Doações

Estados possíveis:

1. Oferecida  
2. Aguardando coleta  
3. Em transporte  
4. Recebida no ponto  
5. Distribuída  
6. Encerrada  

---

### 6.8 Gestão por Lotes

Permite:

- Agrupar múltiplos itens
- Dividir cargas
- Redistribuir entre pontos

---

### 6.9 Evidência de Entrega

- Máximo de 1 foto por entrega
- Compressão obrigatória no cliente
- Sem vídeo ou áudio
- Armazenamento no Supabase Storage
- Metadados no banco de dados

---

### 6.10 Incidentes

Voluntários podem reportar:

- Risco
- Bloqueio logístico
- Falta crítica
- Situação emergencial

Gestores classificam e encerram.

---

### 6.11 Geolocalização

Captura automática quando relevante.

Usada para:

- Ofertas de doação
- Entregas
- Evidências
- Incidentes

---

### 6.12 Contato Telefônico

- Obrigatório para logística
- Comunicação externa ao sistema
- Compartilhamento controlado por contexto

---

## 7. Auditoria e Logs

Sistema deve registrar:

- Todas as ações relevantes
- Usuário responsável
- Timestamp
- Entidade afetada
- Estado anterior/posterior quando aplicável

Logs são imutáveis (append-only).

---

## 8. Segurança e Privacidade

- Minimização de dados pessoais
- Controle de acesso por função
- Consentimento explícito para compartilhamento de telefone
- Conformidade com LGPD

---

## 9. Fora do Escopo (MVP)

- Monetização
- Chat interno
- Integração com WhatsApp
- Vídeos ou áudios
- Cadastro público de gestores
- IA avançada
- App nativo

---

## 10. Critérios de Sucesso

- Gestores conseguem coordenar operações reais
- Voluntários conseguem assumir e concluir tarefas
- Doações são rastreáveis do início ao fim
- Sistema mantém estabilidade com infraestrutura mínima

