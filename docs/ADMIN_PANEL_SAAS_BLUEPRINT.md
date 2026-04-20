# Admin Panel SaaS Blueprint

## Objetivo
Transformar o `admin-panel` em um produto SaaS premium, com arquitetura limpa, organizacao por fluxos de negocio, UX operacional madura e padrao visual consistente.

Este documento passa a ser a diretriz para novas implementacoes no painel. A regra deixa de ser "subir tela funcional" e passa a ser "entregar produto final com clareza, densidade util e experiencia confiavel".

## Principios obrigatorios
- Pensar em produto final, nao em tela de desenvolvimento.
- Priorizar clareza operacional antes de ornamentacao visual.
- Organizar a interface por fluxos de negocio, nao por acumulacao de campos.
- Cada modulo deve ter IA propria, estado vazio, estado de erro, loading e acoes principais claras.
- Toda listagem relevante deve nascer pronta para busca, filtro, ordenacao, pagina, bulk action e detalhe.
- Todo detalhe relevante deve ter header contextual, status, alertas, historico e CTA principal.
- Reutilizar componentes e padroes. Evitar monolitos de UI e arquivos gigantes.
- O painel deve passar percepcao de confianca, controle e maturidade.

## Diretriz para futuras implementacoes
Qualquer nova tela do `admin-panel` deve responder estas perguntas antes de ser implementada:

1. Qual decisao operacional essa tela ajuda a tomar?
2. Qual e a acao primaria da tela?
3. Quais estados criticos precisam aparecer sem o usuario procurar?
4. O fluxo esta organizado para operador real ou apenas para preencher dados?
5. A mesma experiencia suportaria dezenas ou centenas de registros sem colapsar?

Se a resposta for fraca em qualquer ponto, a implementacao ainda nao esta pronta.

## Estrutura SaaS alvo

### Navegacao principal
- Operacao
- Motoristas
- Frota
- Financeiro
- Atendimento
- Configuracoes

### Fundacoes de SaaS
- Suporte a conta, tenant ou operacao como entidade de primeiro nivel
- RBAC por modulo e por acao
- Auditoria de alteracoes
- Configuracoes por operacao
- Feature flags para rollout
- Onboarding administrativo

## Modulo Motoristas

### Objetivo do modulo
Gerenciar onboarding, elegibilidade operacional, remuneracao, alocacao e historico do motorista.

### Sitemap recomendado
- `/drivers`
- `/drivers/[id]/overview`
- `/drivers/[id]/operacao`
- `/drivers/[id]/financeiro`
- `/drivers/[id]/veiculos`
- `/drivers/[id]/historico`
- `/drivers/new`

### Estrutura da listagem
- Tabela principal com busca real, filtros persistidos na URL e views salvas
- Colunas base: motorista, tipo, status, elegibilidade, veiculo atual, repasse, ultima atividade
- Bulk actions: ativar, suspender, ajustar vinculo, exportar
- Cards de resumo no topo: total, aptos, bloqueados, frota, agregados

### Estrutura do detalhe
- Header com nome, status, tipo, saude operacional e CTA principal
- Aba `Overview`: resumo, bloqueios, atividade recente, alertas
- Aba `Operacao`: status operacional, vinculo com frota, disponibilidade, ocorrencias
- Aba `Financeiro`: regra de repasse, excecoes, historico de alteracoes
- Aba `Veiculos`: veiculo proprio ou alocacao de frota, historico de trocas
- Aba `Historico`: timeline auditavel

### Componentes-chave
- `DriverTable`
- `DriverFiltersBar`
- `DriverHeader`
- `DriverHealthCard`
- `DriverCompensationCard`
- `DriverAllocationCard`
- `DriverTimeline`

## Modulo Frota

### Objetivo do modulo
Transformar a frota em um cockpit operacional com visibilidade de disponibilidade, risco, manutencao, checklist e custo.

### Sitemap recomendado
- `/fleet`
- `/fleet/veiculos`
- `/fleet/veiculos/[id]/overview`
- `/fleet/veiculos/[id]/manutencao`
- `/fleet/veiculos/[id]/checklists`
- `/fleet/veiculos/[id]/alocacoes`
- `/fleet/manutencao`
- `/fleet/checklists`

### Estrutura da visao geral
- Cards de KPI: total, disponiveis, em uso, manutencao, com alerta
- Fila operacional: problema, pendencia, em uso, disponivel
- Agenda de manutencao: vencido, proximo, em dia
- Execucao de checklist: pendente, concluido, excecao

### Estrutura de veiculos
- Lista com busca, filtros e estados por severidade
- Detalhe por veiculo com header contextual e timeline
- Secoes fixas: saude do veiculo, manutencao, checklist, alocacao, custos

### Estrutura de manutencao
- Tela propria, nao apendice da frota
- Fila por prioridade e vencimento
- OS, planos preventivos e historico no mesmo modelo mental
- Destaque visual para risco operacional e impacto financeiro

### Estrutura de checklists
- Separar configuracao de template de execucao do dia
- Diferenciar claramente: modelo, obrigatoriedade, rotina, acao automatica e pendencia operacional

### Componentes-chave
- `FleetKpiStrip`
- `FleetOperationalQueue`
- `FleetMaintenanceBoard`
- `FleetChecklistExecutionTable`
- `FleetVehicleHeader`
- `FleetVehicleHealthPanel`
- `FleetTimeline`

## Regras de UI/UX

### Visual
- Premium e sobrio
- Menos efeito decorativo e mais hierarquia informacional
- Tipografia forte e leitura rapida
- Contraste alto para status, risco e prioridade
- Espacamento consistente e previsivel

### Interacao
- Uma CTA primaria por area
- Secundarias discretas, mas acessiveis
- Filtros sempre visiveis ou facilmente reabertos
- Dados criticos acima da dobra
- Nada de input falso ou acao sem comportamento real

### Conteudo
- Linguagem consistente em portugues
- Labels orientados a negocio
- Mensagens de estado curtas e objetivas
- Diferenciar claramente alerta, bloqueio, pendencia e informacao

## Regras de arquitetura frontend
- Quebrar telas grandes em layout, feature sections e componentes reutilizaveis
- Evitar componentes unicos com responsabilidades de modulo inteiro
- Isolar listagem, detalhe, formularios e cards de resumo
- Centralizar tokens visuais e padroes de interacao
- Favor fluxos previsiveis com estado controlado e query params para filtros

## Prioridade de implementacao

### Fase 1
- Definir IA final do `admin-panel`
- Criar design system base do painel
- Reestruturar `Motoristas` em lista + detalhe por abas

### Fase 2
- Reestruturar `Frota` em visao operacional + veiculo detalhe + manutencao + checklists
- Introduzir padrao real de tabelas SaaS

### Fase 3
- Adicionar auditoria, RBAC e configuracoes por operacao
- Revisar copywriting e consistencia de estados

### Fase 4
- Refinamento premium: performance percebida, microinteracoes uteis, empty states e onboarding

## Regra final
Implementacao futura no `admin-panel` so deve ser considerada pronta quando estiver boa para operador final, boa para escalar e boa o bastante para vender como produto.
