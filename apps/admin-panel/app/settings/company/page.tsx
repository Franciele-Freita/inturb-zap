"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CompanyProfileConfig, request } from "../../../lib/api";

type CompanyProfileFormState = {
  legalName: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  email: string;
  website: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  legalRepresentativeName: string;
  legalRepresentativeCpf: string;
  legalRepresentativeRole: string;
  contractSignatureCity: string;
  geofenceEnabled: boolean;
  geofenceBaseLatitude: string;
  geofenceBaseLongitude: string;
  geofenceRadiusMeters: string;
  updatedAt?: string;
};

const initialCompanyProfileForm: CompanyProfileFormState = {
  legalName: "Inturb Plataforma de Mobilidade LTDA",
  tradeName: "Inturb",
  cnpj: "",
  phone: "",
  email: "operacao@inturb.local",
  website: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  legalRepresentativeName: "",
  legalRepresentativeCpf: "",
  legalRepresentativeRole: "",
  contractSignatureCity: "",
  geofenceEnabled: false,
  geofenceBaseLatitude: "",
  geofenceBaseLongitude: "",
  geofenceRadiusMeters: "150",
  updatedAt: undefined
};

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanyProfileFormState>(initialCompanyProfileForm);
  const [statusMessage, setStatusMessage] = useState("Carregando dados da empresa.");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLookingUpZipCode, setIsLookingUpZipCode] = useState(false);
  const [zipLookupMessage, setZipLookupMessage] = useState("");
  const zipLookupCacheRef = useRef<Record<string, ViaCepPayload | "NOT_FOUND">>({});
  const lastLookupZipRef = useRef("");

  useEffect(() => {
    let mounted = true;
    setIsLoadingProfile(true);

    void request<CompanyProfileConfig>("/admin/company-profile")
      .then((loaded) => {
        if (!mounted) return;
        setForm(toCompanyProfileFormState(loaded));
        setStatusMessage(
          loaded.updatedAt
            ? `Dados carregados. Ultima atualizacao em ${formatDateTime(loaded.updatedAt)}.`
            : "Preencha os dados institucionais da Inturb para contratos e documentos."
        );
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setStatusMessage(error.message || "Nao foi possivel carregar os dados da empresa.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const readiness = useMemo(() => {
    const pending: string[] = [];
    if (!form.legalName.trim()) pending.push("Razao social");
    if (form.cnpj.replace(/\D/g, "").length !== 14) pending.push("CNPJ");
    if (!form.legalRepresentativeName.trim()) pending.push("Representante legal");
    if (form.legalRepresentativeCpf.replace(/\D/g, "").length !== 11) pending.push("CPF do representante");
    if (!form.city.trim()) pending.push("Cidade");
    if (!form.state.trim()) pending.push("UF");
    return {
      ready: pending.length === 0,
      pending
    };
  }, [form]);

  function updateField<Key extends keyof CompanyProfileFormState>(key: Key, value: CompanyProfileFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleLookupZipCode(rawZipCode?: string) {
    const zipCodeDigits = (rawZipCode ?? form.zipCode).replace(/\D/g, "").slice(0, 8);

    if (zipCodeDigits.length !== 8) {
      setZipLookupMessage("Informe um CEP com 8 digitos.");
      return;
    }

    const cached = zipLookupCacheRef.current[zipCodeDigits];
    if (cached === "NOT_FOUND") {
      setZipLookupMessage("CEP nao encontrado.");
      return;
    }
    if (cached) {
      applyZipLookup(zipCodeDigits, cached);
      return;
    }

    setIsLookingUpZipCode(true);
    setZipLookupMessage("Consultando CEP...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCodeDigits}/json/`);
      if (!response.ok) {
        throw new Error("ZIP_LOOKUP_FAILED");
      }

      const payload = (await response.json()) as ViaCepPayload;
      if (payload.erro) {
        zipLookupCacheRef.current[zipCodeDigits] = "NOT_FOUND";
        setZipLookupMessage("CEP nao encontrado.");
        return;
      }

      zipLookupCacheRef.current[zipCodeDigits] = payload;
      applyZipLookup(zipCodeDigits, payload);
    } catch {
      setZipLookupMessage("Nao foi possivel consultar o CEP no momento.");
    } finally {
      setIsLookingUpZipCode(false);
    }
  }

  function applyZipLookup(zipCodeDigits: string, payload: ViaCepPayload) {
    setForm((current) => ({
      ...current,
      zipCode: formatZipCodeInput(zipCodeDigits),
      street: payload.logradouro?.trim() || current.street,
      neighborhood: payload.bairro?.trim() || current.neighborhood,
      city: payload.localidade?.trim() || current.city,
      state: payload.uf?.trim().toUpperCase().slice(0, 2) || current.state
    }));
    lastLookupZipRef.current = zipCodeDigits;
    setZipLookupMessage("CEP consultado com sucesso.");
  }

  async function handleSave() {
    const payload = {
      legalName: form.legalName.trim(),
      tradeName: form.tradeName.trim(),
      cnpj: formatCnpjInput(form.cnpj),
      phone: formatPhoneInput(form.phone),
      email: form.email.trim(),
      website: form.website.trim(),
      zipCode: formatZipCodeInput(form.zipCode),
      street: form.street.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase().slice(0, 2),
      legalRepresentativeName: form.legalRepresentativeName.trim(),
      legalRepresentativeCpf: formatCpfInput(form.legalRepresentativeCpf),
      legalRepresentativeRole: form.legalRepresentativeRole.trim(),
      contractSignatureCity: form.contractSignatureCity.trim(),
      geofenceEnabled: form.geofenceEnabled,
      geofenceBaseLatitude:
        form.geofenceBaseLatitude.trim().length > 0 ? Number(form.geofenceBaseLatitude) : undefined,
      geofenceBaseLongitude:
        form.geofenceBaseLongitude.trim().length > 0 ? Number(form.geofenceBaseLongitude) : undefined,
      geofenceRadiusMeters:
        form.geofenceRadiusMeters.trim().length > 0 ? Number(form.geofenceRadiusMeters) : undefined
    };

    setIsSavingProfile(true);
    try {
      const updated = await request<CompanyProfileConfig>("/admin/company-profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setForm(toCompanyProfileFormState(updated));
      setStatusMessage(`Dados da empresa salvos em ${formatDateTime(updated.updatedAt)}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar dados da empresa.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <main className="page-shell driver-contracts-shell">
      <section className="drivers-page-topbar driver-list-topbar">
        <div className="driver-list-topbar-copy">
          <div className="driver-list-topbar-header">
            <div className="driver-list-topbar-heading">
              <p className="eyebrow">Dados da empresa</p>
              <h1>Dados da Empresa</h1>
              <p className="drivers-page-status">
                Cadastre as informacoes institucionais da Inturb para contratos, documentos e operacoes internas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide">
          <div className="driver-editor-summary-strip driver-editor-contract-grid">
            <article className="driver-editor-summary-card">
              <span>Situacao cadastral</span>
              <strong>{readiness.ready ? "Base institucional completa" : "Campos essenciais pendentes"}</strong>
              <small className={`driver-editor-contracts-status-chip ${readiness.ready ? "is-signed" : "is-sent"}`}>
                {readiness.ready ? "Pronto para contratos" : `${readiness.pending.length} pendencia(s)`}
              </small>
              <small>{statusMessage}</small>
              {!readiness.ready ? (
                <small>
                  Falta preencher: {readiness.pending.join(", ")}.
                </small>
              ) : null}
            </article>
          </div>
          <div className="company-settings-sections">
            <section className="company-settings-section">
              <div className="company-settings-section-head">
                <span className="company-settings-section-index">01</span>
                <div className="company-settings-section-copy">
                  <h2>Identificacao juridica</h2>
                  <p>Informacoes principais da pessoa juridica.</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Razao social
                  <input
                    value={form.legalName}
                    onChange={(event) => updateField("legalName", event.target.value)}
                    placeholder="Inturb Plataforma de Mobilidade LTDA"
                  />
                </label>
                <label>
                  Nome fantasia
                  <input
                    value={form.tradeName ?? ""}
                    onChange={(event) => updateField("tradeName", event.target.value)}
                    placeholder="Inturb"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  CNPJ
                  <input
                    value={form.cnpj ?? ""}
                    onChange={(event) => updateField("cnpj", formatCnpjInput(event.target.value))}
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                  />
                </label>
                <label>
                  E-mail institucional
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="operacao@inturb.com.br"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Telefone
                  <input
                    value={form.phone ?? ""}
                    onChange={(event) => updateField("phone", formatPhoneInput(event.target.value))}
                    placeholder="(27) 99999-0000"
                    inputMode="tel"
                  />
                </label>
                <label>
                  Site
                  <input
                    value={form.website ?? ""}
                    onChange={(event) => updateField("website", event.target.value)}
                    placeholder="https://inturb.com.br"
                  />
                </label>
              </div>
            </section>

            <section className="company-settings-section">
              <div className="company-settings-section-head">
                <span className="company-settings-section-index">02</span>
                <div className="company-settings-section-copy">
                  <h2>Endereco da empresa</h2>
                  <p>Base para clausulas contratuais e emissao de documentos.</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  CEP
                  <div className="driver-editor-address-cep-row">
                    <input
                      value={form.zipCode ?? ""}
                      onChange={(event) => {
                        const formatted = formatZipCodeInput(event.target.value);
                        updateField("zipCode", formatted);
                        const digits = formatted.replace(/\D/g, "");
                        if (digits.length < 8) {
                          setZipLookupMessage("");
                          return;
                        }
                        if (digits !== lastLookupZipRef.current) {
                          void handleLookupZipCode(digits);
                        }
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      className="secondary driver-editor-address-cep-button"
                      onClick={() => void handleLookupZipCode()}
                      disabled={isLookingUpZipCode}
                    >
                      {isLookingUpZipCode ? "Consultando..." : "Consultar CEP"}
                    </button>
                  </div>
                  {zipLookupMessage ? <small>{zipLookupMessage}</small> : null}
                </label>
                <label>
                  Rua
                  <input
                    value={form.street ?? ""}
                    onChange={(event) => updateField("street", event.target.value)}
                    placeholder="Nome da rua"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Numero
                  <input
                    value={form.number ?? ""}
                    onChange={(event) => updateField("number", event.target.value)}
                    placeholder="123"
                  />
                </label>
                <label>
                  Bairro
                  <input
                    value={form.neighborhood ?? ""}
                    onChange={(event) => updateField("neighborhood", event.target.value)}
                    placeholder="Bairro"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Cidade
                  <input
                    value={form.city ?? ""}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Cidade"
                  />
                </label>
                <label>
                  UF
                  <input
                    value={form.state ?? ""}
                    onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="ES"
                    maxLength={2}
                  />
                </label>
              </div>
            </section>

            <section className="company-settings-section">
              <div className="company-settings-section-head">
                <span className="company-settings-section-index">03</span>
                <div className="company-settings-section-copy">
                  <h2>Representacao legal</h2>
                  <p>Dados usados em assinatura e qualificacao da contratante.</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Representante legal
                  <input
                    value={form.legalRepresentativeName ?? ""}
                    onChange={(event) => updateField("legalRepresentativeName", event.target.value)}
                    placeholder="Nome completo"
                  />
                </label>
                <label>
                  CPF do representante
                  <input
                    value={form.legalRepresentativeCpf ?? ""}
                    onChange={(event) => updateField("legalRepresentativeCpf", formatCpfInput(event.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Cargo/funcao
                  <input
                    value={form.legalRepresentativeRole ?? ""}
                    onChange={(event) => updateField("legalRepresentativeRole", event.target.value)}
                    placeholder="Ex.: Diretor(a) de Operacoes"
                  />
                </label>
                <label>
                  Cidade de assinatura
                  <input
                    value={form.contractSignatureCity ?? ""}
                    onChange={(event) => updateField("contractSignatureCity", event.target.value)}
                    placeholder="Ex.: Serra/ES"
                  />
                </label>
              </div>
            </section>

            <section className="company-settings-section">
              <div className="company-settings-section-head">
                <span className="company-settings-section-index">04</span>
                <div className="company-settings-section-copy">
                  <h2>Cerca de ponto (Geofence)</h2>
                  <p>Define a base para classificar batidas como dentro ou fora da area permitida.</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Habilitar cerca da base
                  <select
                    value={form.geofenceEnabled ? "yes" : "no"}
                    onChange={(event) => updateField("geofenceEnabled", event.target.value === "yes")}
                  >
                    <option value="no">Nao</option>
                    <option value="yes">Sim</option>
                  </select>
                </label>
                <label>
                  Raio da cerca (m)
                  <input
                    value={form.geofenceRadiusMeters}
                    onChange={(event) =>
                      updateField("geofenceRadiusMeters", event.target.value.replace(/[^\d]/g, "").slice(0, 4))
                    }
                    placeholder="150"
                    inputMode="numeric"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Latitude da base
                  <input
                    value={form.geofenceBaseLatitude}
                    onChange={(event) => updateField("geofenceBaseLatitude", event.target.value)}
                    placeholder="-20.315500"
                    inputMode="decimal"
                  />
                </label>
                <label>
                  Longitude da base
                  <input
                    value={form.geofenceBaseLongitude}
                    onChange={(event) => updateField("geofenceBaseLongitude", event.target.value)}
                    placeholder="-40.312800"
                    inputMode="decimal"
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="driver-contract-actions company-settings-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setIsLoadingProfile(true);
                void request<CompanyProfileConfig>("/admin/company-profile")
                  .then((loaded) => {
                    setForm(toCompanyProfileFormState(loaded));
                    setStatusMessage(
                      loaded.updatedAt
                        ? `Dados recarregados. Ultima atualizacao em ${formatDateTime(loaded.updatedAt)}.`
                        : "Dados recarregados."
                    );
                  })
                  .catch((error: Error) => {
                    setStatusMessage(error.message || "Nao foi possivel recarregar os dados da empresa.");
                  })
                  .finally(() => setIsLoadingProfile(false));
              }}
              disabled={isLoadingProfile || isSavingProfile}
            >
              Recarregar
            </button>
            <button type="button" onClick={() => void handleSave()} disabled={isLoadingProfile || isSavingProfile}>
              {isSavingProfile ? "Salvando..." : "Salvar dados da empresa"}
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatZipCodeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

type ViaCepPayload = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function toCompanyProfileFormState(value: CompanyProfileConfig): CompanyProfileFormState {
  return {
    legalName: value.legalName ?? "",
    tradeName: value.tradeName ?? "",
    cnpj: value.cnpj ?? "",
    phone: value.phone ?? "",
    email: value.email ?? "",
    website: value.website ?? "",
    zipCode: value.zipCode ?? "",
    street: value.street ?? "",
    number: value.number ?? "",
    neighborhood: value.neighborhood ?? "",
    city: value.city ?? "",
    state: value.state ?? "",
    legalRepresentativeName: value.legalRepresentativeName ?? "",
    legalRepresentativeCpf: value.legalRepresentativeCpf ?? "",
    legalRepresentativeRole: value.legalRepresentativeRole ?? "",
    contractSignatureCity: value.contractSignatureCity ?? "",
    geofenceEnabled: value.geofenceEnabled ?? false,
    geofenceBaseLatitude:
      value.geofenceBaseLatitude === undefined ? "" : String(value.geofenceBaseLatitude),
    geofenceBaseLongitude:
      value.geofenceBaseLongitude === undefined ? "" : String(value.geofenceBaseLongitude),
    geofenceRadiusMeters:
      value.geofenceRadiusMeters === undefined ? "150" : String(value.geofenceRadiusMeters),
    updatedAt: value.updatedAt
  };
}

