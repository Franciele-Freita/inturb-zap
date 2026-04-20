"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackArrowIcon } from "../../../components/back-arrow-icon";
import { DriverProfile, NotificationItem, formatDateTime, request } from "../../../lib/api";
import {
  getPushReadiness,
  PushPermissionState,
  PushReadiness,
  subscribeDriverToPush,
  unregisterDriverPush
} from "../../../lib/push";
import { loadStoredDriverSession } from "../../../lib/session";

export default function DriverNotificationsSettingsPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [statusMessage, setStatusMessage] = useState("Carregando configuracoes de notificacao...");
  const [isBusy, setIsBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState<PushPermissionState>("unsupported");
  const [pushStatusMessage, setPushStatusMessage] = useState("Verificando este aparelho...");

  function updatePushState(readiness: PushReadiness): void {
    setPushPermission(readiness.permission);
    setPushStatusMessage(readiness.message);
  }

  useEffect(() => {
    const session = loadStoredDriverSession();
    if (!session) {
      router.replace("/");
      return;
    }

    updatePushState(getPushReadiness());

    void Promise.all([
      request<DriverProfile>(`/drivers/${session.driver.id}`),
      request<NotificationItem[]>(`/notifications?driverId=${encodeURIComponent(session.driver.id)}`)
    ])
      .then(([profile, items]) => {
        setDriver(profile);
        setNotifications(items);
        setStatusMessage("Gerencie os alertas deste aparelho.");
      })
      .catch((error: Error) => {
        setStatusMessage(error.message);
      });
  }, [router]);

  async function handleEnable(): Promise<void> {
    if (!driver) {
      return;
    }

    setIsBusy(true);
    try {
      const permission = await subscribeDriverToPush(driver.id);
      updatePushState(getPushReadiness());

      if (permission === "granted") {
        setStatusMessage("Notificacoes ativadas neste aparelho.");
      } else if (permission === "denied") {
        setStatusMessage("O navegador bloqueou as notificacoes deste aparelho.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao ativar notificacoes.";
      setStatusMessage(message);
      setPushStatusMessage(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisable(): Promise<void> {
    if (!driver) {
      return;
    }

    setIsBusy(true);
    try {
      await unregisterDriverPush(driver.id);
      updatePushState(getPushReadiness());
      setStatusMessage("Assinatura de notificacoes removida deste aparelho.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao remover notificacoes.";
      setStatusMessage(message);
      setPushStatusMessage(message);
    } finally {
      setIsBusy(false);
    }
  }

  if (!driver) {
    return (
      <main className="driver-app-shell">
        <section className="screen-shell">
          <header className="screen-header">
            <div className="header-stack">
              <h1>Notificacoes</h1>
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
          <button
            type="button"
            className="back-button"
            onClick={() => router.push("/settings")}
            aria-label="Voltar"
          >
            <BackArrowIcon />
          </button>

          <div className="header-stack">
            <h1>Notificacoes</h1>
          </div>
        </header>

        <article className="driver-panel">
          <div className="driver-panel-header">
            <div className="driver-section-head">
              <h2>Este aparelho</h2>
              <span>{statusMessage}</span>
            </div>
          </div>

          <article className="notification-card">
            <div className="ride-card-head">
              <div>
                <strong>Status das notificacoes</strong>
                <p className="meta">{pushStatusMessage}</p>
              </div>
              <span className="ride-status">
                {pushPermission === "granted" ? "Ativas" : pushPermission === "denied" ? "Bloqueadas" : "Pendentes"}
              </span>
            </div>

            <div className="settings-actions">
              {pushPermission !== "granted" ? (
                <button type="button" className="primary-cta" onClick={() => void handleEnable()} disabled={isBusy}>
                  {isBusy ? "Ativando..." : "Ativar notificacoes"}
                </button>
              ) : null}

              <button type="button" className="secondary" onClick={() => void handleDisable()} disabled={isBusy}>
                {isBusy ? "Processando..." : "Desativar neste aparelho"}
              </button>
            </div>
          </article>

          <div className="driver-panel-divider" />

          <div className="driver-panel-header">
            <div className="driver-section-head">
              <h2>Atividade recente</h2>
              <span>{notifications.length} notificacoes carregadas.</span>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">Nenhuma notificacao recente para este motorista.</div>
            ) : (
              notifications.map((notification) => (
                <article key={notification.id} className="notification-card">
                  <div className="ride-card-head">
                    <div>
                      <strong>{notification.title}</strong>
                      <p className="meta">{notification.body}</p>
                    </div>
                    <span className="ride-status">{notification.readAt ? "Lida" : "Nova"}</span>
                  </div>

                  <div className="ride-meta-grid">
                    <div>
                      <span className="eyebrow">Corrida</span>
                      <strong>{notification.rideId}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Quando</span>
                      <strong>{formatDateTime(notification.createdAt)}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Tipo</span>
                      <strong>{notification.type}</strong>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
