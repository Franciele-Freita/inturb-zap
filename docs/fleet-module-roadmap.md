# Modulo de Frota

## Diagnostico atual

Hoje o projeto ja tem uma base inicial de frota:

- cadastro do veiculo
- status operacional (`AVAILABLE`, `ALLOCATED`, `MAINTENANCE`, `INACTIVE`)
- alocacao do carro para motorista da frota
- tarefas de manutencao com prazo por data ou KM
- registro de hodometro
- checklist diario no fluxo do motorista

O ponto fraco nao e falta de base. O ponto fraco e que isso ainda esta organizado como cadastro de veiculo, e nao como gestao completa da frota.

## Objetivo do modulo

Transformar `frota` em um modulo com quatro frentes:

1. Cadastro tecnico do veiculo
2. Operacao diaria
3. Manutencao preventiva e corretiva
4. Custos, documentos e historico

## Estrutura proposta

### 1. Visao geral da frota

Tela principal de `Frota` deve deixar de ser so listagem.

Blocos recomendados:

- total de veiculos
- disponiveis, alocados, em manutencao e inativos
- manutencoes vencidas
- manutencoes vencendo por KM
- documentos vencendo
- veiculos sem checklist do dia
- veiculos parados ha muitos dias
- custo do mes

Listagem recomendada:

- veiculo
- placa
- status
- motorista atual
- ultimo KM
- proxima manutencao
- alertas ativos
- custo acumulado no mes

## 2. Cadastro tecnico do veiculo

O cadastro atual deve crescer para armazenar dados tecnicos e administrativos.

Campos recomendados para `FleetVehicle`:

- marca
- modelo
- versao
- categoria
- combustivel
- chassi
- renavam
- ano fabricacao
- ano modelo
- data de aquisicao
- tipo de posse (`PROPRIO`, `ALUGADO`, `TERCEIRO`, `LEASING`)
- fornecedor ou locadora
- valor de compra ou contrato
- consumo medio esperado
- km medio mensal esperado
- observacoes operacionais

Campos de documentos:

- vencimento do licenciamento
- vencimento do seguro
- vencimento da vistoria
- vencimento do rastreador
- vencimento de contrato

## 3. Operacao diaria

Esse bloco cobre o uso do carro no dia a dia.

Funcionalidades:

- historico de alocacoes por motorista
- entrada e saida de turno
- checklist diario visivel tambem no admin
- timeline operacional do veiculo
- status de indisponibilidade com motivo
- observacao de patio, garagem ou base atual

Eventos importantes para timeline:

- carro alocado
- carro devolvido
- checklist iniciado ou concluido
- km registrado
- manutencao aberta
- manutencao iniciada
- manutencao concluida
- abastecimento registrado
- sinistro ou avaria registrada

## 4. Manutencao preventiva e corretiva

Hoje existe `maintenance task`, mas ainda generica demais.

Evolucao recomendada:

- tipo da manutencao (`PREVENTIVA`, `CORRETIVA`, `ALINHAMENTO`, `BALANCEAMENTO`, `TROCA_OLEO`, `PNEU`, `REVISAO`, `LAVAGEM`, `FUNILARIA`)
- prioridade
- oficina responsavel
- custo previsto
- custo realizado
- km atual no momento da abertura
- data de abertura
- data de inicio
- data de conclusao
- proxima manutencao prevista
- recorrencia por data
- recorrencia por KM

Separar o conceito em dois niveis ajuda:

- `Plano de manutencao`: regra recorrente
- `Ordem de servico`: execucao real

Exemplos de plano:

- troca de oleo a cada 10.000 km
- alinhamento a cada 15.000 km
- revisao geral a cada 6 meses

Exemplos de ordem:

- alinhamento da Spin 01 aberto em 24/03/2026 aos 118.400 km

## 5. KM, abastecimento e desempenho

Controle de KM sem abastecimento fica incompleto.

Adicionar:

- historico completo de KM
- origem do KM (`CHECKLIST`, `ADMIN`, `MANUTENCAO`, `ABASTECIMENTO`)
- abastecimentos
- litros
- valor total
- valor por litro
- posto
- hodometro no abastecimento
- tanque cheio ou parcial

