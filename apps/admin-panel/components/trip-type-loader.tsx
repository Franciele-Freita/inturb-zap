"use client";

import { useEffect, useState } from "react";
import { TripType, request } from "../lib/api";
import { TripTypeEditor } from "./trip-type-editor";

type TripTypeLoaderProps = {
  tripTypeId: string;
};

export function TripTypeLoader({ tripTypeId }: TripTypeLoaderProps) {
  const [tripType, setTripType] = useState<TripType | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void request<TripType>(`/admin/trip-types/${tripTypeId}`)
      .then((data) => {
        setTripType(data);
        setErrorMessage("");
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      });
  }, [tripTypeId]);

  if (errorMessage) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Tipos de viagem</p>
            <h1>Falha ao carregar cadastro</h1>
            <p className="helper-text">{errorMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!tripType) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Tipos de viagem</p>
            <h1>Carregando cadastro</h1>
            <p className="helper-text">Buscando os dados completos do tipo selecionado.</p>
          </div>
        </section>
      </main>
    );
  }

  return <TripTypeEditor mode="edit" initialTripType={tripType} />;
}
