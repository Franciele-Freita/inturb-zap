import { Injectable, Logger } from "@nestjs/common";
import { CreateQuoteDto } from "../rides/dto/create-quote.dto";
import { Ride } from "../rides/types";
import { RidesService } from "../rides/rides.service";

export interface NormalizedMessage {
  from: string;
  type: string;
  text?: string;
}

export interface WebhookAction {
  type: "QUOTE_CREATED" | "RIDE_PREBOOKED" | "AUDIO_RECEIVED" | "INVALID_TEXT_FORMAT" | "IGNORED";
  from: string;
  rideId?: string;
  details: string;
}

export interface WebhookOutboundMessage {
  to: string;
  text: string;
}

export interface OutboundDeliveryResult {
  to: string;
  sent: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface WebhookProcessResult {
  received: number;
  messages: NormalizedMessage[];
  actions: WebhookAction[];
  outboundMessages: WebhookOutboundMessage[];
  deliveries: OutboundDeliveryResult[];
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly ridesService: RidesService) {}

  async processWebhook(payload: unknown): Promise<WebhookProcessResult> {
    const messages = this.extractMessages(payload);
    return this.processIncomingMessages(messages, {
      dispatchOutbound: this.isOutboundDispatchEnabled()
    });
  }

  async simulateInboundMessage(message: NormalizedMessage): Promise<WebhookProcessResult> {
    return this.processIncomingMessages([message], {
      dispatchOutbound: false
    });
  }

  private async processIncomingMessages(
    messages: NormalizedMessage[],
    options: { dispatchOutbound: boolean }
  ): Promise<WebhookProcessResult> {
    const actions: WebhookAction[] = [];
    const outboundMessages: WebhookOutboundMessage[] = [];

    for (const message of messages) {
      if (message.type === "audio") {
        actions.push({
          type: "AUDIO_RECEIVED",
          from: message.from,
          details: "Audio recebido e aguardando transcricao via modulo de audio."
        });
        outboundMessages.push({
          to: message.from,
          text: "Recebi seu audio. Vou transcrever e seguir com a cotacao."
        });
        continue;
      }

      if (message.type !== "text" || !message.text?.trim()) {
        actions.push({
          type: "IGNORED",
          from: message.from,
          details: "Mensagem ignorada por tipo nao suportado ou texto vazio."
        });
        continue;
      }

      const confirmRideId = this.extractConfirmRideId(message.text);
      if (confirmRideId) {
        try {
          const ride = await this.ridesService.prebookRide(confirmRideId, true);
          actions.push({
            type: "RIDE_PREBOOKED",
            from: message.from,
            rideId: ride.id,
            details: "Pre-agendamento confirmado pelo cliente no WhatsApp."
          });
          outboundMessages.push({
            to: message.from,
            text: this.formatPrebookedMessage(ride)
          });
        } catch (error) {
          actions.push({
            type: "INVALID_TEXT_FORMAT",
            from: message.from,
            rideId: confirmRideId,
            details: error instanceof Error ? error.message : "Falha ao pre-agendar corrida."
          });
          outboundMessages.push({
            to: message.from,
            text: "Nao consegui confirmar seu pre-agendamento. Verifique o ID e tente novamente."
          });
        }
        continue;
      }

      const parseResult = this.extractQuoteDto(message);
      if (!parseResult.dto) {
        actions.push({
          type: "INVALID_TEXT_FORMAT",
          from: message.from,
          details: parseResult.error ?? "Formato invalido para cotacao."
        });
        outboundMessages.push({
          to: message.from,
          text: this.formatHelpMessage()
        });
        continue;
      }

      const ride = await this.ridesService.createQuote(parseResult.dto);
      actions.push({
        type: "QUOTE_CREATED",
        from: message.from,
        rideId: ride.id,
        details: "Cotacao criada com sucesso via WhatsApp."
      });
      outboundMessages.push({
        to: message.from,
        text: this.formatQuoteMessage(ride)
      });
    }

    const deliveries = await this.dispatchOutboundMessages(outboundMessages, options.dispatchOutbound);

    return {
      received: messages.length,
      messages,
      actions,
      outboundMessages,
      deliveries
    };
  }

