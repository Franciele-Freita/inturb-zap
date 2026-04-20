"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "../components/brand-logo";
import { ConversationSession, request } from "../lib/api";

const PASSENGER_PHONE_STORAGE_KEY = "passenger-app-phone";
const PASSENGER_SESSION_STORAGE_KEY = "passenger-app-session-id";

type NotificationPermissionState = NotificationPermission | "unsupported";

function formatDateTimeForBackend(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function buildQuickSchedule(hoursToAdd: number): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + hoursToAdd);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function normalizePhoneInput(value: string): string {
  return value.replace(/\D+/g, "");
}

function formatPhoneDisplay(value: string): string {
  if (value.length <= 2) {
    return value;
  }

  if (value.length <= 4) {
    return `+${value.slice(0, 2)} ${value.slice(2)}`;
  }

  if (value.length <= 9) {
    return `+${value.slice(0, 2)} ${value.slice(2, 4)} ${value.slice(4)}`;
  }

  return `+${value.slice(0, 2)} ${value.slice(2, 4)} ${value.slice(4, 9)}-${value.slice(9, 13)}`;
}

function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}

export default function PassengerPage() {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const [schedulePickerValue, setSchedulePickerValue] = useState(buildQuickSchedule(1));
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>("unsupported");
  const [notificationMessage, setNotificationMessage] = useState(
    "Ative as notificacoes neste aparelho para receber atualizacoes da sua corrida."
  );
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.classList.add("passenger-chat-route");

    return () => {
      document.body.classList.remove("passenger-chat-route");
    };
  }, []);

  useEffect(() => {
    setNotificationPermission(readNotificationPermission());
  }, []);

  useEffect(() => {
    const storedPhone = typeof window !== "undefined" ? window.localStorage.getItem(PASSENGER_PHONE_STORAGE_KEY) : null;
    const storedSessionId =
      typeof window !== "undefined" ? window.localStorage.getItem(PASSENGER_SESSION_STORAGE_KEY) : null;

    if (!storedPhone) {
      return;
    }

    const normalizedPhone = normalizePhoneInput(storedPhone);
    setPassengerPhone(normalizedPhone);
    setPhoneInput(normalizedPhone);
    void bootstrapAuthenticatedSession(normalizedPhone, storedSessionId ?? undefined);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      chatViewportRef.current?.scrollTo({
        top: chatViewportRef.current.scrollHeight,
        behavior: "smooth"
      });
    });
  }, [session?.messages]);

  useEffect(() => {
    if (notificationPermission === "granted") {
      setNotificationMessage("Notificacoes ativas neste aparelho para esse telefone.");
      return;
    }

    if (notificationPermission === "denied") {
      setNotificationMessage("O navegador bloqueou as notificacoes deste aparelho.");
      return;
    }

    if (notificationPermission === "default") {
      setNotificationMessage("Ative as notificacoes neste aparelho para acompanhar sua corrida.");
      return;
    }

    setNotificationMessage("Este navegador nao suporta notificacoes push.");
  }, [notificationPermission]);

  const currentStep = session?.currentStep ?? "intro";
  const matchedCustomer = session?.matchedCustomer ?? null;
  const favoriteAddresses = session?.favoriteAddresses ?? [];
  const availableTripTypes = session?.availableTripTypes ?? [];
  const latestRideId = session?.latestRideId ?? "";
  const visibleMessages = useMemo(
    () => (session?.messages ?? []).filter((message) => message.role !== "system"),
    [session?.messages]
  );

  const botHint = useMemo(() => {
    if (currentStep === "quoteReady") {
      return "Cotacao pronta. O cliente pode confirmar direto no chat.";
    }

    if (currentStep === "confirmed") {
      return "Pedido fechado. Agora a corrida segue para a fila de motoristas.";
    }

    if (!passengerPhone) {
      return "Entre com seu telefone para simular a experiencia proxima do WhatsApp.";
    }

    return "Chat autenticado pelo telefone do passageiro neste aparelho.";
  }, [currentStep, passengerPhone]);

  async function bootstrapAuthenticatedSession(phone: string, sessionId?: string) {
    setIsBusy(true);
    setLoadError("");

    try {
      let nextSession: ConversationSession | null = null;

      if (sessionId) {
        nextSession = await request<ConversationSession>(`/conversation/sessions/${sessionId}`).catch(() => null);
      }

      if (!nextSession || nextSession.customerPhone !== phone) {
        nextSession = await request<ConversationSession>("/conversation/sessions", {
          method: "POST",
          body: JSON.stringify({ phone })
        });
      }

      setSession(nextSession);
      setComposerValue("");
      setSchedulePickerValue(buildQuickSchedule(1));

      if (typeof window !== "undefined") {
        window.localStorage.setItem(PASSENGER_PHONE_STORAGE_KEY, phone);
        window.localStorage.setItem(PASSENGER_SESSION_STORAGE_KEY, nextSession.id);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Falha ao iniciar a simulacao.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizePhoneInput(phoneInput);

    if (!normalizedPhone) {
      return;
    }

    setPassengerPhone(normalizedPhone);
    await bootstrapAuthenticatedSession(normalizedPhone);
  }

  async function handleEnableNotifications() {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function sendMessage(text: string) {
    if (!session) {
      return;
    }

    setIsBusy(true);
    setLoadError("");

    try {
      const nextSession = await request<ConversationSession>(`/conversation/sessions/${session.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setSession(nextSession);
      setComposerValue("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Falha ao enviar mensagem.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = composerValue.trim();

    if (!value) {
      return;
    }

    await sendMessage(value);
  }

  async function handleScheduleSelection(selectedValue: string) {
    const normalizedValue = formatDateTimeForBackend(selectedValue);
    setSchedulePickerValue(selectedValue);
    await sendMessage(normalizedValue);
  }

  async function confirmLatestRide() {
    if (!latestRideId) {
      return;
    }

    await sendMessage("confirmar");
  }

  async function resetConversation() {
    if (!passengerPhone) {
      return;
    }

    await bootstrapAuthenticatedSession(passengerPhone);
  }

  function handleLogout() {
    setPassengerPhone("");
    setPhoneInput("");
    setSession(null);
    setComposerValue("");
    setLoadError("");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PASSENGER_PHONE_STORAGE_KEY);
      window.localStorage.removeItem(PASSENGER_SESSION_STORAGE_KEY);
    }
  }

  return (
    <main className="page-shell chat-page-shell">
      <section className="chat-app-frame">
        {!passengerPhone ? (
          <div className="passenger-auth-shell">
            <div className="passenger-auth-card">
              <span className="brand-logo-wrap passenger-auth-logo" aria-hidden="true">
                <BrandLogo />
              </span>

              <div className="passenger-auth-copy">
                <p className="eyebrow">Passageiro</p>
                <h1>Entre com seu telefone</h1>
                <p>Vamos simular a conversa como se esse numero estivesse falando pelo WhatsApp.</p>
              </div>

              <form className="passenger-auth-form" onSubmit={(event) => void handleLogin(event)}>
                <label>
                  Telefone
                  <input
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(normalizePhoneInput(event.target.value))}
                    placeholder="5511999999999"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>

                <button type="submit" disabled={isBusy || normalizePhoneInput(phoneInput).length < 10}>
                  {isBusy ? "Entrando..." : "Entrar no chat"}
                </button>
              </form>

              {loadError ? <p className="passenger-auth-error">{loadError}</p> : null}
            </div>
          </div>
        ) : (
          <>
            <header className="chat-app-header">
              <div className="chat-app-title">
                <p className="eyebrow">Cliente</p>
                <strong>Atendimento Inturb</strong>
                <span>{botHint}</span>
              </div>

              <div className="chat-app-header-actions">
                <div className="chips">
                  <span className="chip">Telefone: {formatPhoneDisplay(passengerPhone)}</span>
                  <span className="chip">Etapa: {currentStep}</span>
                  {latestRideId ? <span className="chip">Ride {latestRideId}</span> : null}
                  {matchedCustomer ? <span className="chip">Cliente: {matchedCustomer.name}</span> : null}
                </div>

                <div className="passenger-header-actions">
                  <button type="button" className="secondary" onClick={() => void resetConversation()} disabled={isBusy}>
                    Reiniciar conversa
                  </button>
                  <button type="button" className="secondary" onClick={handleLogout}>
                    Trocar telefone
                  </button>
                </div>
              </div>
            </header>

            <div className="chat-shell chat-shell-fullscreen">
              <div className="passenger-device-strip">
                <div className="passenger-device-copy">
                  <strong>Notificacoes deste aparelho</strong>
                  <span>{notificationMessage}</span>
                </div>

                {notificationPermission === "default" ? (
                  <button type="button" className="secondary" onClick={() => void handleEnableNotifications()}>
                    Ativar
                  </button>
                ) : null}
              </div>

              <div className="chat-viewport chat-viewport-fullscreen" ref={chatViewportRef}>
                {visibleMessages.map((message) => (
                  <div key={message.id} className={`chat-row chat-row-${message.role}`}>
                    {message.role === "bot" ? (
                      <span className="chat-brand-badge" aria-hidden="true">
                        <BrandLogo />
                      </span>
                    ) : null}
                    <div className={`chat-bubble chat-bubble-${message.role}`}>
                      <div className="chat-bubble-head">
                        <span className="chat-role">
                          {message.role === "bot" ? "Inturb" : "Voce"}
                        </span>
                      </div>
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}

                {loadError ? (
                  <div className="chat-row chat-row-system">
                    <div className="chat-bubble chat-bubble-system">
                      <div className="chat-bubble-head">
                        <span className="chat-role">Sistema</span>
                      </div>
                      <p>{loadError}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="chat-bottom-stack">
                {currentStep === "scheduledAt" ? (
                  <div className="schedule-picker-card">
                    <div className="schedule-picker-head">
                      <strong>Escolha a data e hora</strong>
                      <span>Mais simples do que digitar manualmente.</span>
                    </div>

                    <div className="schedule-picker-grid">
                      <label>
                        Data e hora
                        <input
                          type="datetime-local"
                          value={schedulePickerValue}
                          min={buildQuickSchedule(0)}
                          onChange={(event) => setSchedulePickerValue(event.target.value)}
                          disabled={isBusy}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isBusy || !schedulePickerValue}
                        onClick={() => void handleScheduleSelection(schedulePickerValue)}
                      >
                        Usar data e hora
                      </button>
                    </div>

                    <div className="chat-actions">
                      <button type="button" className="secondary" disabled={isBusy} onClick={() => void handleScheduleSelection(buildQuickSchedule(1))}>
                        Em 1 hora
                      </button>
                      <button type="button" className="secondary" disabled={isBusy} onClick={() => void handleScheduleSelection(buildQuickSchedule(3))}>
                        Em 3 horas
                      </button>
                      <button type="button" className="secondary" disabled={isBusy} onClick={() => void handleScheduleSelection(buildQuickSchedule(24))}>
                        Amanha
                      </button>
                    </div>
                  </div>
                ) : null}

                {currentStep === "existingCustomerConfirm" && matchedCustomer ? (
                  <div className="chat-actions chat-actions-inline">
                    <button type="button" disabled={isBusy} onClick={() => void sendMessage("sim")}>
                      Sim, sou eu
                    </button>
                    <button type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage("nao")}>
                      Nao, informar outro nome
                    </button>
                  </div>
                ) : null}

                {currentStep === "customerAccessibilityProfile" ? (
                  <div className="chat-actions chat-actions-inline">
                    <button type="button" disabled={isBusy} onClick={() => void sendMessage("nao")}>
                      Nao
                    </button>
                    <button type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage("sim")}>
                      Sim
                    </button>
                  </div>
                ) : null}

                {(currentStep === "originFavoriteSelect" || currentStep === "destinationFavoriteSelect") &&
                favoriteAddresses.length > 0 ? (
                  <div className="chat-actions chat-actions-inline">
                    {favoriteAddresses.map((favorite) => (
                      <button key={favorite.id} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(favorite.label)}>
                        {favorite.label}
                      </button>
                    ))}
                    <button type="button" disabled={isBusy} onClick={() => void sendMessage("Digitar outro")}>
                      Digitar outro
                    </button>
                  </div>
                ) : null}

                {currentStep === "tripTypeSelect" && availableTripTypes.length > 0 ? (
                  <div className="chat-actions chat-actions-inline">
                    {availableTripTypes.map((tripType) => (
                      <button key={tripType.id} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(tripType.name)}>
                        {tripType.name}
                      </button>
                    ))}
                    <button type="button" disabled={isBusy} onClick={() => void sendMessage("Saber mais")}>
                      Saber mais
                    </button>
                  </div>
                ) : null}

                {currentStep === "baggageCount" ? (
                  <div className="chat-actions chat-actions-inline">
                    {[1, 2, 3, 4].map((count) => (
                      <button key={count} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(String(count))}>
                        {count} mala{count > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentStep === "baggageSize" ? (
                  <div className="chat-actions chat-actions-inline">
                    {["Pequenas", "Medias", "Grandes"].map((size) => (
                      <button key={size} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(size)}>
                        {size}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentStep === "petType" ? (
                  <div className="chat-actions chat-actions-inline">
                    {["Cachorro", "Gato", "Outro"].map((pet) => (
                      <button key={pet} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(pet)}>
                        {pet}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentStep === "petSize" ? (
                  <div className="chat-actions chat-actions-inline">
                    {["Pequeno", "Grande"].map((size) => (
                      <button key={size} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(size)}>
                        {size}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentStep === "passengerCount" ? (
                  <div className="chat-actions chat-actions-inline">
                    {[1, 2, 3, 4].map((count) => (
                      <button key={count} type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage(String(count))}>
                        {count} {count === 1 ? "pessoa" : "pessoas"}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentStep === "companionSpecialAttention" ? (
                  <div className="chat-actions chat-actions-inline">
                    <button type="button" disabled={isBusy} onClick={() => void sendMessage("nao")}>
                      Nao
                    </button>
                    <button type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage("Precisa de apoio no embarque")}>
                      Precisa de apoio
                    </button>
                  </div>
                ) : null}

                {currentStep === "intermediateStopsConfirm" ? (
                  <div className="chat-actions chat-actions-inline">
                    <button type="button" disabled={isBusy} onClick={() => void sendMessage("nao")}>
                      Nao
                    </button>
                    <button type="button" className="secondary" disabled={isBusy} onClick={() => void sendMessage("sim")}>
                      Sim
                    </button>
                  </div>
                ) : null}

                <form className="chat-composer chat-composer-sticky" onSubmit={(event) => void handleChatSubmit(event)}>
                  <input
                    value={composerValue}
                    onChange={(event) => setComposerValue(event.target.value)}
                    placeholder={session?.composerPlaceholder ?? "Digite sua resposta"}
                    disabled={isBusy || !session}
                  />
                  <button
                    type="submit"
                    className="chat-composer-submit"
                    aria-label="Enviar mensagem"
                    title="Enviar mensagem"
                    disabled={isBusy || !composerValue.trim() || !session}
                  >
                    <span className="chat-composer-submit-label">Enviar</span>
                    <span className="chat-composer-submit-icon" aria-hidden="true">
                      <SendIcon />
                    </span>
                  </button>
                </form>

                {currentStep === "quoteReady" ? (
                  <div className="chat-actions chat-actions-inline">
                    <button type="button" onClick={() => void confirmLatestRide()} disabled={isBusy || !latestRideId}>
                      Confirmar corrida
                    </button>
                    <button type="button" className="secondary" onClick={() => void resetConversation()} disabled={isBusy}>
                      Novo atendimento
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
