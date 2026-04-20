"use client";

import { useEffect, useState } from "react";
import { PricingRule, request } from "../lib/api";
import { PricingRuleEditor } from "./pricing-rule-editor";

type PricingRuleLoaderProps = {
  ruleId: string;
};

export function PricingRuleLoader({ ruleId }: PricingRuleLoaderProps) {
  const [rule, setRule] = useState<PricingRule | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void request<PricingRule>(`/admin/pricing-rules/${ruleId}`)
      .then((data) => {
        setRule(data);
        setErrorMessage("");
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      });
  }, [ruleId]);

  if (errorMessage) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Precificacao</p>
            <h1>Falha ao carregar regra</h1>
            <p className="helper-text">{errorMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!rule) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">Precificacao</p>
            <h1>Carregando regra</h1>
            <p className="helper-text">Buscando a regra tarifaria selecionada.</p>
          </div>
        </section>
      </main>
    );
  }

  return <PricingRuleEditor mode="edit" initialRule={rule} />;
}