  private async dispatchOutboundMessages(
    outboundMessages: WebhookOutboundMessage[],
    dispatchEnabled: boolean
  ): Promise<OutboundDeliveryResult[]> {
    if (!dispatchEnabled) {
      return outboundMessages.map((msg) => ({
        to: msg.to,
        sent: false,
        error: "Dispatch desabilitado (modo simulacao ou WHATSAPP_SEND_ENABLED=false)."
      }));
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v21.0";

    if (!accessToken || !phoneNumberId) {
      this.logger.warn("Credenciais WhatsApp ausentes. Respostas nao foram enviadas ao provedor.");
      return outboundMessages.map((msg) => ({
        to: msg.to,
        sent: false,
        error: "Credenciais WhatsApp ausentes no ambiente."
      }));
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const results: OutboundDeliveryResult[] = [];

    for (const outbound of outboundMessages) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: outbound.to,
            type: "text",
            text: {
              body: outbound.text
            }
          })
        });

        const payload = (await response.json().catch(() => ({}))) as {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        };

        if (!response.ok) {
          const errorMessage = payload.error?.message ?? `Erro HTTP ${response.status}`;
          this.logger.error(`Falha ao enviar mensagem para ${outbound.to}: ${errorMessage}`);
          results.push({
            to: outbound.to,
            sent: false,
            error: errorMessage
          });
          continue;
        }

        results.push({
          to: outbound.to,
          sent: true,
          providerMessageId: payload.messages?.[0]?.id
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro inesperado no envio.";
        this.logger.error(`Falha de rede no envio para ${outbound.to}: ${message}`);
        results.push({
          to: outbound.to,
          sent: false,
          error: message
        });
      }
    }

    return results;
  }

  private isOutboundDispatchEnabled(): boolean {
    return (process.env.WHATSAPP_SEND_ENABLED ?? "false").toLowerCase() === "true";
  }

  private extractMessages(payload: unknown): NormalizedMessage[] {
    const messages: NormalizedMessage[] = [];

    if (!payload || typeof payload !== "object") {
      return messages;
    }

    const entries = (payload as { entry?: unknown[] }).entry ?? [];
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] }).changes ?? [];
      for (const change of changes) {
        const value = (change as { value?: { messages?: unknown[] } }).value;
        const rawMessages = value?.messages ?? [];

        for (const rawMessage of rawMessages) {
          const candidate = rawMessage as {
            from?: string;
            type?: string;
            text?: { body?: string };
          };

          messages.push({
            from: candidate.from ?? "unknown",
            type: candidate.type ?? "unknown",
            text: candidate.text?.body
          });
        }
      }
    }

    return messages;
  }

  private extractConfirmRideId(text: string): string | null {
    const confirmationMatch = text.match(/(?:confirmar|confirm)\s*[:#-]?\s*([a-zA-Z0-9_-]+)/i);
    if (!confirmationMatch) {
      return null;
    }

    return confirmationMatch[1];
  }

  private extractQuoteDto(message: NormalizedMessage): { dto?: CreateQuoteDto; error?: string } {
    if (!message.text) {
      return { error: "Texto vazio para cotacao." };
    }

    const fields = this.parseKeyValuePairs(message.text);
    const customerName =
      fields.get("nome completo") ??
      fields.get("nome") ??
      fields.get("cliente") ??
      fields.get("name");
    const origin = fields.get("origem") ?? fields.get("origin");
    const destination = fields.get("destino") ?? fields.get("destination");
    const scheduleInput =
      fields.get("horario") ??
      fields.get("datahora") ??
      fields.get("data_hora") ??
      fields.get("quando") ??
      fields.get("datetime");

    if (!customerName || !origin || !destination || !scheduleInput) {
      return { error: "Campos obrigatorios: nome completo, origem, destino e horario." };
    }

    const schedule = this.parseSchedule(scheduleInput);
    if (!schedule) {
      return {
        error: "Horario invalido. Use ISO (2026-03-11T18:30:00-03:00) ou DD/MM/AAAA HH:mm."
      };
    }

    return {
      dto: {
        customerName,
        origin,
        destination,
        scheduledAt: schedule.toISOString(),
        customerPhone: message.from
      }
    };
  }

  private parseKeyValuePairs(text: string): Map<string, string> {
    const map = new Map<string, string>();
    const lines = text
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (!match) {
        continue;
      }

      const key = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const value = match[2].trim();
      map.set(key, value);
    }

    return map;
  }

  private parseSchedule(value: string): Date | null {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!brMatch) {
      return null;
    }

    const [, day, month, year, hour, minute] = brMatch;
    const normalized = `${year}-${month}-${day}T${hour}:${minute}:00-03:00`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatQuoteMessage(ride: Ride): string {
    const amount = ride.quote?.amount.toFixed(2) ?? "0.00";
    const distance = ride.quote?.routeDistanceKm.toFixed(1) ?? "0.0";
    const eta = ride.quote?.routeDurationMinutes ?? 0;

    return [
      `Cotacao pronta para a corrida ${ride.id}.`,
      `Distancia: ${distance} km`,
      `Tempo estimado: ${eta} min`,
      `Valor: R$ ${amount}`,
      `Para confirmar, responda: confirmar ${ride.id}`
    ].join("\n");
  }

  private formatPrebookedMessage(ride: Ride): string {
    return [
      `Pre-agendamento confirmado para a corrida ${ride.id}.`,
      "Agora vamos enviar para os motoristas aceitarem ou recusarem.",
      "Voce sera avisado assim que houver uma resposta."
    ].join("\n");
  }

  private formatHelpMessage(): string {
    return [
      "Formato esperado para iniciar a conversa:",
      "nome: Maria da Silva; origem: Rua A, 123; destino: Avenida B, 456; horario: 11/03/2026 18:30",
      "Ou use ISO em horario: 2026-03-11T18:30:00-03:00"
    ].join("\n");
  }
}
