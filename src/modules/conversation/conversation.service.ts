import { NotFoundException } from "@nestjs/common";
import { ConversationSession as PrismaConversationSession, Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { AdminService } from "../admin/admin.service";
import { CustomerFavoriteAddressSummary, CustomerSummary, TripTypeSummary } from "../admin/types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQuoteDto } from "../rides/dto/create-quote.dto";
import { RidesService } from "../rides/rides.service";
import {
  ConversationDraft,
  ConversationMessage,
  ConversationSessionView,
  ConversationState,
  ConversationStep
} from "./types";

const initialDraft: ConversationDraft = {
  customerName: "",
  preferredName: "",
  from: "",
  tripTypeSlug: "",
  tripTypeName: "",
  baggageCount: null,
  baggageSize: "",
  petType: "",
  petSize: "",
  customerHasReducedMobility: null,
  passengerCount: 1,
  companionNeedsSpecialAttention: null,
  companionSpecialAttentionDetails: "",
  hasIntermediateStops: null,
  intermediateStopsSummary: "",
  origin: "",
  destination: "",
  scheduledAt: ""
};

function makeMessage(role: ConversationMessage["role"], text: string): ConversationMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text
  };
}

function createInitialMessages(): ConversationMessage[] {
  return [
    makeMessage("bot", "Ola! Seja bem-vindo a Inturb."),
    makeMessage(
      "bot",
      "Vamos te guiar passo a passo para solicitar sua corrida.\nE rapido e leva menos de um minuto."
    ),
    makeMessage("bot", "Clique em comecar para iniciar.")
  ];
}

function createNewCustomerWelcomeMessages(): ConversationMessage[] {
  return [
    makeMessage("bot", "Oi, seja bem-vindo a Inturb."),
    makeMessage("bot", "Por aqui voce pode pedir ou agendar sua corrida de forma rapida."),
    makeMessage("bot", "Vou te pedir alguns dados e te mostrar tudo antes de confirmar.")
  ];
}

function normalizeChatValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isConversationStep(step: string): step is ConversationStep {
  return [
    "intro",
    "phone",
    "existingCustomerConfirm",
    "customerName",
    "customerPreferredName",
    "customerAccessibilityProfile",
    "originFavoriteSelect",
    "origin",
    "originFavoriteConfirm",
    "originFavoriteLabel",
    "destinationFavoriteSelect",
    "destination",
    "destinationFavoriteConfirm",
    "destinationFavoriteLabel",
    "tripTypeSelect",
    "baggageCount",
    "baggageSize",
    "petType",
    "petSize",
    "passengerCount",
    "companionSpecialAttention",
    "intermediateStopsConfirm",
    "intermediateStopsDetails",
    "scheduledAt",
    "quoteReady",
    "confirmed"
  ].includes(step);
}

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ridesService: RidesService,
    private readonly adminService: AdminService
  ) {}

  async createSession(phone?: string): Promise<ConversationSessionView> {
    const normalizedPhone = phone?.trim();

    if (!normalizedPhone) {
      const session = await this.prisma.conversationSession.create({
        data: {
          currentStep: "intro",
          latestRideId: null,
          customerPhone: null,
          state: this.serializeState(this.createInitialState()),
          messages: this.serializeMessages(createInitialMessages())
        }
      });

      return this.toSessionView(session);
    }

    const { state, currentStep, messages } = await this.buildAuthenticatedStart(normalizedPhone);
    const session = await this.prisma.conversationSession.create({
      data: {
        currentStep,
        latestRideId: null,
        customerPhone: normalizedPhone,
        state: this.serializeState(state),
        messages: this.serializeMessages(messages)
      }
    });

    return this.toSessionView(session);
  }

  async getSession(sessionId: string): Promise<ConversationSessionView> {
    const session = await this.requireSession(sessionId);
    return this.toSessionView(session);
  }

  async startSession(sessionId: string): Promise<ConversationSessionView> {
    const session = await this.requireSession(sessionId);
    const currentStep = this.getCurrentStep(session.currentStep);

    if (currentStep !== "intro") {
      return this.toSessionView(session);
    }

    const messages = this.parseMessages(session.messages);
    messages.push(makeMessage("system", "Atendimento iniciado pelo cliente."));
    messages.push(makeMessage("bot", "Primeiro, me informe o telefone do cliente."));

    const updated = await this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        currentStep: "phone",
        messages: this.serializeMessages(messages)
      }
    });

    return this.toSessionView(updated);
  }

  async resetSession(sessionId: string): Promise<ConversationSessionView> {
    await this.requireSession(sessionId);

    const updated = await this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        currentStep: "intro",
        latestRideId: null,
        customerPhone: null,
        state: this.serializeState(this.createInitialState()),
        messages: this.serializeMessages(createInitialMessages())
      }
    });

    return this.toSessionView(updated);
  }

  async sendMessage(sessionId: string, text: string): Promise<ConversationSessionView> {
    const session = await this.requireSession(sessionId);
    const currentStep = this.getCurrentStep(session.currentStep);
    const state = this.parseState(session.state);
    const messages = this.parseMessages(session.messages);
    const value = text.trim();

    if (!value) {
      return this.toSessionView(session);
    }

    messages.push(makeMessage("user", value));

    let nextStep = currentStep;
    let latestRideId = session.latestRideId ?? "";

    if (currentStep === "intro") {
      messages.push(makeMessage("bot", "Clique em comecar para iniciar o atendimento."));
    } else if (currentStep === "quoteReady") {
      if (normalizeChatValue(value) === "confirmar") {
        if (!latestRideId) {
          messages.push(makeMessage("bot", "Ainda nao existe uma corrida recente para confirmar."));
        } else {
          const ride = await this.ridesService.prebookRide(latestRideId, true);
          nextStep = "confirmed";
          messages.push(makeMessage("system", "Pedido confirmado pelo cliente."));
          messages.push(makeMessage("bot", this.formatPrebookedMessage(ride.id)));
        }
      } else {
        messages.push(makeMessage("bot", "Se quiser seguir com o pedido, responda confirmar."));
      }
    } else if (currentStep === "confirmed") {
      messages.push(makeMessage("bot", "Esse pedido ja foi enviado para operacao. Se quiser, abra uma nova conversa."));
    } else if (currentStep === "existingCustomerConfirm") {
      const normalized = normalizeChatValue(value);

      if (["sim", "s", "isso", "correto"].includes(normalized) && state.matchedCustomer) {
        state.draft.customerName = state.matchedCustomer.name;
        state.draft.preferredName = this.inferPreferredName(state.matchedCustomer.name);
        if (typeof state.matchedCustomer.hasReducedMobility === "boolean") {
          state.draft.customerHasReducedMobility = state.matchedCustomer.hasReducedMobility;
          messages.push(...this.buildOriginPrompt(state));
          nextStep = state.favoriteAddresses.length > 0 ? "originFavoriteSelect" : "origin";
        } else {
          nextStep = "customerAccessibilityProfile";
          messages.push(makeMessage("bot", "Antes de seguir, quero deixar seu cadastro certinho."));
          messages.push(makeMessage("bot", "Voce tem mobilidade reduzida ou costuma precisar de atencao especial no embarque? Responda sim ou nao."));
        }
      } else if (["nao", "n", "outro"].includes(normalized)) {
        state.matchedCustomer = null;
        state.favoriteAddresses = [];
        nextStep = "customerName";
        messages.push(makeMessage("bot", "Certo. Entao me diga o nome completo correto do cliente."));
      } else {
        messages.push(makeMessage("bot", "Responda sim para usar esse cadastro ou nao para informar outro nome."));
      }
    } else if (currentStep === "phone") {
      state.draft.from = value;
      messages.push(makeMessage("system", "Bot consultando se esse telefone ja tem cadastro anterior."));

      try {
        const customer = await this.lookupCustomerByPhone(value);

        if (customer) {
          state.matchedCustomer = customer;
          state.favoriteAddresses = customer.favorites ?? [];
          nextStep = "existingCustomerConfirm";
          messages.push(makeMessage("bot", `Oi, ${this.inferPreferredName(customer.name)}.`));
          messages.push(makeMessage("bot", `Encontrei seu cadastro com o nome ${customer.name}.`));
          messages.push(makeMessage("bot", "Posso seguir com esse nome? Responda sim ou nao."));
        } else {
          state.matchedCustomer = null;
          state.favoriteAddresses = [];
          nextStep = "customerName";
          messages.push(...createNewCustomerWelcomeMessages());
          messages.push(makeMessage("bot", "Para comecar, me diga seu nome completo."));
        }
      } catch (error) {
        state.matchedCustomer = null;
        state.favoriteAddresses = [];
        nextStep = "customerName";
        messages.push(makeMessage("bot", error instanceof Error ? error.message : "Nao consegui consultar o historico agora."));
        messages.push(makeMessage("bot", "Vamos seguir manualmente. Me diga o nome completo do cliente."));
      }
    } else if (currentStep === "customerName") {
      if (this.isGreetingOrRideIntent(value)) {
        messages.push(makeMessage("bot", "Oi! Para eu seguir com sua corrida, me diga seu nome completo."));
      } else {
        const fullName = this.parseFullName(value);

        if (!fullName) {
          messages.push(makeMessage("bot", "Para seguir, preciso do seu nome completo, com nome e sobrenome."));
        } else {
          state.draft.customerName = fullName;
          await this.captureCustomerLead(state.draft.from, fullName);
          nextStep = "customerPreferredName";
          messages.push(makeMessage("bot", `Perfeito. Vou cadastrar como ${fullName}.`));
          messages.push(makeMessage("bot", "Como voce gostaria de ser chamado aqui no atendimento? Pode ser apelido ou so o primeiro nome."));
        }
      }
    } else if (currentStep === "customerPreferredName") {
      if (this.isGreetingOrRideIntent(value)) {
        messages.push(makeMessage("bot", "Como voce prefere ser chamado? Pode me dizer um apelido ou so o primeiro nome."));
      } else {
        const preferredName = this.parsePreferredName(value);

        if (!preferredName) {
          messages.push(makeMessage("bot", "Me diga um nome curto para o atendimento, como Fran, Joao ou Maria."));
        } else {
          state.draft.preferredName = preferredName;
          nextStep = "customerAccessibilityProfile";
          messages.push(makeMessage("bot", "Antes de seguir, quero deixar seu cadastro certinho."));
          messages.push(makeMessage("bot", "Voce tem mobilidade reduzida ou costuma precisar de atencao especial no embarque? Responda sim ou nao."));
        }
      }
    } else if (currentStep === "customerAccessibilityProfile") {
      const normalized = normalizeChatValue(value);

      if (["sim", "s", "tenho"].includes(normalized)) {
        state.draft.customerHasReducedMobility = true;
        await this.captureCustomerAccessibility(state.draft.from, true);
        messages.push(makeMessage("bot", "Perfeito. Vou deixar isso salvo no seu cadastro para os proximos atendimentos."));
        messages.push(...this.buildOriginPrompt(state));
        nextStep = state.favoriteAddresses.length > 0 ? "originFavoriteSelect" : "origin";
      } else if (["nao", "n", "nao tenho"].includes(normalized)) {
        state.draft.customerHasReducedMobility = false;
        await this.captureCustomerAccessibility(state.draft.from, false);
        messages.push(...this.buildOriginPrompt(state));
        nextStep = state.favoriteAddresses.length > 0 ? "originFavoriteSelect" : "origin";
      } else {
        messages.push(makeMessage("bot", "Responda sim ou nao para eu salvar essa informacao no seu cadastro."));
      }
    } else if (currentStep === "originFavoriteSelect") {
      const manualRequest = ["digitar outro", "outro", "manual"].includes(normalizeChatValue(value));
      const favorite = manualRequest ? null : this.findFavoriteByInput(state.favoriteAddresses, value);

      if (favorite) {
        state.draft.origin = favorite.address;
        messages.push(...this.buildDestinationPrompt(state, favorite.label, "origem"));
        nextStep = state.favoriteAddresses.length > 0 ? "destinationFavoriteSelect" : "destination";
      } else if (manualRequest) {
        nextStep = "origin";
        messages.push(makeMessage("bot", "Certo. Me diga o local de origem da corrida."));
      } else {
        state.draft.origin = value;
        state.pendingFavoriteTarget = "origin";
        state.pendingFavoriteAddress = value;
        nextStep = "originFavoriteConfirm";
        messages.push(makeMessage("bot", "Deseja salvar esse endereco como favorito?"));
        messages.push(makeMessage("bot", "Responda sim para informar um nome, como Casa, ou nao para seguir."));
      }
    } else if (currentStep === "origin") {
      state.draft.origin = value;
      state.pendingFavoriteTarget = "origin";
      state.pendingFavoriteAddress = value;
      nextStep = "originFavoriteConfirm";
      messages.push(makeMessage("bot", "Deseja salvar esse endereco como favorito?"));
      messages.push(makeMessage("bot", "Responda sim para informar um nome, como Casa, ou nao para seguir."));
    } else if (currentStep === "originFavoriteConfirm") {
      const normalized = normalizeChatValue(value);

      if (["sim", "s", "salvar", "quero"].includes(normalized)) {
        nextStep = "originFavoriteLabel";
        messages.push(makeMessage("bot", "Qual nome voce quer dar para esse endereco? Ex.: Casa, Trabalho ou Mae."));
      } else if (["nao", "n", "nao quero"].includes(normalized)) {
        this.clearPendingFavorite(state);
        messages.push(...this.buildDestinationPrompt(state));
        nextStep = state.favoriteAddresses.length > 0 ? "destinationFavoriteSelect" : "destination";
      } else {
        messages.push(makeMessage("bot", "Responda sim para salvar esse endereco ou nao para seguir sem salvar."));
      }
    } else if (currentStep === "originFavoriteLabel") {
      if (!state.pendingFavoriteAddress || state.pendingFavoriteTarget !== "origin") {
        this.clearPendingFavorite(state);
        messages.push(...this.buildDestinationPrompt(state, undefined, undefined, "Nao encontrei um endereco pendente para salvar."));
        nextStep = state.favoriteAddresses.length > 0 ? "destinationFavoriteSelect" : "destination";
      } else {
        messages.push(makeMessage("system", "Salvando endereco favorito do cliente."));
        try {
          const favorite = await this.adminService.saveFavoriteAddress(state.draft.from, {
            customerName: state.draft.customerName,
            label: value,
            address: state.pendingFavoriteAddress
          });
          state.favoriteAddresses = this.upsertFavorite(state.favoriteAddresses, favorite);
          this.clearPendingFavorite(state);
          messages.push(...this.buildDestinationPrompt(state, favorite.label, "endereco salvo"));
          nextStep = state.favoriteAddresses.length > 0 ? "destinationFavoriteSelect" : "destination";
        } catch (error) {
          this.clearPendingFavorite(state);
          messages.push(...this.buildDestinationPrompt(state, undefined, undefined, error instanceof Error ? error.message : "Nao consegui salvar o endereco favorito agora."));
          nextStep = state.favoriteAddresses.length > 0 ? "destinationFavoriteSelect" : "destination";
        }
      }
    } else if (currentStep === "destinationFavoriteSelect") {
      const manualRequest = ["digitar outro", "outro", "manual"].includes(normalizeChatValue(value));
      const favorite = manualRequest ? null : this.findFavoriteByInput(state.favoriteAddresses, value);

      if (favorite) {
        state.draft.destination = favorite.address;
        this.clearPendingFavorite(state);
        messages.push(makeMessage("bot", `Perfeito. Vou usar ${favorite.label} como destino.`));
        state.availableTripTypes = await this.loadActiveTripTypes();
        nextStep = "tripTypeSelect";
        messages.push(...this.buildTripTypePrompt(state));
      } else if (manualRequest) {
        nextStep = "destination";
        messages.push(makeMessage("bot", "Certo. Agora me diga o destino."));
      } else {
        state.draft.destination = value;
        state.pendingFavoriteTarget = "destination";
        state.pendingFavoriteAddress = value;
        nextStep = "destinationFavoriteConfirm";
        messages.push(makeMessage("bot", "Deseja salvar esse endereco como favorito?"));
        messages.push(makeMessage("bot", "Responda sim para informar um nome, como Casa, ou nao para seguir."));
      }
    } else if (currentStep === "destination") {
      state.draft.destination = value;
      state.pendingFavoriteTarget = "destination";
      state.pendingFavoriteAddress = value;
      nextStep = "destinationFavoriteConfirm";
      messages.push(makeMessage("bot", "Deseja salvar esse endereco como favorito?"));
      messages.push(makeMessage("bot", "Responda sim para informar um nome, como Casa, ou nao para seguir."));
    } else if (currentStep === "destinationFavoriteConfirm") {
      const normalized = normalizeChatValue(value);

      if (["sim", "s", "salvar", "quero"].includes(normalized)) {
        nextStep = "destinationFavoriteLabel";
        messages.push(makeMessage("bot", "Qual nome voce quer dar para esse endereco? Ex.: Casa, Trabalho ou Mae."));
      } else if (["nao", "n", "nao quero"].includes(normalized)) {
        this.clearPendingFavorite(state);
        state.availableTripTypes = await this.loadActiveTripTypes();
        nextStep = "tripTypeSelect";
        messages.push(...this.buildTripTypePrompt(state));
      } else {
        messages.push(makeMessage("bot", "Responda sim para salvar esse endereco ou nao para seguir sem salvar."));
      }
    } else if (currentStep === "destinationFavoriteLabel") {
      if (!state.pendingFavoriteAddress || state.pendingFavoriteTarget !== "destination") {
        this.clearPendingFavorite(state);
        state.availableTripTypes = await this.loadActiveTripTypes();
        nextStep = "tripTypeSelect";
        messages.push(makeMessage("bot", "Nao encontrei um endereco pendente para salvar."));
        messages.push(...this.buildTripTypePrompt(state));
      } else {
        messages.push(makeMessage("system", "Salvando endereco favorito do cliente."));
        try {
          const favorite = await this.adminService.saveFavoriteAddress(state.draft.from, {
            customerName: state.draft.customerName,
            label: value,
            address: state.pendingFavoriteAddress
          });
          state.favoriteAddresses = this.upsertFavorite(state.favoriteAddresses, favorite);
          this.clearPendingFavorite(state);
          state.availableTripTypes = await this.loadActiveTripTypes();
          nextStep = "tripTypeSelect";
          messages.push(makeMessage("bot", `Endereco salvo como favorito "${favorite.label}".`));
          messages.push(...this.buildTripTypePrompt(state));
        } catch (error) {
          this.clearPendingFavorite(state);
          state.availableTripTypes = await this.loadActiveTripTypes();
          nextStep = "tripTypeSelect";
          messages.push(makeMessage("bot", error instanceof Error ? error.message : "Nao consegui salvar o endereco favorito agora."));
          messages.push(...this.buildTripTypePrompt(state));
        }
      }
    } else if (currentStep === "tripTypeSelect") {
      const availableTripTypes = state.availableTripTypes.length > 0 ? state.availableTripTypes : await this.loadActiveTripTypes();
      state.availableTripTypes = availableTripTypes;
      const selectedTripType = this.findTripTypeByInput(availableTripTypes, value);

      if (this.isTripTypeInfoRequest(value)) {
        messages.push(makeMessage("bot", this.formatTripTypeDetails(availableTripTypes)));
        messages.push(makeMessage("bot", "Agora me diga qual tipo voce quer usar nesta corrida."));
      } else if (selectedTripType) {
        state.draft.tripTypeSlug = selectedTripType.slug;
        state.draft.tripTypeName = selectedTripType.name;
        state.draft.baggageCount = null;
        state.draft.baggageSize = "";
        state.draft.petType = "";
        state.draft.petSize = "";
        messages.push(
          makeMessage(
            "bot",
            selectedTripType.surchargeAmount > 0
              ? `Perfeito. Vou usar o tipo ${selectedTripType.name}, com acrescimo de ${this.formatCurrency(selectedTripType.surchargeAmount)}.`
              : `Perfeito. Vou usar o tipo ${selectedTripType.name}.`
          )
        );
        if (this.isLuggageTripType(selectedTripType)) {
          nextStep = "baggageCount";
          messages.push(makeMessage("bot", "Quantas malas vao nessa viagem?"));
        } else if (this.isPetTripType(selectedTripType)) {
          nextStep = "petType";
          messages.push(makeMessage("bot", "Qual animal vai nessa viagem?"));
        } else {
          nextStep = "passengerCount";
          messages.push(makeMessage("bot", "Quantas pessoas vao nessa viagem?"));
        }
      } else {
        messages.push(makeMessage("bot", "Nao entendi o tipo de viagem. Escolha um dos tipos abaixo ou responda saber mais."));
      }
    } else if (currentStep === "baggageCount") {
      const baggageCount = this.parseBaggageCount(value);

      if (!baggageCount) {
        messages.push(makeMessage("bot", "Me diga quantas malas vao na viagem. Ex.: 1, 2 ou 3."));
      } else {
        state.draft.baggageCount = baggageCount;
        nextStep = "baggageSize";
        messages.push(makeMessage("bot", baggageCount === 1 ? "Perfeito. Vai 1 mala." : `Perfeito. Vao ${baggageCount} malas.`));
        messages.push(makeMessage("bot", "Essas malas sao pequenas, medias ou grandes?"));
      }
    } else if (currentStep === "baggageSize") {
      const baggageSize = this.parseBaggageSize(value);

      if (!baggageSize) {
        messages.push(makeMessage("bot", "Me diga se as malas sao pequenas, medias ou grandes."));
      } else {
        state.draft.baggageSize = baggageSize;
        nextStep = "passengerCount";
        messages.push(makeMessage("bot", `Perfeito. Anotei malas ${baggageSize}.`));
        messages.push(makeMessage("bot", "Quantas pessoas vao nessa viagem?"));
      }
    } else if (currentStep === "petType") {
      const petType = this.parsePetType(value);

      if (!petType) {
        messages.push(makeMessage("bot", "Me diga qual animal vai na viagem. Ex.: cachorro, gato ou outro."));
      } else {
        state.draft.petType = petType;
        nextStep = "petSize";
        messages.push(makeMessage("bot", `Perfeito. Vai um ${petType}.`));
        messages.push(makeMessage("bot", "Ele e de porte pequeno ou grande?"));
      }
    } else if (currentStep === "petSize") {
      const petSize = this.parsePetSize(value);

      if (!petSize) {
        messages.push(makeMessage("bot", "Me diga se o pet e de porte pequeno ou grande."));
      } else {
        state.draft.petSize = petSize;
        nextStep = "passengerCount";
        messages.push(makeMessage("bot", `Perfeito. Anotei pet de porte ${petSize}.`));
        messages.push(makeMessage("bot", "Quantas pessoas vao nessa viagem?"));
      }
    } else if (currentStep === "passengerCount") {
      const passengerCount = this.parsePassengerCount(value);

      if (!passengerCount) {
        messages.push(makeMessage("bot", "Me diga quantas pessoas vao na viagem. Ex.: 1, 2, 3 ou 4."));
      } else {
        state.draft.passengerCount = passengerCount;
        if (passengerCount > 1) {
          nextStep = "companionSpecialAttention";
        } else {
          nextStep = "intermediateStopsConfirm";
        }
        messages.push(
          makeMessage(
            "bot",
            passengerCount === 1
              ? "Perfeito. Vai 1 pessoa."
              : `Perfeito. Vao ${passengerCount} pessoas.`
          )
        );
        if (passengerCount > 1) {
          messages.push(makeMessage("bot", "Algum acompanhante precisa de atencao especial nesta viagem? Se sim, me diga rapidamente qual."));
          messages.push(makeMessage("bot", "Se nao precisar, responda nao."));
        } else {
          messages.push(makeMessage("bot", "Vai haver alguma parada entre a origem e o destino? Responda sim ou nao."));
        }
      }
    } else if (currentStep === "companionSpecialAttention") {
      const normalized = normalizeChatValue(value);

      if (["nao", "n", "nenhum", "ninguem"].includes(normalized)) {
        state.draft.companionNeedsSpecialAttention = false;
        state.draft.companionSpecialAttentionDetails = "";
        nextStep = "intermediateStopsConfirm";
        messages.push(makeMessage("bot", "Perfeito."));
        messages.push(makeMessage("bot", "Vai haver alguma parada entre a origem e o destino? Responda sim ou nao."));
      } else {
        state.draft.companionNeedsSpecialAttention = true;
        state.draft.companionSpecialAttentionDetails = value;
        nextStep = "intermediateStopsConfirm";
        messages.push(makeMessage("bot", "Perfeito. Anotei a atencao especial do acompanhante."));
        messages.push(makeMessage("bot", "Vai haver alguma parada entre a origem e o destino? Responda sim ou nao."));
      }
    } else if (currentStep === "intermediateStopsConfirm") {
      const normalized = normalizeChatValue(value);

      if (["sim", "s", "vai ter", "com parada"].includes(normalized)) {
        state.draft.hasIntermediateStops = true;
        nextStep = "intermediateStopsDetails";
        messages.push(makeMessage("bot", "Certo. Me diga rapidamente quais paradas precisam ser feitas no caminho."));
      } else if (["nao", "n", "sem parada", "direto"].includes(normalized)) {
        state.draft.hasIntermediateStops = false;
        state.draft.intermediateStopsSummary = "";
        nextStep = "scheduledAt";
        messages.push(makeMessage("bot", "Perfeito. Viagem direta, sem paradas."));
        messages.push(makeMessage("bot", "Para quando voce quer a corrida? Escolha abaixo ou digite manualmente se preferir."));
      } else {
        messages.push(makeMessage("bot", "Responda sim se houver paradas ou nao se a viagem for direto ao destino."));
      }
    } else if (currentStep === "intermediateStopsDetails") {
      state.draft.intermediateStopsSummary = value;
      nextStep = "scheduledAt";
      messages.push(makeMessage("bot", "Perfeito. Anotei as paradas no trajeto."));
      messages.push(makeMessage("bot", "Para quando voce quer a corrida? Escolha abaixo ou digite manualmente se preferir."));
    } else if (currentStep === "scheduledAt") {
      const scheduledAt = this.parseSchedule(value);
      if (!scheduledAt) {
        messages.push(makeMessage("bot", "Horario invalido. Use DD/MM/AAAA HH:mm ou escolha uma data abaixo."));
      } else {
        state.draft.scheduledAt = value;
        messages.push(makeMessage("system", "Bot validando os dados e calculando a cotacao."));

        try {
          const ride = await this.ridesService.createQuote(this.buildCreateQuoteDto(state.draft, scheduledAt));
          latestRideId = ride.id;
          nextStep = "quoteReady";
          messages.push(makeMessage("system", "Bot gerou a cotacao da corrida."));
          messages.push(makeMessage("bot", this.formatQuoteMessage(ride)));
        } catch (error) {
          messages.push(makeMessage("bot", error instanceof Error ? error.message : "Falha ao gerar a cotacao."));
        }
      }
    }

    const updated = await this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        currentStep: nextStep,
        latestRideId: latestRideId || null,
        customerPhone: state.draft.from || null,
        state: this.serializeState(state),
        messages: this.serializeMessages(messages)
      }
    });

    return this.toSessionView(updated);
  }

  private async requireSession(sessionId: string): Promise<PrismaConversationSession> {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException(`Conversation session ${sessionId} not found.`);
    }

    return session;
  }

  private createInitialState(): ConversationState {
    return {
      draft: { ...initialDraft },
      matchedCustomer: null,
      favoriteAddresses: [],
      availableTripTypes: [],
      pendingFavoriteTarget: null,
      pendingFavoriteAddress: ""
    };
  }

  private parseState(value: Prisma.JsonValue): ConversationState {
    const candidate = (value ?? {}) as Partial<ConversationState>;

    return {
      draft: {
        ...initialDraft,
        ...(candidate.draft ?? {})
      },
      matchedCustomer: candidate.matchedCustomer ?? null,
      favoriteAddresses: candidate.favoriteAddresses ?? [],
      availableTripTypes: candidate.availableTripTypes ?? [],
      pendingFavoriteTarget: candidate.pendingFavoriteTarget ?? null,
      pendingFavoriteAddress: candidate.pendingFavoriteAddress ?? ""
    };
  }

  private parseMessages(value: Prisma.JsonValue): ConversationMessage[] {
    return Array.isArray(value) ? (value as unknown as ConversationMessage[]) : [];
  }

  private serializeState(state: ConversationState): Prisma.InputJsonValue {
    return state as unknown as Prisma.InputJsonValue;
  }

  private serializeMessages(messages: ConversationMessage[]): Prisma.InputJsonValue {
    return messages as unknown as Prisma.InputJsonValue;
  }

  private getCurrentStep(step: string): ConversationStep {
    return isConversationStep(step) ? step : "intro";
  }

  private async toSessionView(session: PrismaConversationSession): Promise<ConversationSessionView> {
    const state = this.parseState(session.state);
    const currentStep = this.getCurrentStep(session.currentStep);

    return {
      id: session.id,
      currentStep,
      latestRideId: session.latestRideId ?? "",
      customerPhone: session.customerPhone ?? undefined,
      messages: this.parseMessages(session.messages),
      matchedCustomer: state.matchedCustomer,
      favoriteAddresses: state.favoriteAddresses,
      availableTripTypes: state.availableTripTypes,
      composerPlaceholder: this.getComposerPlaceholder(currentStep)
    };
  }

  private async buildAuthenticatedStart(phone: string): Promise<{
    state: ConversationState;
    currentStep: ConversationStep;
    messages: ConversationMessage[];
  }> {
    const state = this.createInitialState();
    state.draft.from = phone;

    const messages: ConversationMessage[] = [
      makeMessage("bot", "Ola!"),
      makeMessage("system", `Cliente autenticado com o telefone ${phone}.`)
    ];

    try {
      const customer = await this.lookupCustomerByPhone(phone);

      if (customer) {
        state.matchedCustomer = customer;
        state.favoriteAddresses = customer.favorites ?? [];
        messages.push(makeMessage("bot", `Oi, ${this.inferPreferredName(customer.name)}.`));
        messages.push(makeMessage("bot", "Encontrei seu cadastro por aqui."));
        messages.push(makeMessage("bot", `Posso seguir com o nome ${customer.name}? Responda sim ou nao.`));

        return {
          state,
          currentStep: "existingCustomerConfirm",
          messages
        };
      }
    } catch (error) {
      messages.push(makeMessage("bot", error instanceof Error ? error.message : "Nao consegui consultar seu historico agora."));
    }

    messages.push(...createNewCustomerWelcomeMessages());
    messages.push(makeMessage("bot", "Para comecar, me diga seu nome completo."));

    return {
      state,
      currentStep: "customerName",
      messages
    };
  }

  private getComposerPlaceholder(step: ConversationStep): string {
    if (step === "existingCustomerConfirm" || step === "originFavoriteConfirm" || step === "destinationFavoriteConfirm") {
      return "Digite sim ou nao";
    }

    if (step === "customerName") {
      return "Digite nome e sobrenome";
    }

    if (step === "customerPreferredName") {
      return "Ex.: Fran, Joao, Mari";
    }

    if (step === "customerAccessibilityProfile") {
      return "Digite sim ou nao";
    }

    if (step === "originFavoriteSelect" || step === "destinationFavoriteSelect") {
      return "Escolha um favorito ou digite outro endereco";
    }

    if (step === "tripTypeSelect") {
      return "Ex.: Comum, Pet ou Saber mais";
    }

    if (step === "baggageCount") {
      return "Ex.: 1, 2 ou 3 malas";
    }

    if (step === "baggageSize") {
      return "Pequenas, medias ou grandes";
    }

    if (step === "petType") {
      return "Ex.: cachorro, gato, coelho";
    }

    if (step === "petSize") {
      return "Pequeno ou grande";
    }

    if (step === "passengerCount") {
      return "Ex.: 1, 2, 3 ou 4";
    }

    if (step === "companionSpecialAttention") {
      return "Digite nao ou descreva a atencao especial";
    }

    if (step === "intermediateStopsConfirm") {
      return "Digite sim ou nao";
    }

    if (step === "intermediateStopsDetails") {
      return "Ex.: parada na farmacia e depois no mercado";
    }

    if (step === "originFavoriteLabel" || step === "destinationFavoriteLabel") {
      return "Ex.: Casa, Trabalho";
    }

    if (step === "scheduledAt") {
      return "Ou, se preferir, digite a data manualmente";
    }

    if (step === "quoteReady") {
      return "Digite confirmar para fechar a corrida";
    }

    return "Digite a resposta do cliente";
  }

  private async lookupCustomerByPhone(phone: string): Promise<CustomerSummary | null> {
    const normalizedPhone = phone.trim();
    const customers = await this.adminService.listCustomers(normalizedPhone);
    return customers.find((customer) => customer.phone === normalizedPhone) ?? null;
  }

  private isGreetingOrRideIntent(value: string): boolean {
    const normalized = normalizeChatValue(value);

    return [
      "oi",
      "ola",
      "opa",
      "bom dia",
      "boa tarde",
      "boa noite",
      "quero corrida",
      "quero uma corrida",
      "preciso de corrida",
      "preciso de uma corrida",
      "quero agendar",
      "quero agendar uma corrida"
    ].includes(normalized);
  }

  private parseFullName(value: string): string | null {
    const normalizedValue = value.trim().replace(/\s+/g, " ");
    const parts = normalizedValue.split(" ").filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    const validParts = parts.filter((part) => {
      const normalizedPart = normalizeChatValue(part).replace(/[^a-z'-]/g, "");
      return normalizedPart.length >= 2;
    });

    if (validParts.length < 2) {
      return null;
    }

    return normalizedValue;
  }

  private parsePreferredName(value: string): string | null {
    const normalizedValue = value.trim().replace(/\s+/g, " ");
    if (!normalizedValue) {
      return null;
    }

    const words = normalizedValue.split(" ").slice(0, 3);
    const candidate = words.join(" ");
    const normalizedCandidate = normalizeChatValue(candidate).replace(/[^a-z\s'-]/g, "").trim();

    return normalizedCandidate.length >= 2 ? candidate : null;
  }

  private inferPreferredName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] ?? "";
  }

  private async loadActiveTripTypes(): Promise<TripTypeSummary[]> {
    const tripTypes = await this.adminService.listTripTypes();
    return tripTypes.filter((tripType) => tripType.isActive).sort((left, right) => {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }

      return left.sortOrder - right.sortOrder;
    });
  }

  private findTripTypeByInput(
    tripTypes: TripTypeSummary[],
    value: string
  ): TripTypeSummary | undefined {
    const normalized = normalizeChatValue(value);

    return tripTypes.find((tripType) => {
      const normalizedName = normalizeChatValue(tripType.name);
      return normalized === normalizedName || normalized.includes(normalizedName) || normalizedName.includes(normalized);
    });
  }

  private isTripTypeInfoRequest(value: string): boolean {
    const normalized = normalizeChatValue(value);
    return normalized === "saber mais" || normalized.startsWith("saber mais ") || normalized.includes("mais sobre");
  }

  private formatTripTypeDetails(tripTypes: TripTypeSummary[]): string {
    return tripTypes
      .map((tripType) => {
        const surchargeText =
          tripType.surchargeAmount > 0
            ? `Acrescimo: ${this.formatCurrency(tripType.surchargeAmount)}.`
            : "Sem acrescimo no valor.";

        return `${tripType.name}: ${tripType.description ?? "Sem descricao informada."} ${surchargeText}`;
      })
      .join("\n\n");
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  }

  private isLuggageTripType(tripType: Pick<TripTypeSummary, "slug" | "name">): boolean {
    const combined = `${tripType.slug} ${tripType.name}`;
    return normalizeChatValue(combined).includes("mala");
  }

  private isPetTripType(tripType: Pick<TripTypeSummary, "slug" | "name">): boolean {
    const combined = `${tripType.slug} ${tripType.name}`;
    return normalizeChatValue(combined).includes("pet");
  }

  private async captureCustomerLead(phone: string, fullName: string): Promise<void> {
    if (!phone.trim() || !fullName.trim()) {
      return;
    }

    try {
      await this.adminService.upsertCustomerLead(phone, fullName);
    } catch {
      // Lead capture is best-effort and must not block the conversation.
    }
  }

  private async captureCustomerAccessibility(phone: string, hasReducedMobility: boolean): Promise<void> {
    if (!phone.trim()) {
      return;
    }

    try {
      await this.adminService.updateCustomerAccessibility(phone, hasReducedMobility);
    } catch {
      // Accessibility capture is best-effort and must not block the conversation.
    }
  }

  private findFavoriteByInput(
    favorites: CustomerFavoriteAddressSummary[],
    value: string
  ): CustomerFavoriteAddressSummary | undefined {
    const normalized = normalizeChatValue(value);
    return favorites.find((favorite) => {
      return normalizeChatValue(favorite.label) === normalized || normalizeChatValue(favorite.address) === normalized;
    });
  }

  private clearPendingFavorite(state: ConversationState) {
    state.pendingFavoriteTarget = null;
    state.pendingFavoriteAddress = "";
  }

  private upsertFavorite(
    favorites: CustomerFavoriteAddressSummary[],
    favorite: CustomerFavoriteAddressSummary
  ): CustomerFavoriteAddressSummary[] {
    return [favorite, ...favorites.filter((item) => item.id !== favorite.id && normalizeChatValue(item.label) !== normalizeChatValue(favorite.label))]
      .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  }

  private buildOriginPrompt(state: ConversationState): ConversationMessage[] {
    const preferredName = state.draft.preferredName || this.inferPreferredName(state.draft.customerName);

    if (state.favoriteAddresses.length > 0) {
      return [
        makeMessage("bot", preferredName ? `Perfeito, ${preferredName}. Vou usar esse cadastro.` : "Perfeito. Vou usar esse cadastro."),
        makeMessage("bot", "Encontrei enderecos favoritos desse cliente. Escolha um abaixo ou digite outro endereco de origem.")
      ];
    }

    return [makeMessage("bot", preferredName ? `Perfeito, ${preferredName}. Qual e o local de origem da corrida?` : "Perfeito. Qual e o local de origem da corrida?")];
  }

  private buildDestinationPrompt(
    state: ConversationState,
    label?: string,
    context?: string,
    prefixMessage?: string
  ): ConversationMessage[] {
    const messages: ConversationMessage[] = [];

    if (prefixMessage) {
      messages.push(makeMessage("bot", prefixMessage));
    }

    if (label && context === "origem") {
      messages.push(makeMessage("bot", `Perfeito. Vou usar ${label} como origem.`));
    } else if (label && context === "endereco salvo") {
      messages.push(makeMessage("bot", `Endereco salvo como favorito "${label}".`));
    }

    if (state.favoriteAddresses.length > 0) {
      messages.push(makeMessage("bot", "Agora escolha um endereco favorito para o destino ou digite outro destino."));
      return messages;
    }

    messages.push(makeMessage("bot", "Agora me diga o destino."));
    return messages;
  }

  private buildTripTypePrompt(state: ConversationState): ConversationMessage[] {
    const tripTypes = state.availableTripTypes;
    if (tripTypes.length === 0) {
      return [makeMessage("bot", "Para quando voce quer a corrida? Escolha abaixo ou digite manualmente se preferir.")];
    }

    const options = tripTypes
      .map((tripType) =>
        tripType.surchargeAmount > 0
          ? `${tripType.name} (${this.formatCurrency(tripType.surchargeAmount)} a mais)`
          : `${tripType.name} (sem acrescimo)`
      )
      .join(", ");

    return [
      makeMessage("bot", "Qual tipo de viagem voce quer para essa corrida?"),
      makeMessage("bot", `Opcoes disponiveis: ${options}.`),
      makeMessage("bot", "Se quiser saber melhor o que muda em cada uma, responda saber mais.")
    ];
  }

  private buildCreateQuoteDto(draft: ConversationDraft, scheduledAt: Date): CreateQuoteDto {
    return {
      customerName: draft.customerName,
      customerPhone: draft.from,
      tripTypeSlug: draft.tripTypeSlug || undefined,
      baggageCount: draft.baggageCount ?? undefined,
      baggageSize: draft.baggageSize || undefined,
      petType: draft.petType || undefined,
      petSize: draft.petSize || undefined,
      customerHasReducedMobility: draft.customerHasReducedMobility ?? undefined,
      passengerCount: draft.passengerCount,
      companionNeedsSpecialAttention: draft.companionNeedsSpecialAttention ?? undefined,
      companionSpecialAttentionDetails: draft.companionSpecialAttentionDetails || undefined,
      hasIntermediateStops: draft.hasIntermediateStops ?? undefined,
      intermediateStopsSummary: draft.intermediateStopsSummary || undefined,
      origin: draft.origin,
      destination: draft.destination,
      scheduledAt: scheduledAt.toISOString()
    };
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

  private parsePassengerCount(value: string): number | null {
    const match = value.match(/\d+/);
    if (!match) {
      return null;
    }

    const passengerCount = Number(match[0]);
    return Number.isInteger(passengerCount) && passengerCount >= 1 && passengerCount <= 8
      ? passengerCount
      : null;
  }

  private parseBaggageCount(value: string): number | null {
    const match = value.match(/\d+/);
    if (!match) {
      return null;
    }

    const baggageCount = Number(match[0]);
    return Number.isInteger(baggageCount) && baggageCount >= 1 && baggageCount <= 10 ? baggageCount : null;
  }

  private parseBaggageSize(value: string): string | null {
    const normalized = normalizeChatValue(value);
    if (normalized.includes("pequen")) {
      return "pequenas";
    }
    if (normalized.includes("medi")) {
      return "medias";
    }
    if (normalized.includes("grand")) {
      return "grandes";
    }
    return null;
  }

  private parsePetType(value: string): string | null {
    const normalizedValue = value.trim().replace(/\s+/g, " ");
    if (!normalizedValue) {
      return null;
    }

    const normalized = normalizeChatValue(normalizedValue);
    if (normalized.length < 3) {
      return null;
    }

    return normalizedValue;
  }

  private parsePetSize(value: string): string | null {
    const normalized = normalizeChatValue(value);
    if (normalized.includes("pequen")) {
      return "pequeno";
    }
    if (normalized.includes("grand")) {
      return "grande";
    }
    return null;
  }

  private formatQuoteMessage(ride: {
    id: string;
    tripTypeName?: string;
    tripTypeSurchargeAmount?: number;
    baggageCount?: number;
    baggageSize?: string;
    petType?: string;
    petSize?: string;
    customerHasReducedMobility?: boolean;
    passengerCount?: number;
    companionNeedsSpecialAttention?: boolean;
    companionSpecialAttentionDetails?: string;
    hasIntermediateStops?: boolean;
    intermediateStopsSummary?: string;
    origin: string;
    destination: string;
    scheduledAt: string;
    quote?: { amount: number; currency: string; routeDistanceKm: number; routeDurationMinutes: number };
  }): string {
    const amount = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: ride.quote?.currency ?? "BRL"
    }).format(ride.quote?.amount ?? 0);
    const distance = (ride.quote?.routeDistanceKm ?? 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const eta = ride.quote?.routeDurationMinutes ?? 0;
    const dateTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(ride.scheduledAt));

    return [
      "Confere os dados da sua corrida:",
      "",
      `Tipo de viagem: ${ride.tripTypeName ?? "Comum"}${
        ride.tripTypeSurchargeAmount && ride.tripTypeSurchargeAmount > 0
          ? ` (${this.formatCurrency(ride.tripTypeSurchargeAmount)} de acrescimo)`
          : ""
      }`,
      ...(ride.baggageCount
        ? [`Malas: ${ride.baggageCount}${ride.baggageSize ? ` (${ride.baggageSize})` : ""}`]
        : []),
      ...(ride.petType
        ? [`Pet: ${ride.petType}${ride.petSize ? ` (${ride.petSize})` : ""}`]
        : []),
      ...(ride.customerHasReducedMobility ? ["Cadastro: cliente com mobilidade reduzida"] : []),
      `Passageiros: ${ride.passengerCount ?? 1}`,
      ...(ride.companionNeedsSpecialAttention
        ? [`Acompanhante: ${ride.companionSpecialAttentionDetails || "precisa de atencao especial"}`]
        : []),
      `Paradas no trajeto: ${
        ride.hasIntermediateStops
          ? ride.intermediateStopsSummary || "Sim, com detalhes informados no atendimento."
          : "Nao"
      }`,
      `Data e horario: ${dateTime}`,
      `Origem: ${ride.origin}`,
      `Destino: ${ride.destination}`,
      `Valor: ${amount}`,
      `Trajeto: ${distance} km | ${eta} min`,
      "",
      "Se estiver tudo certo, responda confirmar."
    ].join("\n");
  }

  private formatPrebookedMessage(rideId: string): string {
    return [
      `Pre-agendamento confirmado para a corrida ${rideId}.`,
      "Agora vamos enviar para os motoristas aceitarem ou recusarem.",
      "Voce sera avisado assim que houver uma resposta."
    ].join("\n");
  }
}