Indicadores gerados:

- consumo medio por veiculo
- custo por km
- km rodado por periodo
- desvio de consumo
- veiculos com uso abaixo ou acima da media

## 6. Custos e documentos

Para gerir frota de verdade, o modulo precisa centralizar custo.

Sugestao de categorias de despesa:

- combustivel
- manutencao
- pneu
- documentacao
- seguro
- lavagem
- patio ou guincho
- multa
- locacao
- acessorios

Sugestao de documentos:

- CRLV
- seguro
- contrato de locacao
- vistoria
- fotos do veiculo

Cada documento deve ter:

- arquivo
- numero
- emissao
- vencimento
- observacoes

## 7. Alertas

O modulo fica forte quando trabalha por excecao.

Alertas que valem muito:

- manutencao vencida por data
- manutencao vencida por KM
- seguro vencendo
- licenciamento vencendo
- veiculo sem checklist hoje
- veiculo sem KM atualizado ha X dias
- veiculo parado ha X dias
- consumo fora do esperado

## Modelo de dados sugerido

### Ajustes nas entidades atuais

`FleetVehicle`

- adicionar dados tecnicos e documentais
- adicionar campos de controle de custo e metas

`FleetVehicleMaintenanceTask`

- evoluir para guardar tipo, prioridade, oficina e custo

`FleetVehicleOdometerLog`

- guardar origem do registro
- opcionalmente vincular motorista e alocacao ativa

### Novas entidades recomendadas

`FleetVehicleMaintenancePlan`

- regra recorrente por data e ou KM

`FleetVehicleExpense`

- despesa consolidada por categoria

`FleetVehicleRefuel`

- abastecimento com litros, custo e KM

`FleetVehicleDocument`

- documentos com vencimento e arquivo

`FleetVehicleIncident`

- avaria, sinistro, multa, observacao critica

`FleetVehicleStatusLog`

- timeline historica do status do carro

## Ordem de implementacao

### Fase 1 - organizar o que ja existe

- transformar a tela principal em dashboard + listagem
- mostrar ultimo KM na listagem
- mostrar tarefas vencidas e vencendo
- mostrar checklist diario no admin
- mostrar historico de alocacoes
- mostrar timeline simples do veiculo

### Fase 2 - manutencao de verdade

- criar plano recorrente de manutencao
- gerar alertas por KM e data
- registrar ordem de servico com custo
- permitir tirar carro de operacao com motivo

### Fase 3 - custo e abastecimento

- registrar abastecimento
- calcular consumo medio
- criar centro de custo do veiculo
- dashboard com custo por km e custo mensal

### Fase 4 - documentos e compliance

- documentos com vencimento
- alertas automáticos
- anexos e historico

## Primeira entrega recomendada neste projeto

Se for para começar agora sem abrir uma frente enorme, eu faria este pacote:

1. Dashboard de frota no admin
2. Historico de alocacoes do veiculo
3. Checklist diario visivel no admin
4. Alertas de manutencao por data e KM
5. Evolucao da manutencao para incluir tipo, prioridade e custo

Esse pacote ja muda o modulo de "cadastro de carro" para "gestao operacional de frota".

## Endpoints que provavelmente vao ser necessarios

- `GET /admin/fleet/overview`
- `GET /admin/fleet/vehicles/:vehicleId/history`
- `GET /admin/fleet/vehicles/:vehicleId/assignments`
- `POST /admin/fleet/vehicles/:vehicleId/maintenance-plans`
- `POST /admin/fleet/vehicles/:vehicleId/refuels`
- `POST /admin/fleet/vehicles/:vehicleId/expenses`
- `POST /admin/fleet/vehicles/:vehicleId/documents`

## Observacao importante

O sistema ja tem um bom alicerce para frota:

- o motorista da frota valida o carro no inicio do turno
- o checklist diario ja existe
- a alocacao ja existe
- o controle basico de manutencao e KM ja existe

Entao o trabalho correto agora e consolidar isso em uma experiencia de gestao e acrescentar:

- historico
- alertas
- recorrencia
- custo
- documentos
