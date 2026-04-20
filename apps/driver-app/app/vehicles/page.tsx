"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackArrowIcon } from "../../components/back-arrow-icon";
import { DriverProfile, formatDateTime, request } from "../../lib/api";
import { loadStoredDriverSession } from "../../lib/session";

export default function DriverVehiclesPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando veiculos...");

  useEffect(() => {
    const session = loadStoredDriverSession();
    if (!session) {
      router.replace("/");
      return;
    }

    void request<DriverProfile>(`/drivers/${session.driver.id}`)
      .then((profile) => {
        setDriver(profile);
        setStatusMessage(profile.vehicles.length === 0 ? "Nenhum veiculo cadastrado." : "Veiculos atualizados.");
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
              <p className="eyebrow">Motorista</p>
              <h1>Veiculos</h1>
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
            {/* <p className="eyebrow">Motorista</p> */}
            <h1>Veiculos</h1>
           {/*  <span>{driver.name}</span> */}
          </div>
        </header>

        <article className="driver-panel">
          <div className="driver-panel-header">
            <div className="driver-section-head">
              <h2>Minha garagem</h2>
              <span>{statusMessage}</span>
            </div>
          </div>

          <div className="vehicle-list">
            {driver.vehicles.length === 0 ? (
              <div className="empty-state">Nenhum veiculo cadastrado para este motorista.</div>
            ) : (
              driver.vehicles.map((vehicle) => (
                <article key={vehicle.id} className="vehicle-card">
                  <div className="ride-card-head">
                    <div>
                      <strong>{vehicle.label}</strong>
                      <p className="meta">{vehicle.plate}</p>
                    </div>
                    <span className="ride-status">{vehicle.isActive ? "Ativo" : "Reserva"}</span>
                  </div>

                  <div className="ride-meta-grid">
                    <div>
                      <span className="eyebrow">Cor</span>
                      <strong>{vehicle.color ?? "-"}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Ano</span>
                      <strong>{vehicle.year ?? "-"}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Atualizado</span>
                      <strong>{formatDateTime(vehicle.updatedAt)}</strong>
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
