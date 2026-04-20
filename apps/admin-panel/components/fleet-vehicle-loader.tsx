"use client";

import { useEffect, useState } from "react";
import { FleetVehicleDetails, request } from "../lib/api";
import { FleetVehicleEditor } from "./fleet-vehicle-editor";
import { FleetVehicleWorkspace, FleetVehicleWorkspaceTab } from "./fleet-vehicle-workspace";

type FleetVehicleLoaderProps = {
  vehicleId: string;
  view: "workspace" | "editor";
  activeTab?: FleetVehicleWorkspaceTab;
};

export function FleetVehicleLoader({ vehicleId, view, activeTab }: FleetVehicleLoaderProps) {
  const [vehicle, setVehicle] = useState<FleetVehicleDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void request<FleetVehicleDetails>(`/admin/fleet/vehicles/${vehicleId}`)
      .then((data) => {
        setVehicle(data);
        setErrorMessage("");
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      });
  }, [vehicleId]);

  if (errorMessage) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Frota</p>
            <h1>Falha ao carregar carro</h1>
            <p className="helper-text">{errorMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!vehicle) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Frota</p>
            <h1>Carregando carro da frota</h1>
            <p className="helper-text">Buscando os dados completos do carro selecionado.</p>
          </div>
        </section>
      </main>
    );
  }

  if (view === "editor") {
    return <FleetVehicleEditor mode="edit" initialVehicle={vehicle} />;
  }

  return <FleetVehicleWorkspace vehicle={vehicle} activeTab={activeTab ?? "overview"} />;
}
