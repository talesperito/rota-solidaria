# PRD - Sistema de Coordenacao de Doacoes e Voluntariado

## 1. Visao do Produto

Plataforma web open-source para coordenacao eficiente, segura e rastreavel de doacoes, logistica e voluntariado em acoes humanitarias.

O produto existe para apoiar operacoes reais, com foco em:

- Resposta a desastres
- Acoes sociais continuas
- Governanca clara
- Cadeia de custodia das doacoes
- Auditoria operacional

O projeto nao possui fins lucrativos, publicidade ou monetizacao.

---

## 2. Objetivos

### Objetivo principal

Organizar ajuda material e humana de forma confiavel, reduzindo desperdicio, desorganizacao e risco operacional.

### Objetivos secundarios

- Garantir que as doacoes atendam necessidades reais do projeto
- Permitir operacao descentralizada com controle central de governanca
- Facilitar a logistica colaborativa
- Minimizar exposicao de dados pessoais
- Operar com baixo custo e infraestrutura simples

---

## 3. Stakeholders

- Administrador Master
- Gestor Operacional do Projeto
- Voluntario Logistico
- Voluntario de Servico
- Doador
- Beneficiarios indiretos

---

## 4. Perfis de Usuario (RBAC)

### Administrador Master

Responsabilidades:

- Criar projetos
- Encerrar projetos
- Vincular gestores operacionais aos projetos
- Acessar dados e logs globais
- Manter a governanca do sistema

Observacao:

- O Administrador Master sera operado pela equipe mantenedora e desenvolvedora do sistema.

---

### Gestor Operacional

Responsavel por executar a operacao de um projeto especifico.

Pode:

- Cadastrar demandas
- Cadastrar hubs e pontos de recebimento
- Acompanhar doacoes do projeto
- Validar recebimentos e entregas
- Gerenciar voluntarios do proprio projeto

Nao pode:

- Criar projetos
- Criar outros gestores
- Alterar configuracoes globais
- Apagar historico de auditoria

---

### Voluntario Logistico

Pode:

- Assumir coletas e entregas
- Informar disponibilidade
- Atualizar andamento da entrega
- Reportar incidentes

Telefone obrigatorio para contato operacional externo quando aplicavel.

---

### Voluntario de Servico

Pode:

- Assumir tarefas presenciais
- Informar datas e horarios disponiveis

---

### Doador

Pode:

- Oferecer itens para demandas abertas
- Informar quantidade, peso estimado e localizacao
- Acompanhar o status da propria doacao

Nao pode:

- Criar demandas
- Fazer doacao livre fora das demandas abertas pelo gestor

---

## 5. Plataforma

- Aplicacao web responsiva
- Uso em desktop e mobile via navegador
- Preparacao para PWA futura
- Sem app nativo no MVP

---

## 6. Escopo Funcional do MVP

### 6.1 Projetos

Projetos sao criados apenas pelo Administrador Master.

Campos principais:

- Nome
- Descricao
- Area geografica
- Status
- Gestores responsaveis

---

### 6.2 Demandas

Demandas sao criadas pelo Gestor Operacional do projeto.

A demanda e a origem do fluxo operacional de doacao.

Campos principais:

- Titulo
- Descricao
- Categoria
- Quantidade necessaria
- Quantidade comprometida
- Quantidade disponivel
- Quantidade recebida
- Quantidade restante
- Unidade
- Prioridade
- Prazo
- Hub de destino
- Status

---

### 6.3 Doacoes de Itens

O doador so pode registrar doacao vinculada a uma demanda aberta ou em andamento.

Dados informados pelo doador:

- Descricao do item
- Quantidade
- Unidade
- Peso aproximado
- Localizacao de coleta
- Hub de destino, quando houver

Regras:

- Nao existe doacao livre fora de demanda
- Toda doacao deve estar vinculada a uma demanda do projeto
- A doacao entra no fluxo logistico apos aceite do gestor

---

### 6.4 Logistica e Transporte

Quando uma doacao e aceita pelo gestor, o sistema cria a entrega correspondente.

Fluxo operacional esperado:

1. Doador oferece item para uma demanda
2. Gestor aceita a doacao
3. Entrega fica disponivel para voluntario logistico
4. Voluntario assume a coleta e atualiza o transporte
5. Gestor valida o recebimento no destino

O produto deve suportar evolucao futura para consolidacao de multiplas coletas em um mesmo trajeto.

---

### 6.5 Prestacao de Servicos

Gestores podem criar tarefas como:

- Mutiroes
- Reparos
- Atendimento tecnico

Voluntarios podem se inscrever informando disponibilidade.

---

### 6.6 Hubs e Pontos de Recebimento

Cadastrados por Gestores Operacionais.

Campos principais:

- Nome
- Endereco
- Coordenadas GPS
- Capacidade opcional
- Horario de funcionamento
- Responsavel local
- Status operacional

---

### 6.7 Cadeia de Custodia de Doacoes

Estados principais do fluxo:

1. Oferecida
2. Aceita
3. Disponivel para coleta
4. Em transporte
5. Entregue
6. Validada

---

### 6.8 Incidentes

Voluntarios podem reportar:

- Risco
- Bloqueio logistico
- Falta critica
- Situacao emergencial

Gestores classificam e encerram os incidentes.

---

### 6.9 Geolocalizacao

Captura automatica quando relevante.

Usos principais:

- Origem da doacao
- Entregas
- Evidencias
- Incidentes

---

### 6.10 Contato Telefonico

- Obrigatorio para cenarios logisticos quando necessario
- Comunicacao operacional ocorre fora da plataforma
- Compartilhamento controlado por contexto e permissao

---

## 7. Auditoria e Logs

O sistema deve registrar:

- Todas as acoes relevantes
- Usuario responsavel
- Timestamp
- Entidade afetada
- Estado anterior e posterior quando aplicavel

Logs devem ser append-only.

---

## 8. Seguranca e Privacidade

- Minimizacao de dados pessoais
- Controle de acesso por papel
- Consentimento explicito para compartilhamento de telefone
- Conformidade com LGPD
- Restricao de acesso conforme projeto e papel operacional

---

## 9. Fora do Escopo do MVP

- Monetizacao
- Chat interno
- Integracao com WhatsApp
- Videos ou audios
- Cadastro publico de gestores
- Roteirizacao inteligente completa
- App nativo

---

## 10. Criterios de Sucesso

- Administradores Master conseguem abrir operacoes com governanca
- Gestores conseguem cadastrar demandas e validar recebimentos
- Doadores conseguem atender apenas necessidades reais do projeto
- Voluntarios conseguem assumir e concluir entregas
- Doacoes sao rastreaveis do inicio ao fim
- O sistema se mantem operacional com infraestrutura minima
