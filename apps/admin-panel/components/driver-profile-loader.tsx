"use client";

import { useEffect, useState } from "react";
import { DriverProfile, request } from "../lib/api";
import { DriverProfileEditorSaas } from "./driver-profile-editor-saas";
import { DriverProfileWorkspace, DriverWorkspaceTab } from "./driver-profile-workspace";

type DriverProfileLoaderProps = {
  driverId: string;
  view: "workspace" | "editor";
  activeTab?: DriverWorkspaceTab;
};

export function DriverProfileLoader({ driverId, view, activeTab }: DriverProfileLoaderProps) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    void request<DriverProfile>(`/admin/drivers/${driverId}`)
      .then((data) => {
        setDriver(data);
        setErrorMessage("");
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      });
  }, [driverId]);

  if (errorMessage) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Motoristas</p>
            <h1>Falha ao carregar cadastro</h1>
            <p className="helper-text">{errorMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!driver) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Motoristas</p>
            <h1>Carregando cadastro</h1>
            <p className="helper-text">Buscando os dados completos do motorista selecionado.</p>
          </div>
        </section>
      </main>
    );
  }

  if (view === "editor") {
    return <DriverProfileEditorSaas mode="edit" initialDriver={driver} />;
  }

  return <DriverProfileWorkspace driver={driver} activeTab={activeTab ?? "overview"} />;
}
