"use client";

import { ChangeEvent, useRef, useState } from "react";
import { DriverAddress, DriverOperationalStatus } from "../lib/api";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type GenderOption = {
  value: string;
  label: string;
};

type MonthOption = {
  value: string;
  label: string;
};

type DriverProfileEditorPersonalSectionProps = {
  activeSection: DriverEditorSection;
  mode: "create" | "edit";
  name: string;
  cpf: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: string;
  bloodType: string;
  operationalStatus: DriverOperationalStatus;
  isActive: boolean;
  appAccessLabel: string;
  photoUrl: string;
  address?: DriverAddress;
  driverHasPassword: boolean;
  isCreateMode: boolean;
  isResettingPassword: boolean;
  shouldShowPasswordFields: boolean;
  password: string;
  confirmPassword: string;
  passwordIsValid: boolean;
  passwordFieldsTouched: boolean;
  monthOptions: readonly MonthOption[];
  genderOptions: readonly GenderOption[];
  onNameChange: (value: string) => void;
  onCpfChange: (value: string) => void;
  onBirthPartChange: (part: "birthDay" | "birthYear", value: string) => void;
  onBirthMonthChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onBloodTypeChange: (value: string) => void;
  onOperationalStatusChange: (value: DriverOperationalStatus) => void;
  onActiveChange: (value: boolean) => void;
  onPhotoUrlChange: (value: string) => void;
  onAddressChange: (value: DriverAddress | undefined) => void;
  onResetPasswordStart: () => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
};

type AddressState = DriverAddress;
type AddressFieldKey = "cep" | "addressType" | "number" | "street" | "neighborhood" | "city" | "state";
type ViaCepPayload = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
};

const emptyAddress: AddressState = {
  cep: "",
  addressType: undefined,
  street: "",
  number: "",
  neighborhood: "",
  complement: "",
  city: "",
  state: ""
};

