"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackArrowIcon } from "../../components/back-arrow-icon";
import { DriverProfile, request } from "../../lib/api";
import { loadStoredDriverSession } from "../../lib/session";

export default function DriverSettingsPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando configuracoes...");

  useEffect(() => {
    const session = loadStoredDriverSession();
    if (!session) {
      router.replace("/");
      return;
    }

    void request<DriverProfile>(`/drivers/${session.driver.id}`)
      .then((profile) => {
        setDriver(profile);
        setStatusMessage("Ajuste as preferencias deste aparelho.");
      })
      .catch((error: Error) => {
        setStatusMessage(error.message);
      });
  }, [router]);

  if (!driver) {
    return (
      <main className="driver-app-shell">
        <section className="screen-shell">
          <header className="screen-header">
            <div className="header-stack">
              <h1>Configuracoes</h1>
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
            <h1>Configuracoes</h1>
          </div>
        </header>

        <article className="driver-panel">
          <div className="driver-panel-header">
            <div className="driver-section-head">
              <h2>Preferencias</h2>
              <span>{statusMessage}</span>
            </div>
          </div>

          <div className="settings-list">
            <button
              type="button"
              className="settings-link-card"
              onClick={() => router.push("/settings/notifications")}
            >
              <div className="settings-link-copy">
                <strong>Notificacoes</strong>
                <span>Ative ou desligue os alertas de novas corridas neste aparelho.</span>
              </div>
              <span className="settings-link-arrow" aria-hidden="true">
                &rsaquo;
              </span>
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
