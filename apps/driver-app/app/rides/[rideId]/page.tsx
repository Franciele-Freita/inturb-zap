"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BackArrowIcon } from "../../../components/back-arrow-icon";
import { Ride, formatCurrency, formatDateTime, request } from "../../../lib/api";
import { loadStoredDriverSession } from "../../../lib/session";

function shortenAddress(address: string): { street: string; number: string; secondary: string } {
  const [firstPart, secondPart] = address.split(",");
  const primary = firstPart?.trim() ?? address.trim();
  const secondary = secondPart?.trim() ?? "";
  const match = primary.match(/^(.*?)(\d+[A-Za-z/-]*)$/);

  return {
    street: match?.[1]?.trim().replace(/[,-]$/, "") ?? primary,
    number: match?.[2]?.trim() ?? "",
    secondary
  };
}

function renderAddress(address: string) {
  const parsed = shortenAddress(address);

  return (
    <span className="address-preview">
      <strong className="address-line">
        <span>{parsed.street}</span>
        {parsed.number ? <em>{parsed.number}</em> : null}
      </strong>
      {parsed.secondary ? <small>{parsed.secondary}</small> : null}
    </span>
  );
}

function buildRideMapEmbedUrl(origin: string, destination: string): string {
  const params = new URLSearchParams({
    output: "embed",
    saddr: origin,
    daddr: destination
  });

  return `https://maps.google.com/maps?${params.toString()}`;
}

function buildRideExternalMapUrl(origin: string, destination: string): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving"
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="detail-info-icon phone">
      <path d="M6.6 2.8l3.1 2.5c.6.5.8 1.3.4 2l-1.2 2.4a1 1 0 0 0 .1 1c1.2 1.8 2.8 3.4 4.6 4.6a1 1 0 0 0 1 .1l2.4-1.2c.7-.4 1.6-.2 2 .4l2.5 3.1c.5.7.5 1.7-.1 2.3l-1.5 1.5c-.7.7-1.7 1-2.7.8-3-.7-5.8-2.2-8.2-4.6-2.4-2.4-3.9-5.2-4.6-8.2-.2-1 .1-2 .8-2.7l1.5-1.5c.6-.6 1.6-.6 2.3-.1Z" />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="detail-info-icon status">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2h.01" />
      <path d="M11.2 11.3H12v4.5" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="detail-info-icon hash">
      <path d="M9 3 7 21" />
      <path d="M17 3l-2 18" />
      <path d="M4 9h16" />
      <path d="M3 15h16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="detail-info-icon clock">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="detail-copy-icon">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function formatPhoneForDisplay(phone?: string): string {
  if (!phone) {
    return "Nao informado";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

function getRideStatusPresentation(status: string): { label: string; className: string } {
  switch (status) {
    case "PREBOOKED":
      return { label: "Pre-agendada", className: "prebooked" };
    case "ACCEPTED":
      return { label: "Aceita", className: "accepted" };
    case "COMPLETED":
      return { label: "Concluida", className: "accepted" };
    case "REJECTED":
      return { label: "Recusada", className: "rejected" };
    case "EXPIRED":
      return { label: "Expirada", className: "expired" };
    case "CANCELLED":
      return { label: "Cancelada", className: "expired" };
    default:
      return { label: status, className: "default" };
  }
}

function getRideDecisionState(ride: Ride, nowMs: number): {
  expiresLabel: string;
  receivedLabel: string;
  progressPercent: number;
} {
  const startedAtMs = new Date(ride.decisionWindow?.startedAt ?? ride.updatedAt).getTime();
  const expiresAtMs = new Date(ride.decisionWindow?.expiresAt ?? ride.updatedAt).getTime();
  const totalSeconds = ride.decisionWindow?.totalSeconds ?? 30 * 60;
  const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
  const receivedMinutes = Math.max(0, Math.floor((nowMs - startedAtMs) / 60_000));
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));

  return {
    expiresLabel: `Expira em ${remainingMinutes}min`,
    receivedLabel: receivedMinutes <= 0 ? "Recebido agora" : `Recebido há ${receivedMinutes} min`,
    progressPercent: Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100))
  };
}