const addressTypeOptions = [
  { value: "OWN", label: "Casa propria" },
  { value: "RENTED", label: "Alugada" }
] as const;
const brazilianStates = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]);
const addressFieldLabels: Record<AddressFieldKey, string> = {
  cep: "CEP",
  addressType: "Tipo de endereco",
  number: "Numero",
  street: "Rua",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "Estado (UF)"
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function validateCpf(cpf: string): boolean {
  const cleanCpf = digitsOnly(cpf);
  if (cleanCpf.length !== 11 || !!cleanCpf.match(/(\d)\1{10}/)) return false;
  
  const calc = (slice: string, factor: number) => 
    (slice.split("").reduce((acc, digit, idx) => acc + parseInt(digit) * (factor - idx), 0) * 10) % 11 % 10;

  return calc(cleanCpf.slice(0, 9), 10) === parseInt(cleanCpf[9]) && 
         calc(cleanCpf.slice(0, 10), 11) === parseInt(cleanCpf[10]);
}




function formatCpf(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCepInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function validateAddressDraft(value: AddressState, withoutNumber: boolean): {
  missingFields: AddressFieldKey[];
  missingLabels: string[];
} {
  const cep = digitsOnly(value.cep ?? "").slice(0, 8);
  const state = (value.state ?? "").trim().toUpperCase();
  const missingFields: AddressFieldKey[] = [];

  if (cep.length !== 8) {
    missingFields.push("cep");
  }
  if (!value.addressType) {
    missingFields.push("addressType");
  }
  if (!withoutNumber && !value.number?.trim()) {
    missingFields.push("number");
  }
  
  const requiredStrings: AddressFieldKey[] = ["street", "neighborhood", "city"];
  requiredStrings.forEach(field => {
    if (!value[field]?.trim()) missingFields.push(field);
  });

  if (state.length !== 2 || !brazilianStates.has(state)) {
    missingFields.push("state");
  }

  return {
    missingFields,
    missingLabels: missingFields.map((field) => addressFieldLabels[field])
  };
}

function resolveAddressTypeLabel(value?: AddressState["addressType"]): string {
  return addressTypeOptions.find((option) => option.value === value)?.label ?? "Endereco";
}

function hasAddressData(value?: AddressState): boolean {
  if (!value) {
    return false;
  }

  return [
    value.cep,
    value.addressType,
    value.street,
    value.number,
    value.neighborhood,
    value.complement,
    value.city,
    value.state
  ].some((item) => typeof item === "string" && item.trim().length > 0);
}

function normalizeAddressDraft(value: AddressState): AddressState | undefined {
  const cep = digitsOnly(value.cep ?? "").slice(0, 8);
  const addressType = value.addressType === "OWN" || value.addressType === "RENTED" ? value.addressType : undefined;
  const street = value.street?.trim() ?? "";
  const number = value.number?.trim() ?? "";
  const neighborhood = value.neighborhood?.trim() ?? "";
  const complement = value.complement?.trim() ?? "";
  const city = value.city?.trim() ?? "";
  const state = (value.state?.trim() ?? "").toUpperCase().slice(0, 2);

  if (!cep && !addressType && !street && !number && !neighborhood && !complement && !city && !state) {
    return undefined;
  }

  return {
    cep: cep || undefined,
    addressType,
    street: street || undefined,
    number: number || undefined,
    neighborhood: neighborhood || undefined,
    complement: complement || undefined,
    city: city || undefined,
    state: state || undefined
  };
}

function formatAddressHeadline(value?: AddressState): string {
  const street = value?.street?.trim();
  const number = value?.number?.trim();

  if (street && number) {
    return `${street}, ${number}`;
  }

  if (street) {
    return street;
  }

  if (number) {
    return `Numero ${number}`;
  }

  return "Endereco cadastrado";
}

function formatAddressLocation(value?: AddressState): string {
  const neighborhood = value?.neighborhood?.trim();
  const city = value?.city?.trim();
  const state = value?.state?.trim().toUpperCase();
  const cep = formatCepInput(value?.cep ?? "");
  const cityState = [city, state].filter(Boolean).join("/");
  const locality = [neighborhood, cityState].filter(Boolean).join(" - ");

  if (locality && cep) {
    return `${locality} | CEP ${cep}`;
  }

  if (locality) {
    return locality;
  }

  if (cep) {
    return `CEP ${cep}`;
  }

  return "Localizacao pendente";
}

export function DriverProfileEditorPersonalSection({
  activeSection,
  mode,
  name,
  cpf,
  birthDay,
  birthMonth,
  birthYear,
  gender,
  bloodType,
  operationalStatus,
  isActive,
  appAccessLabel,
  photoUrl,
  address,
  driverHasPassword,
  isCreateMode,
  isResettingPassword,
  shouldShowPasswordFields,
  password,
  confirmPassword,
  passwordIsValid,
  passwordFieldsTouched,
  monthOptions,
  genderOptions,
  onNameChange,
  onCpfChange,
  onBirthPartChange,
  onBirthMonthChange,
  onGenderChange,
  onBloodTypeChange,
  onOperationalStatusChange,
  onActiveChange,
  onPhotoUrlChange,
  onAddressChange,
  onResetPasswordStart,
  onPasswordChange,
  onConfirmPasswordChange
}: DriverProfileEditorPersonalSectionProps) {
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [draftAddress, setDraftAddress] = useState<AddressState>(emptyAddress);
  const [addressWithoutNumber, setAddressWithoutNumber] = useState(false);
  const [shouldShowAddressValidation, setShouldShowAddressValidation] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [addressLookupMessage, setAddressLookupMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cepLookupCacheRef = useRef<Record<string, ViaCepPayload | "NOT_FOUND">>({});
  const lastLookupCepRef = useRef("");
  const photoInitial = (name.trim().slice(0, 1) || "M").toUpperCase();
  const hasAddress = hasAddressData(address);
  const addressValidation = validateAddressDraft(draftAddress, addressWithoutNumber);
  const canSaveAddress = addressValidation.missingFields.length === 0;
  const shouldRenderAddressErrorHint = shouldShowAddressValidation && !canSaveAddress;
  const accessMessage =
    mode === "create"
      ? "Defina uma senha inicial para liberar o primeiro acesso do motorista ao app."
      : !driverHasPassword
        ? passwordIsValid
          ? "Defina uma senha inicial para liberar o acesso do motorista ao app."
          : "A senha precisa ter pelo menos 6 caracteres e coincidir com a confirmacao."
        : !isResettingPassword
          ? "O motorista ja possui senha cadastrada. Use redefinicao apenas quando precisar gerar um novo acesso."
          : passwordFieldsTouched
            ? passwordIsValid
              ? "A nova senha sera aplicada quando voce salvar este cadastro."
              : "A senha precisa ter pelo menos 6 caracteres e coincidir com a confirmacao."
            : "Informe e confirme a nova senha para redefinir o acesso do motorista.";

  function openAddressModal() {
    const initialNumber = (address?.number ?? "").trim();
    const isWithoutNumber = initialNumber.toUpperCase() === "S/N" || initialNumber.toUpperCase() === "SN";

    setDraftAddress({
      cep: formatCepInput(address?.cep ?? ""),
      addressType: address?.addressType,
      street: address?.street ?? "",
      number: isWithoutNumber ? "" : address?.number ?? "",
      neighborhood: address?.neighborhood ?? "",
      complement: address?.complement ?? "",
      city: address?.city ?? "",
      state: address?.state ?? ""
    });
    setAddressWithoutNumber(isWithoutNumber);
    setShouldShowAddressValidation(false);
    setAddressLookupMessage(null);
    setIsAddressModalOpen(true);
  }

  function closeAddressModal() {
    setIsAddressModalOpen(false);
    setIsLookingUpCep(false);
    setAddressLookupMessage(null);
    setAddressWithoutNumber(false);
    setShouldShowAddressValidation(false);
    setDraftAddress(emptyAddress);
  }

  function saveAddress() {
    if (!canSaveAddress) {
      setShouldShowAddressValidation(true);
      setAddressLookupMessage(`Campos pendentes: ${addressValidation.missingLabels.join(", ")}.`);
      return;
    }

    onAddressChange(
      normalizeAddressDraft({
        ...draftAddress,
        number: addressWithoutNumber ? "S/N" : draftAddress.number
      })
    );
    closeAddressModal();
  }

  function clearAddress() {
    onAddressChange(undefined);
  }

  function fieldClassName(field: AddressFieldKey): string {
    if (!shouldShowAddressValidation) {
      return "";
    }
    return addressValidation.missingFields.includes(field) ? "driver-editor-field-invalid" : "";
  }

  function setLookupSuccessMessage(nextAddress: AddressState) {
    const pending = validateAddressDraft(nextAddress, addressWithoutNumber).missingLabels;
    if (pending.length === 0) {
      setAddressLookupMessage("Endereco completo. Pronto para salvar.");
      return;
    }
    setAddressLookupMessage(`CEP consultado. Ainda falta preencher: ${pending.join(", ")}.`);
  }

  function applyCepLookup(cep: string, payload: ViaCepPayload) {
    let nextAddress = draftAddress;
    setDraftAddress((current) => {
      nextAddress = {
        ...current,
        cep: formatCepInput(cep),
        street: payload.logradouro?.trim() || current.street || "",
        neighborhood: payload.bairro?.trim() || current.neighborhood || "",
        city: payload.localidade?.trim() || current.city || "",
        state: payload.uf?.trim().toUpperCase() || current.state || "",
        complement: current.complement || payload.complemento?.trim() || ""
      };
      return nextAddress;
    });
    setLookupSuccessMessage(nextAddress);
  }

  async function lookupAddressByCep(forcedCep?: string) {
    const currentInput = forcedCep ?? draftAddress.cep ?? "";
    const cep = digitsOnly(currentInput).slice(0, 8);

    if (cep.length !== 8) {
      setAddressLookupMessage("Informe um CEP com 8 digitos.");
      return;
    }

    lastLookupCepRef.current = cep;

    const cached = cepLookupCacheRef.current[cep];
    if (cached) {
      if (cached === "NOT_FOUND") {
        setAddressLookupMessage("CEP nao encontrado.");
        return;
      }
      applyCepLookup(cep, cached);
      return;
    }

    setIsLookingUpCep(true);
    setAddressLookupMessage(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("CEP_LOOKUP_FAILED");
      }

      const payload = (await response.json()) as ViaCepPayload;

      if (payload.erro) {
        cepLookupCacheRef.current[cep] = "NOT_FOUND";
        setAddressLookupMessage("CEP nao encontrado.");
        return;
      }

      cepLookupCacheRef.current[cep] = payload;
      applyCepLookup(cep, payload);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setAddressLookupMessage("A consulta ao CEP demorou demais. Tente novamente.");
      } else {
        setAddressLookupMessage("Nao foi possivel consultar o CEP no momento.");
      }
    } finally {
      setIsLookingUpCep(false);
    }
  }

  function handleCepChange(value: string) {
    const formatted = formatCepInput(value);
    const cep = digitsOnly(formatted);

    setDraftAddress((current) => ({ ...current, cep: formatted }));
    setAddressLookupMessage(null);

    if (cep.length === 8 && cep !== lastLookupCepRef.current) {
      void lookupAddressByCep(cep);
    }
  }

  function openPhotoPicker() {
    photoInputRef.current?.click();
  }

  function clearPhoto() {
    onPhotoUrlChange("");
    setPhotoError("");
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Selecione um arquivo de imagem valido.");
      return;
    }

    const maxFileSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setPhotoError("A imagem deve ter no maximo 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setPhotoError("Nao foi possivel ler a imagem selecionada.");
        return;
      }

      onPhotoUrlChange(result);
      setPhotoError("");
    };
    reader.onerror = () => {
      setPhotoError("Nao foi possivel carregar a imagem.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <article
      id="driver-editor-personal"
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "basic" ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">01</span>
        <div className="panel-head">
          <h2>Dados basicos</h2>
          <span>Informacoes essenciais para identificar o motorista e controlar o acesso ao aplicativo.</span>
        </div>
      </div>

      <div className="driver-editor-block driver-editor-photo-block">
        <div className="driver-editor-block-head">
          <strong>Foto do motorista</strong>
          <p className="helper-text">Adicione uma foto para exibir no cadastro e facilitar a identificacao na operacao.</p>
        </div>
        <div className="driver-editor-photo-row">
          <div className="driver-editor-photo-preview" aria-hidden="true">
            {photoUrl ? <img src={photoUrl} alt="" /> : <span>{photoInitial}</span>}
          </div>
          <div className="driver-editor-photo-copy">
            <strong>{photoUrl ? "Foto cadastrada" : "Nenhuma foto cadastrada"}</strong>
            <p className="helper-text">Use uma imagem frontal e nítida para facilitar validações e triagem operacional.</p>
            {photoError ? <small className="driver-editor-photo-error">{photoError}</small> : null}
          </div>
          <div className="driver-editor-photo-actions">
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="driver-editor-photo-input" />
            <button type="button" className="secondary" onClick={openPhotoPicker}>
              {photoUrl ? "Trocar foto" : "Adicionar foto"}
            </button>
            {photoUrl ? (
              <button type="button" className="secondary" onClick={clearPhoto}>
                Remover
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="driver-editor-block">
        <div className="driver-editor-block-head">
          <strong>Identificacao</strong>
          <p className="helper-text">Dados basicos para identificar o motorista no sistema.</p>
        </div>
        <div className="form-grid">
          <label>
            Nome completo
            <input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Nome do motorista" />
          </label>
          <label>
            CPF
            <input value={cpf} onChange={(event) => onCpfChange(event.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
          </label>
          <label className="driver-birth-field">
            Data de nascimento
            <div className="driver-birth-grid">
              <input value={birthDay} onChange={(event) => onBirthPartChange("birthDay", event.target.value)} placeholder="Dia" inputMode="numeric" />
              <select className="select" value={birthMonth} onChange={(event) => onBirthMonthChange(event.target.value)}>
                <option value="">Mes</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <input value={birthYear} onChange={(event) => onBirthPartChange("birthYear", event.target.value)} placeholder="Ano" inputMode="numeric" />
            </div>
          </label>
          <label>
            Genero
            <select className="select" value={gender} onChange={(event) => onGenderChange(event.target.value)}>
              <option value="">Selecionar opcao</option>
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="driver-editor-compact-field">
            Tipo sanguineo
            <select className="select" value={bloodType} onChange={(event) => onBloodTypeChange(event.target.value)}>
              <option value="">Selecionar opcao</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </label>
          <label className="driver-editor-compact-field">
            Status
            <select className="select" value={operationalStatus} onChange={(event) => onOperationalStatusChange(event.target.value as DriverOperationalStatus)}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Afastado</option>
              <option value="LEAVE">Ferias</option>
              <option value="SUSPENDED">Bloqueado</option>
            </select>
          </label>
        </div>
      </div>

      <div className="driver-editor-block">
        <div className="driver-editor-block-head panel-head-inline">
          <div>
            <strong>Endereco do motorista</strong>
            <p className="helper-text">Cadastro residencial para apoio administrativo e validacoes internas.</p>
          </div>
          <button type="button" className="secondary" onClick={openAddressModal}>
            {hasAddress ? "Editar endereco" : "Adicionar endereco"}
          </button>
        </div>
        <div className="driver-editor-summary-strip">
          <article className="driver-editor-summary-card">
            <span>{resolveAddressTypeLabel(address?.addressType)}</span>
            <strong>{hasAddress ? formatAddressHeadline(address) : "Pendente"}</strong>
            {hasAddress ? (
              <>
                <small>{formatAddressLocation(address)}</small>
                {address?.complement ? <small>Complemento: {address.complement}</small> : null}
                <div className="driver-editor-summary-card-actions">
                  <button type="button" className="driver-editor-summary-link" onClick={openAddressModal}>
                    Ajustar endereco
                  </button>
                  <button type="button" className="driver-editor-summary-link is-danger" onClick={clearAddress}>
                    Remover
                  </button>
                </div>
              </>
            ) : (
              <small>Cadastre CEP, tipo e dados completos de logradouro para manter o perfil atualizado.</small>
            )}
          </article>
        </div>
      </div>

      <div className="driver-editor-block">
        <div className="driver-editor-block-head panel-head-inline driver-editor-access-header">
          <div>
            <strong>Acesso ao aplicativo</strong>
            <p className="helper-text">Controle de acesso e credenciais do motorista.</p>
          </div>
          <div className="driver-editor-access-summary">
            <span className={isActive ? "status-pill status-pill-success" : "status-pill"}>{appAccessLabel}</span>
            <button type="button" className="driver-editor-access-link" onClick={() => setIsAccessModalOpen(true)}>
              Configurar
            </button>
          </div>
        </div>
      </div>

      <DriverProfileEditorModal
        open={isAddressModalOpen}
        title="Endereco do motorista"
        description="Informe o endereco residencial do motorista. Voce pode consultar o CEP para preencher automaticamente."
        onClose={closeAddressModal}
        footer={
          <>
            <button type="button" className="secondary" onClick={closeAddressModal}>
              Cancelar
            </button>
            <button type="button" onClick={saveAddress}>
              Salvar endereco
            </button>
          </>
        }
      >
        {shouldRenderAddressErrorHint ? (
          <div className="driver-editor-address-required-hint is-warning">
            <strong>Campos obrigatorios pendentes</strong>
            <span>{`Faltam: ${addressValidation.missingLabels.join(", ")}.`}</span>
          </div>
        ) : null}
        <div className="form-grid">
          <label className={`driver-editor-modal-field-full ${fieldClassName("cep")}`}>
            CEP
            <div className="driver-editor-address-cep-row">
              <input
                value={draftAddress.cep ?? ""}
                onChange={(event) => handleCepChange(event.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
              />
              <button
                type="button"
                className="secondary driver-editor-address-cep-button"
                onClick={() => void lookupAddressByCep()}
                disabled={isLookingUpCep}
              >
                {isLookingUpCep ? "Consultando..." : "Consultar CEP"}
              </button>
            </div>
            {addressLookupMessage ? <small className="helper-text">{addressLookupMessage}</small> : null}
          </label>

          <div className="driver-editor-address-top-grid driver-editor-modal-field-full">
            <label className={fieldClassName("addressType")}>
              Tipo de endereco
              <select
                className="select"
                value={draftAddress.addressType ?? ""}
                onChange={(event) =>
                  setDraftAddress((current) => ({
                    ...current,
                    addressType:
                      event.target.value === "" ? undefined : (event.target.value as AddressState["addressType"])
                  }))
                }
              >
                <option value="">Selecionar tipo</option>
                {addressTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={`driver-editor-address-field ${fieldClassName("number")}`}>
              <div className="driver-editor-address-number-head">
                <span>Numero</span>
                <label className="driver-editor-address-number-toggle">
                  <input
                    type="checkbox"
                    checked={addressWithoutNumber}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setAddressWithoutNumber(checked);
                      if (checked) {
                        setDraftAddress((current) => ({ ...current, number: "" }));
                      }
                    }}
                  />
                  <span>Sem numero</span>
                </label>
              </div>
              <input
                value={draftAddress.number ?? ""}
                onChange={(event) => setDraftAddress((current) => ({ ...current, number: event.target.value }))}
                placeholder="Numero"
                disabled={addressWithoutNumber}
              />
            </div>

            <small className="helper-text driver-editor-address-guidance">
              Obrigatorio para concluir o cadastro do endereco.
            </small>
          </div>

          <label className={fieldClassName("street")}>
            Rua
            <input
              value={draftAddress.street ?? ""}
              onChange={(event) => setDraftAddress((current) => ({ ...current, street: event.target.value }))}
              placeholder="Rua"
            />
          </label>

          <label className={fieldClassName("neighborhood")}>
            Bairro
            <input
              value={draftAddress.neighborhood ?? ""}
              onChange={(event) => setDraftAddress((current) => ({ ...current, neighborhood: event.target.value }))}
              placeholder="Bairro"
            />
          </label>

          <label>
            Complemento
            <input
              value={draftAddress.complement ?? ""}
              onChange={(event) => setDraftAddress((current) => ({ ...current, complement: event.target.value }))}
              placeholder="Apartamento, bloco, referencia"
            />
          </label>

          <label className={fieldClassName("city")}>
            Cidade
            <input
              value={draftAddress.city ?? ""}
              onChange={(event) => setDraftAddress((current) => ({ ...current, city: event.target.value }))}
              placeholder="Cidade"
            />
          </label>

          <label className={fieldClassName("state")}>
            Estado (UF)
            <input
              value={draftAddress.state ?? ""}
              onChange={(event) =>
                setDraftAddress((current) => ({
                  ...current,
                  state: event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()
                }))
              }
              placeholder="UF"
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isAccessModalOpen}
        title="Configurar acesso ao aplicativo"
        description="Defina se o motorista pode acessar o app e ajuste as credenciais quando necessario."
        onClose={() => setIsAccessModalOpen(false)}
        footer={
          <button type="button" className="secondary" onClick={() => setIsAccessModalOpen(false)}>
            Fechar
          </button>
        }
      >
        <div className="driver-editor-access-modal">
          <div className="driver-editor-access-row driver-editor-access-row-first">
            <div className="driver-editor-access-copy">
              <strong>Acesso do motorista</strong>
              <p className="helper-text">Quando inativo, o motorista nao podera acessar o aplicativo.</p>
            </div>
            <label className="toggle-field compact-toggle driver-editor-access-toggle">
              <span>{appAccessLabel}</span>
              <input type="checkbox" checked={isActive} onChange={(event) => onActiveChange(event.target.checked)} />
            </label>
          </div>

          {!isCreateMode && driverHasPassword && !isResettingPassword ? (
            <div className="driver-editor-access-row driver-editor-access-row-compact">
              <div className="driver-editor-access-copy">
                <strong>Senha configurada</strong>
                <p className="helper-text">Abra a redefinicao apenas quando precisar gerar um novo acesso.</p>
              </div>
              <button type="button" className="secondary driver-editor-inline-action" onClick={onResetPasswordStart}>
                Redefinir senha
              </button>
            </div>
          ) : null}

          {shouldShowPasswordFields ? (
            <div className="driver-editor-access-passwords">
              <div className="form-grid">
                <label>
                  Senha de acesso
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder={mode === "create" || !driverHasPassword ? "Definir senha inicial" : "Nova senha"}
                  />
                </label>
                <label>
                  Confirmar senha
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                    placeholder={mode === "create" || !driverHasPassword ? "Confirmar senha inicial" : "Confirmar nova senha"}
                  />
                </label>
              </div>
              <p className="driver-editor-access-note">{accessMessage}</p>
            </div>
          ) : (
            <p className="driver-editor-access-note">{accessMessage}</p>
          )}
        </div>
      </DriverProfileEditorModal>

    </article>
  );
}
