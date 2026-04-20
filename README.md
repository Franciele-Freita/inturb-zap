# Inturb Zap Backend

Backend inicial em NestJS para o fluxo de agendamento de corridas via WhatsApp.

## Requisitos
- Node.js 20+
- PostgreSQL 15+
- pnpm

## Setup rapido
1. Instalar dependencias:
   - `npm install`
2. Copiar ambiente:
   - `Copy-Item .env.example .env`
3. Subir PostgreSQL e ajustar `DATABASE_URL` no `.env`.
4. Aplicar schema no banco:
   - `npm run prisma:push`
5. Gerar cliente Prisma:
   - `npm run prisma:generate`
6. Rodar API em dev:
   - `npm run start:dev`
7. (Opcional) Ativar envio real no WhatsApp:
   - preencher `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
   - definir `WHATSAPP_SEND_ENABLED=true`
8. (Opcional, recomendado para cotacao real) Ativar Google Maps:
   - preencher `GOOGLE_MAPS_API_KEY`
   - habilitar Geocoding API e Routes API no projeto Google Cloud
8. Rodar os apps web em Next.js:
   - Admin: `cd apps/admin-panel` e `pnpm dev`
   - Passenger: `cd apps/passenger-app` e `pnpm dev`
   - Driver: `cd apps/driver-app` e `pnpm dev`
9. (Opcional, recomendado para PWA/Web Push no celular) subir tudo com `ngrok`:
   - `pnpm tunnel`
   - o arquivo `ngrok.yml` ja esta preparado para subir `api`, `passenger-app` e `driver-app` no mesmo agente
   - ajuste `NEXT_PUBLIC_API_BASE_URL` nos apps web para a URL publica da `api`

## Endpoints iniciais
- `GET /api/health`
- `POST /api/rides/quote`
- `POST /api/rides/:rideId/prebook`
- `GET /api/rides/:rideId/events`
- `GET /api/drivers`
- `POST /api/drivers`
- `POST /api/drivers/:driverId/vehicles`
- `GET /api/drivers/prebooked-rides`
- `POST /api/drivers/:driverId/rides/:rideId/decision`
- `GET /api/admin/metrics`
- `GET /api/admin/customers`
- `GET /api/notifications`
- `POST /api/notifications/:notificationId/read`
- `GET /api/notifications/push/public-key`
- `POST /api/notifications/push/subscribe`
- `POST /api/notifications/push/unsubscribe`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`
- `POST /api/whatsapp/simulate`
- `POST /api/audio/transcribe`
- `POST /api/auth/login`

## Web Push e PWA do driver-app
- O `driver-app` agora suporta PWA + Web Push proprio.
- Para producao, configure no backend:
  - `WEB_PUSH_SUBJECT`
  - `WEB_PUSH_PUBLIC_KEY`
  - `WEB_PUSH_PRIVATE_KEY`
- Os placeholders estao em `.env.example`.
- Sem essas variaveis, o backend gera chaves VAPID efemeras apenas para desenvolvimento. Isso significa que, ao reiniciar a API, subscriptions antigas podem deixar de funcionar e o motorista precisara reinscrever o aparelho.
- Para gerar um novo par de chaves VAPID:
  - `pnpm webpush:keys`
- Para usar no celular com Web Push real, abra os apps por `HTTPS`. Em desenvolvimento, o caminho mais simples e usar `ngrok`.

## Ambiente web com ngrok
1. Suba a API:
   - `pnpm start:dev`
2. Suba os apps web:
   - Passenger: `cd apps/passenger-app` e `pnpm dev`
   - Driver: `cd apps/driver-app` e `pnpm dev`
3. Suba os tunnels juntos:
   - `pnpm tunnel`
4. Copie a URL publica gerada para `api` e ajuste:
   - `apps/passenger-app/.env.local`
   - `apps/driver-app/.env.local`
5. Use nos dois arquivos:
```env
NEXT_PUBLIC_API_BASE_URL=https://SEU-TUNNEL-DA-API.ngrok-free.app/api
```
6. Reinicie `passenger-app` e `driver-app` depois de trocar o `.env.local`.
7. Abra no celular:
   - Passenger pela URL publica do tunnel `passenger-app`
   - Driver pela URL publica do tunnel `driver-app`
8. No `driver-app`, faca login e toque em `Ativar` no card de notificacoes.

Observacao:
- Se o seu plano do `ngrok` limitar quantidade de agentes simultaneos, manter `api`, `passenger-app` e `driver-app` no mesmo `ngrok.yml` e iniciar tudo com `pnpm tunnel` evita abrir agentes separados.
- Se o dominio publico do `ngrok` mudar, atualize `NEXT_PUBLIC_API_BASE_URL` nos dois apps web e reinicie os `pnpm dev`.

## Exemplo rapido (simulacao WhatsApp)
`POST /api/whatsapp/simulate`
```json
{
  "from": "5511999999999",
  "type": "text",
  "text": "nome: Maria da Silva; origem: Rua A, 123; destino: Avenida B, 456; horario: 11/03/2026 18:30"
}
```

No modo `simulate`, o sistema nao envia para a Meta e retorna em `deliveries` que o dispatch esta desabilitado.

## Observacao
O fluxo de corridas ja esta persistindo em PostgreSQL com Prisma.
Quando `GOOGLE_MAPS_API_KEY` estiver configurado, a API valida origem e destino via Google Geocoding e calcula rota real via Routes API.
Sem essa chave, o sistema continua funcionando em modo local com estimativa simplificada, sem validacao real de endereco.
Os apps locais ficam em:
- Admin: `http://localhost:3001`
- Passenger: `http://localhost:3002`
- Driver: `http://localhost:3003`
Todos conversam com a API em `http://localhost:3000/api`.
Os clientes sao consolidados pela API usando `customerPhone` como identificador principal.
O painel foi separado em fluxos:
- `/drivers`
- `/customers`
- `/notifications`
- `/rides`
- `apps/passenger-app`
- `apps/driver-app`
Na tela `/drivers`, o motorista e criado primeiro e o veiculo e associado em uma segunda etapa.

## Roteiro local sem WhatsApp
1. Criar um motorista:
```json
POST /api/drivers
{
  "name": "Motorista 1",
  "phone": "27999990001",
  "vehicle": "Onix Branco"
}
```
2. Simular a mensagem do cliente:
```json
POST /api/whatsapp/simulate
{
  "from": "5511999999999",
  "type": "text",
  "text": "nome: Maria da Silva; origem: Rua A, 123; destino: Av B, 456; horario: 12/03/2026 18:30"
}
```
3. Confirmar o pre-agendamento usando o `rideId` retornado:
```json
POST /api/whatsapp/simulate
{
  "from": "5511999999999",
  "type": "text",
  "text": "confirmar RIDE_ID"
}
```
4. Validar notificacoes internas:
   - `GET /api/notifications`
5. Validar a fila do motorista:
   - `GET /api/drivers/prebooked-rides`
6. Aceitar ou recusar a corrida:
```json
POST /api/drivers/DRIVER_ID/rides/RIDE_ID/decision
{
  "decision": "ACCEPT"
}
```
7. Inspecionar a timeline da corrida:
   - `GET /api/rides/RIDE_ID/events`
"# inturb-zap" 