export default function DriverRideDetailPage() {
  const params = useParams<{ rideId: string }>();
  const router = useRouter();
  const rideId = params.rideId;
  const [ride, setRide] = useState<Ride | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando corrida...");
  const [isBusy, setIsBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isExtraOpen, setIsExtraOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const session = loadStoredDriverSession();
    if (!session) {
      router.replace("/");
      return;
    }

    void request<Ride>(`/drivers/${session.driver.id}/available-rides/${rideId}`)
      .then((rideResponse) => {
        setRide(rideResponse);
        setStatusMessage("Confira os detalhes antes de aceitar a corrida.");
      })
      .catch((error: Error) => {
        setStatusMessage(error.message);
      });
  }, [rideId, router]);

  const decisionState = useMemo(() => (ride ? getRideDecisionState(ride, nowMs) : null), [ride, nowMs]);
  const rideStatus = useMemo(
    () => getRideStatusPresentation(ride?.status ?? "PREBOOKED"),
    [ride?.status]
  );

  async function handleCopyPhone(): Promise<void> {
    if (!ride?.customerPhone || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(ride.customerPhone);
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 1800);
  }

  async function handleDecision(decision: "ACCEPT" | "REJECT"): Promise<void> {
    const session = loadStoredDriverSession();
    if (!session || !ride) {
      return;
    }

    setIsBusy(true);
    try {
      await request<Ride>(`/drivers/${session.driver.id}/rides/${ride.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision })
      });
      router.push(decision === "ACCEPT" ? "/?tab=mine" : "/");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao registrar decisao.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!ride) {
    return (
      <main className="driver-app-shell">
        <section className="screen-shell">
          <header className="screen-header">
            <button type="button" className="back-button" onClick={() => router.push("/")} aria-label="Voltar">
              <BackArrowIcon />
            </button>
            <div className="header-stack">
              <h1>Pré-agendamento</h1>
            </div>
          </header>

          <article className="driver-panel">
            <div className="empty-state">{statusMessage}</div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="driver-app-shell">
      <section className="screen-shell">
        <header className="screen-header">
          <button type="button" className="back-button" onClick={() => router.push("/")} aria-label="Voltar">
            <BackArrowIcon />
          </button>
          <div className="header-stack">
            <h1>Pré-agendamento</h1>
          </div>
        </header>

        <article className="driver-panel">
          <article className="ride-card available-ride-card ride-detail-card">
            {decisionState ? (
              <div className="ride-expiry-header">
                <span className="ride-expiry-label">{decisionState.expiresLabel}</span>
                <div className="ride-expiry-track" aria-hidden="true">
                  <span className="ride-expiry-bar" style={{ width: `${decisionState.progressPercent}%` }} />
                </div>
              </div>
            ) : null}

            <div className="minimal-ride-head">
              <div className="minimal-ride-title">
                <div className="client-identity">
                  <span className="client-avatar">{ride.customerName.charAt(0).toUpperCase()}</span>
                  <strong>{ride.customerName}</strong>
                </div>
                <div className="customer-tier-line">
                  <span>{ride.customerProfile?.tierEmoji ?? "🆕"}</span>
                  <span>{ride.customerProfile?.tierLabel ?? "Novo"}</span>
                  <span aria-hidden="true">&bull;</span>
                  <span>Score {ride.customerProfile?.score ?? 50}</span>
                  <span aria-hidden="true">&bull;</span>
                  <span>{ride.customerProfile?.totalRides ?? 0} solicitações</span>
                </div>
              </div>
            </div>

            <div className="ride-primary-row">
              <span className="ride-primary-datetime">{formatDateTime(ride.scheduledAt)}</span>
              <strong className="ride-summary-price">{formatCurrency(ride.quote?.amount)}</strong>
            </div>

            <div className="minimal-route compact-route">
              <div className="minimal-route-marker" aria-hidden="true">
                <span className="route-dot start" />
                <span className="route-line" />
                <span className="route-dot end" />
              </div>

              <div className="minimal-route-stops">
                <div className="minimal-ride-stop">{renderAddress(ride.origin)}</div>
                <div className="minimal-ride-stop destination">{renderAddress(ride.destination)}</div>
              </div>
            </div>

            <div className="ride-compact-stats">
              <span>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</span>
              <span aria-hidden="true">&bull;</span>
              <span>{ride.quote?.routeDurationMinutes ?? 0} min</span>
            </div>

            <div className="ride-detail-map">
              <iframe
                title={`Mapa da corrida ${ride.id}`}
                src={buildRideMapEmbedUrl(ride.origin, ride.destination)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                tabIndex={-1}
              />
              <a
                href={buildRideExternalMapUrl(ride.origin, ride.destination)}
                target="_blank"
                rel="noreferrer"
                className="ride-map-overlay"
                aria-label="Abrir trajeto no mapa"
              >
                <span>Abrir no mapa</span>
              </a>
            </div>

            <section className="detail-section">
              <button
                type="button"
                className="detail-toggle"
                onClick={() => setIsExtraOpen((current) => !current)}
                aria-expanded={isExtraOpen}
              >
                <span>Mais informações</span>
                <span className={isExtraOpen ? "detail-toggle-icon open" : "detail-toggle-icon"} aria-hidden="true">
                  ▾
                </span>
              </button>

              {isExtraOpen ? (
                <div className="detail-info-list">
                  <div className="detail-info-item">
                    <div className="detail-info-head">
                      <PhoneIcon />
                      <span className="detail-info-title">Telefone</span>
                    </div>
                    <div className="detail-phone-row">
                      <a
                        href={ride.customerPhone ? `tel:${ride.customerPhone}` : undefined}
                        className={ride.customerPhone ? "detail-phone-link" : "detail-phone-link disabled"}
                        aria-disabled={!ride.customerPhone}
                      >
                        <strong className="detail-value">{formatPhoneForDisplay(ride.customerPhone)}</strong>
                        {ride.customerPhone ? <span className="detail-phone-call">Ligar</span> : null}
                      </a>

                      {ride.customerPhone ? (
                        <button
                          type="button"
                          className="detail-copy-button"
                          onClick={() => void handleCopyPhone()}
                          aria-label="Copiar telefone"
                        >
                          <CopyIcon />
                        </button>
                      ) : null}
                    </div>
                    {copiedPhone ? <span className="detail-copy-feedback">Telefone copiado</span> : null}
                  </div>
                  <div className="detail-info-item">
                    <div className="detail-info-head">
                      <StatusIcon />
                      <span className="detail-info-title">Status da corrida</span>
                    </div>
                    <span className={`detail-status-badge ${rideStatus.className}`}>{rideStatus.label}</span>
                  </div>
                  <div className="detail-info-item">
                    <div className="detail-info-head">
                      <HashIcon />
                      <span className="detail-info-title">ID da corrida</span>
                    </div>
                    <strong className="detail-value">{ride.id}</strong>
                  </div>
                  <div className="detail-info-item">
                    <div className="detail-info-head">
                      <ClockIcon />
                      <span className="detail-info-title">Recebido em</span>
                    </div>
                    <strong className="detail-value">
                      {formatDateTime(ride.decisionWindow?.startedAt ?? ride.updatedAt)}
                    </strong>
                  </div>
                </div>
              ) : null}
            </section>

            <div className="ride-action-row split compact-pair">
              <button
                type="button"
                className="secondary compact-action reject-action"
                onClick={() => void handleDecision("REJECT")}
                disabled={isBusy}
              >
                Rejeitar
              </button>
              <button
                type="button"
                className="primary-cta compact-action"
                onClick={() => void handleDecision("ACCEPT")}
                disabled={isBusy}
              >
                Aceitar
              </button>
            </div>
          </article>
        </article>
      </section>
    </main>
  );
}
