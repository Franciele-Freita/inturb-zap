-email de conta meta: inturbapp@gmail.com

# Plano do Projeto - Agendamento de Corridas via WhatsApp

## Objetivo do MVP
Permitir que o cliente solicite corrida pelo WhatsApp (texto e audio), receba cotacao de tempo/valor, confirme o pre-agendamento, e que o motorista possa aceitar ou recusar via painel com notificacao em tempo real.

## Escopo do MVP
1. Cliente envia mensagem no WhatsApp (texto/audio).
2. Bot coleta origem, destino e horario.
3. Sistema calcula distancia/tempo no Google Maps.
4. Sistema calcula preco e envia cotacao.
5. Cliente confirma.
6. Corrida vira pre-agendamento.
7. Motorista recebe notificacao e aceita/recusa.
8. Cliente recebe resposta final do status.

## Stack Tecnica (Backend em NestJS)
- Backend: NestJS + TypeScript
- Banco: PostgreSQL + Prisma
- Filas/assinc: Redis + BullMQ
- Tempo real: WebSocket
- Mensageria: WhatsApp Cloud API
- Rotas e ETA: Google Maps Platform
- Audio para texto: STT provider (Google/Azure/OpenAI)
- Frontend motorista: Web app (PWA)

## Modulos Principais do Backend
1. `whatsapp`: webhook, envio de mensagens, templates.
2. `rides`: maquina de estados da corrida.
3. `pricing`: regras de tarifa.
4. `maps`: distancia, ETA e validacao de endereco.
5. `audio`: download de midia e transcricao.
6. `drivers`: disponibilidade e aceite/recusa.
7. `notifications`: websocket/push/fallback.
8. `auth`: autenticacao e autorizacao.
9. `admin`: operacao e auditoria.

## Maquina de Estados da Corrida
`NEW -> QUOTED -> PREBOOKED -> ACCEPTED | REJECTED | EXPIRED | CANCELLED`

## Cronograma de 12 Sprints
1. Sprint 1: Fundacao (NestJS, Prisma, CI, logs, healthcheck).
2. Sprint 2: Dominio e modelo de dados.
3. Sprint 3: Webhook WhatsApp texto.
4. Sprint 4: Fluxo conversacional de coleta.
5. Sprint 5: Google Maps + motor de preco.
6. Sprint 6: Confirmacao e pre-agendamento.
7. Sprint 7: Aceite/recusa do motorista com concorrencia.
8. Sprint 8: Notificacoes em tempo real + fallback.
9. Sprint 9: Audio e transcricao.
10. Sprint 10: Painel operacional/admin.
11. Sprint 11: Hardening (seguranca, carga, resiliencia).
12. Sprint 12: Go-live gradual e estabilizacao.

## Backlog Base (Epics)
1. Plataforma Base e DevOps
2. Dominio de Corridas e Estado
3. WhatsApp Cloud API
4. Cotacao (Maps + Pricing)
5. Pre-agendamento e Despacho
6. Painel Motorista e Notificacoes
7. Audio e Transcricao
8. Painel Operacional/Admin
9. Seguranca, Observabilidade e Go-live

## KPIs Minimos para Go-live
1. Tempo medio de cotacao < 10s.
2. Sucesso do fluxo WhatsApp (inicio ate prebook) > 95%.
3. Latencia de notificacao ao motorista (p95) < 5s.
4. Erro 5xx backend < 1%.
5. Conversao `NEW -> ACCEPTED` acompanhada diariamente no piloto.

## Definition of Done (padrao)
1. Testes cobrindo fluxo principal.
2. Logs e metricas instrumentados.
3. Endpoint/fluxo documentado.
4. Validacao em staging com criterio de aceite aprovado.

## Diretriz de Produto do Admin Panel
Para as proximas implementacoes do painel administrativo, a referencia oficial de produto, arquitetura e UX passa a ser:

`docs/ADMIN_PANEL_SAAS_BLUEPRINT.md`

Objetivo:
- construir um painel premium, com pensamento de produto final
- evitar telas pensadas apenas para desenvolvimento interno
- manter arquitetura limpa, IA clara e UX operacional madura
