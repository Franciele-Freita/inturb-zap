"use client";

import { ChangeEvent, useRef, useState } from "react";
import {
  DriverComplianceHistoryItem,
  DriverDocument,
  DriverDocumentCategory,
  DriverLicense,
  DriverPsychotechnical,
  DriverToxicology
} from "../lib/api";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type DriverLicenseState = DriverLicense;
type ToxicologyState = DriverToxicology;
type PsychotechnicalState = DriverPsychotechnical;
type ComplianceExamState = {
  required: boolean;
  examDate?: string;
  expirationDate?: string;
  expiryAlertLeadDays?: number;
};

type DriverProfileEditorComplianceSectionProps = {
  activeSection: DriverEditorSection;
  driverLicense?: DriverLicenseState;
  toxicology?: ToxicologyState;
  additionalDocuments: DriverDocument[];
  complianceHistory: DriverComplianceHistoryItem[];
  onDriverLicenseChange: (value?: DriverLicenseState) => void;
  onAdditionalDocumentsChange: (value: DriverDocument[]) => void;
  onToxicologyChange: (value?: ToxicologyState) => void;
};

type RequiredDocumentStatus = "PENDENTE" | "ENVIADO" | "VENCIDO" | "VALIDO";
type RequiredDocumentCard = {
  category: DriverDocumentCategory;
  label: string;
  required: true;
  status: RequiredDocumentStatus;
  document?: DriverDocument;
};

type RequiredDocumentDraft = {
  id: string;
  category: DriverDocumentCategory;
  title: string;
  expiresAt: string;
  fileName: string;
  fileUrl: string;
  notes: string;
};

const emptyDriverLicense: DriverLicenseState = {
  number: "",
  category: "",
  expirationDate: "",
  firstLicenseDate: "",
  issuingState: "",
  documentPhotoUrl: "",
  expiryAlertLeadDays: 30,
  expiryAlertRepeatDays: 7
};

const emptyPsychotechnical: PsychotechnicalState = {
  required: true,
  examNumber: "",
  examDate: "",
  expirationDate: "",
  situation: undefined,
  restrictionsDescription: "",
  examType: undefined,
  expiryAlertLeadDays: 30,
  expiryAlertRepeatDays: 7,
  clinicName: "",
  clinicCnpj: "",
  psychologistName: "",
  psychologistCrp: "",
  detailedResult: "",
  reportAttachmentName: "",
  reportAttachmentDataUrl: "",
  reportAttachmentMimeType: "",
  notes: ""
};

const emptyToxicology: ToxicologyState = {
  required: true,
  examNumber: "",
  examDate: "",
  expirationDate: "",
  expiryAlertLeadDays: 30,
  expiryAlertRepeatDays: 7,
  clinicName: "",
  clinicCnpj: "",
  reportAttachmentName: "",
  reportAttachmentDataUrl: "",
  reportAttachmentMimeType: "",
  notes: "",
  psychotechnical: emptyPsychotechnical
};

const psychotechnicalSituationOptions = [
  { value: "APTO", label: "Apto" },
  { value: "INAPTO", label: "Inapto" },
  { value: "APTO_COM_RESTRICOES", label: "Apto com restricoes" }
] as const;

const psychotechnicalExamTypeOptions = [
  { value: "INICIAL", label: "Inicial" },
  { value: "RENOVACAO", label: "Renovacao" }
] as const;

const driverLicenseCategoryOptions = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"] as const;

const brazilStateOptions = [
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
] as const;
const requiredDocumentCategories: DriverDocumentCategory[] = ["IDENTIFICATION", "CRIMINAL_RECORD"];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCnpjInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function resolveComplianceExamStatus(state: ComplianceExamState): "VALIDO" | "A_VENCER" | "VENCIDO" | "PENDENTE" | "NAO_OBRIGATORIO" {
  if (!state.required) {
    return "NAO_OBRIGATORIO";
  }

  if (!state.examDate || !state.expirationDate) {
    return "PENDENTE";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expirationDate = new Date(`${state.expirationDate}T00:00:00`);
  if (Number.isNaN(expirationDate.getTime())) {
    return "PENDENTE";
  }

  if (expirationDate < today) {
    return "VENCIDO";
  }

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + Math.max(0, state.expiryAlertLeadDays ?? 30));

  if (expirationDate <= warningDate) {
    return "A_VENCER";
  }

  return "VALIDO";
}

function resolveComplianceExamStatusLabel(status: ReturnType<typeof resolveComplianceExamStatus>): string {
  if (status === "VALIDO") return "Valido";
  if (status === "A_VENCER") return "A vencer";
  if (status === "VENCIDO") return "Vencido";
  if (status === "NAO_OBRIGATORIO") return "Nao obrigatorio";
  return "Pendente";
}

function resolveComplianceExamStatusClassName(status: ReturnType<typeof resolveComplianceExamStatus>): string {
  if (status === "VALIDO") return "status-pill status-pill-success";
  if (status === "A_VENCER") return "status-pill rides-status-pill-warning";
  if (status === "VENCIDO") return "status-pill rides-status-pill-danger";
  return "status-pill";
}

function resolvePsychotechnicalSituationLabel(value?: PsychotechnicalState["situation"]): string {
  if (value === "APTO") return "Apto";
  if (value === "INAPTO") return "Inapto";
  if (value === "APTO_COM_RESTRICOES") return "Apto com restricoes";
  return "Situacao pendente";
}

function resolveDriverLicenseStatusLabel(license: DriverLicenseState): string {
  if (!license.number.trim() || !license.expirationDate.trim()) {
    return "Pendente";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expirationDate = new Date(`${license.expirationDate}T00:00:00`);
  if (Number.isNaN(expirationDate.getTime())) {
    return "Pendente";
  }

  if (expirationDate < today) {
    return "Vencida";
  }

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + Math.max(0, license.expiryAlertLeadDays ?? 30));
  if (expirationDate <= warningDate) {
    return "A vencer";
  }

  return "Valida";
}

function resolveRequiredDocumentLabel(category: DriverDocumentCategory): string {
  if (category === "IDENTIFICATION") return "Identificacao";
  if (category === "CRIMINAL_RECORD") return "Antecedentes";
  if (category === "RESIDENCE_PROOF") return "Comprovante de residencia";
  if (category === "TRAINING") return "Treinamento";
  return "Outro documento";
}

function isDateExpired(value?: string): boolean {
  if (!value?.trim()) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function resolveRequiredDocumentStatus(document?: DriverDocument): RequiredDocumentStatus {
  if (!document) return "PENDENTE";
  if (!document.fileUrl?.trim()) return "PENDENTE";
  if (isDateExpired(document.expiresAt)) return "VENCIDO";
  if (!document.expiresAt?.trim()) return "ENVIADO";
  return "VALIDO";
}

function resolveRequiredDocumentStatusLabel(status: RequiredDocumentStatus): string {
  if (status === "PENDENTE") return "Pendente";
  if (status === "ENVIADO") return "Enviado";
  if (status === "VENCIDO") return "Vencido";
  return "Valido";
}

function resolveRequiredDocumentStatusClassName(status: RequiredDocumentStatus): string {
  if (status === "VENCIDO") return "status-pill rides-status-pill-danger";
  if (status === "PENDENTE") return "status-pill";
  if (status === "ENVIADO") return "status-pill rides-status-pill-warning";
  return "status-pill status-pill-success";
}

export function DriverProfileEditorComplianceSection({
  activeSection,
  driverLicense,
  toxicology,
  additionalDocuments,
  complianceHistory,
  onDriverLicenseChange,
  onAdditionalDocumentsChange,
  onToxicologyChange
}: DriverProfileEditorComplianceSectionProps) {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isToxicologyModalOpen, setIsToxicologyModalOpen] = useState(false);
  const [isPsychotechnicalModalOpen, setIsPsychotechnicalModalOpen] = useState(false);
  const [isRequiredDocumentModalOpen, setIsRequiredDocumentModalOpen] = useState(false);
  const [draftDriverLicense, setDraftDriverLicense] = useState<DriverLicenseState>(emptyDriverLicense);
  const [draftToxicology, setDraftToxicology] = useState<ToxicologyState>(emptyToxicology);
  const [draftPsychotechnical, setDraftPsychotechnical] = useState<PsychotechnicalState>(emptyPsychotechnical);
  const [draftRequiredDocument, setDraftRequiredDocument] = useState<RequiredDocumentDraft>({
    id: "",
    category: "IDENTIFICATION",
    title: "",
    expiresAt: "",
    fileName: "",
    fileUrl: "",
    notes: ""
  });
  const [licensePhotoError, setLicensePhotoError] = useState("");
  const licensePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [toxicologyReportError, setToxicologyReportError] = useState("");
  const toxicologyReportInputRef = useRef<HTMLInputElement | null>(null);
  const [psychotechnicalReportError, setPsychotechnicalReportError] = useState("");
  const psychotechnicalReportInputRef = useRef<HTMLInputElement | null>(null);
  const [requiredDocumentError, setRequiredDocumentError] = useState("");
  const requiredDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const currentLicense = driverLicense ?? emptyDriverLicense;
  const currentToxicology = toxicology
    ? {
        ...emptyToxicology,
        ...toxicology,
        psychotechnical: {
          ...emptyPsychotechnical,
          ...(toxicology.psychotechnical ?? {})
        }
      }
    : emptyToxicology;
  const currentPsychotechnical = currentToxicology.psychotechnical ?? emptyPsychotechnical;

  const hasDriverLicense = draftDriverLicense.number.trim().length > 0 && draftDriverLicense.expirationDate.trim().length > 0;
  const driverLicenseStatusLabel = resolveDriverLicenseStatusLabel(currentLicense);
  const toxicologyStatus = resolveComplianceExamStatus(currentToxicology);
  const toxicologyStatusLabel = resolveComplianceExamStatusLabel(toxicologyStatus);
  const draftToxicologyStatus = resolveComplianceExamStatus(draftToxicology);
  const draftToxicologyStatusLabel = resolveComplianceExamStatusLabel(draftToxicologyStatus);
  const psychotechnicalSituationLabel = resolvePsychotechnicalSituationLabel(currentPsychotechnical.situation);
  const draftPsychotechnicalStatus = resolveComplianceExamStatus(draftPsychotechnical);
  const draftPsychotechnicalStatusLabel = resolveComplianceExamStatusLabel(draftPsychotechnicalStatus);
  const requiredDocumentCards: RequiredDocumentCard[] = requiredDocumentCategories.map((category) => {
    const document = additionalDocuments.find((item) => item.category === category);
    return {
      category,
      label: resolveRequiredDocumentLabel(category),
      required: true,
      status: resolveRequiredDocumentStatus(document),
      document
    };
  });
  const draftRequiredDocumentStatus = resolveRequiredDocumentStatus(
    draftRequiredDocument.fileUrl.trim()
      ? {
          id: draftRequiredDocument.id,
          category: draftRequiredDocument.category,
          title: draftRequiredDocument.title,
          fileName: draftRequiredDocument.fileName,
          fileUrl: draftRequiredDocument.fileUrl,
          expiresAt: draftRequiredDocument.expiresAt || undefined,
          notes: draftRequiredDocument.notes || undefined,
          status: "VALID"
        }
      : undefined
  );

  function openLicenseModal() {
    setDraftDriverLicense({
      ...currentLicense,
      expiryAlertLeadDays: currentLicense.expiryAlertLeadDays ?? 30,
      expiryAlertRepeatDays: currentLicense.expiryAlertRepeatDays ?? 7
    });
    setLicensePhotoError("");
    setIsLicenseModalOpen(true);
  }

  function openToxicologyModal() {
    setDraftToxicology({
      ...currentToxicology,
      expiryAlertLeadDays: currentToxicology.expiryAlertLeadDays ?? 30,
      expiryAlertRepeatDays: currentToxicology.expiryAlertRepeatDays ?? 7,
      clinicCnpj: formatCnpjInput(currentToxicology.clinicCnpj ?? "")
    });
    setToxicologyReportError("");
    setIsToxicologyModalOpen(true);
  }

  function openPsychotechnicalModal() {
    setDraftPsychotechnical({
      ...currentPsychotechnical,
      expiryAlertLeadDays: currentPsychotechnical.expiryAlertLeadDays ?? 30,
      expiryAlertRepeatDays: currentPsychotechnical.expiryAlertRepeatDays ?? 7,
      clinicCnpj: formatCnpjInput(currentPsychotechnical.clinicCnpj ?? "")
    });
    setPsychotechnicalReportError("");
    setIsPsychotechnicalModalOpen(true);
  }

  function openRequiredDocumentModal(category: DriverDocumentCategory) {
    const existing = additionalDocuments.find((item) => item.category === category);
    setDraftRequiredDocument({
      id: existing?.id ?? "",
      category,
      title: existing?.title ?? resolveRequiredDocumentLabel(category),
      expiresAt: existing?.expiresAt ?? "",
      fileName: existing?.fileName ?? "",
      fileUrl: existing?.fileUrl ?? "",
      notes: existing?.notes ?? ""
    });
    setRequiredDocumentError("");
    setIsRequiredDocumentModalOpen(true);
  }

  function openRequiredDocumentFilePicker() {
    requiredDocumentInputRef.current?.click();
  }

  function clearRequiredDocumentFile() {
    setDraftRequiredDocument((current) => ({
      ...current,
      fileName: "",
      fileUrl: ""
    }));
    setRequiredDocumentError("");
  }

  function handleRequiredDocumentFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setRequiredDocumentError("Anexe um PDF ou imagem valida.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setRequiredDocumentError("O arquivo deve ter no maximo 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setRequiredDocumentError("Nao foi possivel ler o arquivo selecionado.");
        return;
      }
      setDraftRequiredDocument((current) => ({
        ...current,
        fileName: file.name,
        fileUrl: result
      }));
      setRequiredDocumentError("");
    };
    reader.onerror = () => {
      setRequiredDocumentError("Nao foi possivel carregar o documento.");
    };
    reader.readAsDataURL(file);
  }

  function saveDriverLicense() {
    onDriverLicenseChange(draftDriverLicense.number.trim() ? draftDriverLicense : undefined);
    setIsLicenseModalOpen(false);
  }

  function openLicensePhotoPicker() {
    licensePhotoInputRef.current?.click();
  }

  function clearLicensePhoto() {
    setDraftDriverLicense((current) => ({ ...current, documentPhotoUrl: "" }));
    setLicensePhotoError("");
  }

  function handleLicensePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLicensePhotoError("Selecione um arquivo de imagem valido.");
      return;
    }

    const maxFileSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setLicensePhotoError("A imagem deve ter no maximo 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setLicensePhotoError("Nao foi possivel ler a imagem selecionada.");
        return;
      }

      setDraftDriverLicense((current) => ({ ...current, documentPhotoUrl: result }));
      setLicensePhotoError("");
    };
    reader.onerror = () => {
      setLicensePhotoError("Nao foi possivel carregar a imagem.");
    };
    reader.readAsDataURL(file);
  }

  function openToxicologyReportPicker() {
    toxicologyReportInputRef.current?.click();
  }

  function clearToxicologyReport() {
    setDraftToxicology((current) => ({
      ...current,
      reportAttachmentName: "",
      reportAttachmentDataUrl: "",
      reportAttachmentMimeType: ""
    }));
    setToxicologyReportError("");
  }

  function handleToxicologyReportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setToxicologyReportError("Anexe um PDF ou imagem valida.");
      return;
    }

    const maxFileSizeBytes = 8 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setToxicologyReportError("O arquivo deve ter no maximo 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setToxicologyReportError("Nao foi possivel ler o arquivo selecionado.");
        return;
      }

      setDraftToxicology((current) => ({
        ...current,
        reportAttachmentName: file.name,
        reportAttachmentDataUrl: result,
        reportAttachmentMimeType: file.type || undefined
      }));
      setToxicologyReportError("");
    };
    reader.onerror = () => {
      setToxicologyReportError("Nao foi possivel carregar o anexo.");
    };
    reader.readAsDataURL(file);
  }

  function openPsychotechnicalReportPicker() {
    psychotechnicalReportInputRef.current?.click();
  }

  function clearPsychotechnicalReport() {
    setDraftPsychotechnical((current) => ({
      ...current,
      reportAttachmentName: "",
      reportAttachmentDataUrl: "",
      reportAttachmentMimeType: ""
    }));
    setPsychotechnicalReportError("");
  }

  function handlePsychotechnicalReportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setPsychotechnicalReportError("Anexe um PDF ou imagem valida.");
      return;
    }

    const maxFileSizeBytes = 8 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setPsychotechnicalReportError("O arquivo deve ter no maximo 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setPsychotechnicalReportError("Nao foi possivel ler o arquivo selecionado.");
        return;
      }

      setDraftPsychotechnical((current) => ({
        ...current,
        reportAttachmentName: file.name,
        reportAttachmentDataUrl: result,
        reportAttachmentMimeType: file.type || undefined
      }));
      setPsychotechnicalReportError("");
    };
    reader.onerror = () => {
      setPsychotechnicalReportError("Nao foi possivel carregar o anexo.");
    };
    reader.readAsDataURL(file);
  }

  function saveToxicology() {
    onToxicologyChange(draftToxicology);
    setIsToxicologyModalOpen(false);
  }

  function savePsychotechnical() {
    onToxicologyChange({
      ...currentToxicology,
      psychotechnical: {
        ...draftPsychotechnical,
        restrictionsDescription:
          draftPsychotechnical.situation === "APTO_COM_RESTRICOES"
            ? draftPsychotechnical.restrictionsDescription
            : ""
      }
    });
    setIsPsychotechnicalModalOpen(false);
  }

  function saveRequiredDocument() {
    if (!draftRequiredDocument.title.trim()) {
      setRequiredDocumentError("Informe o titulo do documento.");
      return;
    }
    if (!draftRequiredDocument.fileUrl.trim()) {
      setRequiredDocumentError("Anexe o documento antes de salvar.");
      return;
    }

    const status = resolveRequiredDocumentStatus({
      id: draftRequiredDocument.id || `doc-${Date.now()}`,
      category: draftRequiredDocument.category,
      title: draftRequiredDocument.title.trim(),
      fileName: draftRequiredDocument.fileName.trim(),
      fileUrl: draftRequiredDocument.fileUrl.trim(),
      issuedAt: new Date().toISOString().slice(0, 10),
      expiresAt: draftRequiredDocument.expiresAt || undefined,
      notes: draftRequiredDocument.notes.trim() || undefined,
      status: "VALID"
    });

    const payload: DriverDocument = {
      id: draftRequiredDocument.id || `doc-${Date.now()}`,
      category: draftRequiredDocument.category,
      title: draftRequiredDocument.title.trim(),
      fileName: draftRequiredDocument.fileName.trim(),
      fileUrl: draftRequiredDocument.fileUrl.trim(),
      issuedAt: new Date().toISOString().slice(0, 10),
      expiresAt: draftRequiredDocument.expiresAt || undefined,
      notes: draftRequiredDocument.notes.trim() || undefined,
      status:
        status === "PENDENTE"
          ? "PENDING_REVIEW"
          : status === "VENCIDO"
            ? "EXPIRED"
            : "VALID"
    };

    const withoutCategory = additionalDocuments.filter((item) => item.category !== draftRequiredDocument.category);
    onAdditionalDocumentsChange([payload, ...withoutCategory]);
    setIsRequiredDocumentModalOpen(false);
    setRequiredDocumentError("");
  }

  return (
    <article
      id="driver-editor-compliance"
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "compliance" ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">02</span>
        <div className="panel-head">
          <h2>CNH e conformidade</h2>
          <span>Documentacao do motorista, vencimentos e obrigacoes de conformidade.</span>
        </div>
      </div>

      <div className="driver-editor-compliance-tabs">
        <button
          type="button"
          className={`driver-editor-compliance-tab ${activeTab === "current" ? "is-active" : ""}`}
          onClick={() => setActiveTab("current")}
        >
          Estado atual
        </button>
        <button
          type="button"
          className={`driver-editor-compliance-tab ${activeTab === "history" ? "is-active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Historico
        </button>
      </div>

      {activeTab === "current" ? (
        <>
          <div className="driver-editor-summary-strip driver-editor-compliance-summary-grid">
            <article className="driver-editor-summary-card">
              <span>CNH</span>
              <strong>{driverLicenseStatusLabel}</strong>
              <button type="button" className="secondary" onClick={openLicenseModal}>
                {currentLicense.number.trim() ? "Editar CNH" : "Adicionar CNH"}
              </button>
            </article>
            <article className="driver-editor-summary-card">
              <span>Toxicologico</span>
              <strong>{toxicologyStatusLabel}</strong>
              <button type="button" className="secondary" onClick={openToxicologyModal}>
                Editar exame
              </button>
            </article>
            <article className="driver-editor-summary-card">
              <span>Psicotecnico</span>
              <strong>{currentPsychotechnical.required ? psychotechnicalSituationLabel : "Nao obrigatorio"}</strong>
              <button type="button" className="secondary" onClick={openPsychotechnicalModal}>
                Editar exame
              </button>
            </article>
          </div>
          <div className="driver-editor-block driver-editor-compliance-required-block">
            <div className="driver-editor-block-head">
              <strong>Documentos e pendencias</strong>
              <p className="helper-text">
                Itens obrigatorios para liberar o motorista na operacao.
              </p>
            </div>
            <div className="driver-editor-summary-strip driver-editor-compliance-summary-grid">
              {requiredDocumentCards.map((card) => (
                <article key={card.category} className="driver-editor-summary-card">
                  <span>{card.label}</span>
                  <strong>{card.required ? "Obrigatorio" : "Opcional"}</strong>
                  <small className={resolveRequiredDocumentStatusClassName(card.status)}>
                    {resolveRequiredDocumentStatusLabel(card.status)}
                  </small>
                  <small>
                    Validade:{" "}
                    {card.document?.expiresAt
                      ? new Date(`${card.document.expiresAt}T00:00:00`).toLocaleDateString("pt-BR")
                      : "Nao informada"}
                  </small>
                  <div className="driver-editor-summary-card-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => openRequiredDocumentModal(card.category)}
                    >
                      {card.document ? "Editar documento" : "Anexar documento"}
                    </button>
                    {card.document?.fileUrl ? (
                      <a
                        href={card.document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="driver-editor-summary-link"
                      >
                        Ver documento
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="driver-editor-history-panel">
          {complianceHistory.length > 0 ? (
            <div className="timeline">
              {complianceHistory.map((event) => (
                <article key={event.id} className="timeline-item driver-editor-history-item">
                  <span className="timeline-bullet driver-editor-history-bullet" aria-hidden="true" />
                  <div className="driver-editor-history-copy">
                    <strong>{event.title}</strong>
                    <span>{event.meta}</span>
                    <p>{event.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Nenhum evento de conformidade.</strong>
              <p>As alteracoes de CNH, exames e documentos obrigatorios aparecerao aqui.</p>
            </div>
          )}
        </div>
      )}

      <DriverProfileEditorModal
        open={isLicenseModalOpen}
        title="CNH do motorista"
        description="Cadastre os dados principais da carteira para acompanhamento e alertas."
        onClose={() => setIsLicenseModalOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setIsLicenseModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={saveDriverLicense} disabled={!hasDriverLicense}>
              Salvar CNH
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label>
            Numero da CNH
            <input
              value={draftDriverLicense.number}
              onChange={(event) => setDraftDriverLicense((current) => ({ ...current, number: event.target.value }))}
              placeholder="Numero do documento"
            />
          </label>
          <label>
            Categoria
            <select
              className="select"
              value={draftDriverLicense.category}
              onChange={(event) => setDraftDriverLicense((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Selecionar categoria</option>
              {driverLicenseCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vencimento
            <input
              type="date"
              value={draftDriverLicense.expirationDate}
              onChange={(event) => setDraftDriverLicense((current) => ({ ...current, expirationDate: event.target.value }))}
            />
          </label>
          <label>
            Primeira habilitacao
            <input
              type="date"
              value={draftDriverLicense.firstLicenseDate}
              onChange={(event) => setDraftDriverLicense((current) => ({ ...current, firstLicenseDate: event.target.value }))}
            />
          </label>
          <label>
            UF de emissao
            <select
              className="select"
              value={draftDriverLicense.issuingState}
              onChange={(event) => setDraftDriverLicense((current) => ({ ...current, issuingState: event.target.value }))}
            >
              <option value="">Selecionar UF</option>
              {brazilStateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label>
            Avisar quantos dias antes do vencimento
            <input
              type="number"
              min={0}
              value={draftDriverLicense.expiryAlertLeadDays ?? ""}
              onChange={(event) =>
                setDraftDriverLicense((current) => ({
                  ...current,
                  expiryAlertLeadDays:
                    event.target.value.trim().length === 0 ? undefined : Math.max(0, Number(event.target.value))
                }))
              }
              placeholder="Ex.: 30"
            />
          </label>
          <label>
            Repetir notificacao a cada quantos dias
            <input
              type="number"
              min={1}
              value={draftDriverLicense.expiryAlertRepeatDays ?? ""}
              onChange={(event) =>
                setDraftDriverLicense((current) => ({
                  ...current,
                  expiryAlertRepeatDays:
                    event.target.value.trim().length === 0 ? undefined : Math.max(1, Number(event.target.value))
                }))
              }
              placeholder="Ex.: 7"
            />
          </label>
          <div className="driver-editor-modal-field-full driver-editor-license-photo-field">
            <span>Foto do documento</span>
            <div className="driver-editor-license-photo-row">
              <div className="driver-editor-license-photo-preview" aria-hidden="true">
                {draftDriverLicense.documentPhotoUrl ? <img src={draftDriverLicense.documentPhotoUrl} alt="" /> : <strong>CNH</strong>}
              </div>
              <div className="driver-editor-license-photo-copy">
                <p className="helper-text">Anexe a foto da CNH para consulta rapida durante validacoes.</p>
                <div className="driver-editor-license-photo-actions">
                  <input
                    ref={licensePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLicensePhotoChange}
                    className="driver-editor-photo-input"
                  />
                  <button type="button" className="secondary" onClick={openLicensePhotoPicker}>
                    {draftDriverLicense.documentPhotoUrl ? "Trocar foto" : "Anexar documento"}
                  </button>
                  {draftDriverLicense.documentPhotoUrl ? (
                    <button type="button" className="secondary" onClick={clearLicensePhoto}>
                      Remover
                    </button>
                  ) : null}
                </div>
                {licensePhotoError ? <small className="driver-editor-photo-error">{licensePhotoError}</small> : null}
              </div>
            </div>
          </div>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isToxicologyModalOpen}
        title="Exame toxicologico"
        description="Controle a obrigatoriedade, a validade e o status do exame do motorista."
        onClose={() => setIsToxicologyModalOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setIsToxicologyModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={saveToxicology}>
              Salvar exame
            </button>
          </>
        }
      >
        <div className="form-grid driver-editor-toxicology-grid">
          <label className="driver-editor-modal-toggle-inline driver-editor-modal-field-full">
            <div>
              <strong>Exame obrigatorio</strong>
              <small>Marque quando esse exame for exigido para o motorista.</small>
            </div>
            <input
              type="checkbox"
              checked={draftToxicology.required}
              onChange={(event) => setDraftToxicology((current) => ({ ...current, required: event.target.checked }))}
            />
          </label>
          <label>
            Numero do exame
            <input
              value={draftToxicology.examNumber ?? ""}
              onChange={(event) => setDraftToxicology((current) => ({ ...current, examNumber: event.target.value }))}
              placeholder="Ex.: TX-2026-0001"
            />
          </label>
          <label>
            Data do exame
            <input
              type="date"
              value={draftToxicology.examDate ?? ""}
              onChange={(event) => setDraftToxicology((current) => ({ ...current, examDate: event.target.value }))}
            />
          </label>
          <label>
            Validade
            <input
              type="date"
              value={draftToxicology.expirationDate ?? ""}
              onChange={(event) => setDraftToxicology((current) => ({ ...current, expirationDate: event.target.value }))}
            />
          </label>
          <label>
            Avisar quantos dias antes do vencimento
            <input
              type="number"
              min={0}
              value={draftToxicology.expiryAlertLeadDays ?? ""}
              onChange={(event) =>
                setDraftToxicology((current) => ({
                  ...current,
                  expiryAlertLeadDays:
                    event.target.value.trim().length === 0 ? undefined : Math.max(0, Number(event.target.value))
                }))
              }
              placeholder="Ex.: 30"
            />
          </label>
          <label>
            Repetir notificacao a cada quantos dias
            <input
              type="number"
              min={1}
              value={draftToxicology.expiryAlertRepeatDays ?? ""}
              onChange={(event) =>
                setDraftToxicology((current) => ({
                  ...current,
                  expiryAlertRepeatDays:
                    event.target.value.trim().length === 0 ? undefined : Math.max(1, Number(event.target.value))
                }))
              }
              placeholder="Ex.: 7"
            />
          </label>
          <label>
            Nome da clinica
            <input
              value={draftToxicology.clinicName ?? ""}
              onChange={(event) => setDraftToxicology((current) => ({ ...current, clinicName: event.target.value }))}
              placeholder="Ex.: Laboratorio Sao Lucas"
            />
          </label>
          <label>
            CNPJ da clinica
            <input
              value={draftToxicology.clinicCnpj ?? ""}
              onChange={(event) =>
                setDraftToxicology((current) => ({
                  ...current,
                  clinicCnpj: formatCnpjInput(event.target.value)
                }))
              }
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </label>
          <div className="driver-editor-modal-field-full driver-editor-license-photo-field">
            <span>Anexo do documento</span>
            <div className="driver-editor-license-photo-row">
              <div className="driver-editor-license-photo-preview" aria-hidden="true">
                {draftToxicology.reportAttachmentDataUrl ? (
                  draftToxicology.reportAttachmentMimeType === "application/pdf" ? (
                    <strong>PDF</strong>
                  ) : (
                    <img src={draftToxicology.reportAttachmentDataUrl} alt="" />
                  )
                ) : (
                  <strong>DOC</strong>
                )}
              </div>
              <div className="driver-editor-license-photo-copy">
                <p className="helper-text">
                  Documento do exame (
                  {draftToxicology.reportAttachmentName?.trim()
                    ? draftToxicology.reportAttachmentName.trim()
                    : "PDF ou imagem pendente"}
                  ).
                </p>
                <div className="driver-editor-license-photo-actions">
                  <input
                    ref={toxicologyReportInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleToxicologyReportChange}
                    className="driver-editor-photo-input"
                  />
                  <button type="button" className="secondary" onClick={openToxicologyReportPicker}>
                    {draftToxicology.reportAttachmentDataUrl ? "Trocar anexo" : "Anexar documento"}
                  </button>
                  {draftToxicology.reportAttachmentDataUrl ? (
                    <button type="button" className="secondary" onClick={clearToxicologyReport}>
                      Remover
                    </button>
                  ) : null}
                </div>
                {toxicologyReportError ? <small className="driver-editor-photo-error">{toxicologyReportError}</small> : null}
              </div>
            </div>
          </div>
          <div className="driver-editor-modal-field-full driver-editor-modal-status-inline">
            <span>Status calculado automaticamente</span>
            <strong className={resolveComplianceExamStatusClassName(draftToxicologyStatus)}>{draftToxicologyStatusLabel}</strong>
          </div>
          <label className="driver-editor-modal-field-full">
            Observacoes
            <textarea
              rows={4}
              value={draftToxicology.notes ?? ""}
              onChange={(event) => setDraftToxicology((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Informacoes complementares sobre laudo, renovacao ou pendencias."
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isPsychotechnicalModalOpen}
        title="Exame psicotecnico"
        description="Controle a obrigatoriedade, a validade e o status do exame psicotecnico."
        onClose={() => setIsPsychotechnicalModalOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setIsPsychotechnicalModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={savePsychotechnical}>
              Salvar exame
            </button>
          </>
        }
      >
        <div className="form-grid driver-editor-toxicology-grid">
          <label className="driver-editor-modal-toggle-inline driver-editor-modal-field-full">
            <div>
              <strong>Exame obrigatorio</strong>
              <small>Marque quando esse exame for exigido para o motorista.</small>
            </div>
            <input
              type="checkbox"
              checked={draftPsychotechnical.required}
              onChange={(event) => setDraftPsychotechnical((current) => ({ ...current, required: event.target.checked }))}
            />
          </label>
          <label>
            Data de realizacao
            <input
              type="date"
              value={draftPsychotechnical.examDate ?? ""}
              onChange={(event) => setDraftPsychotechnical((current) => ({ ...current, examDate: event.target.value }))}
            />
          </label>
          <label>
            Data de validade
            <input
              type="date"
              value={draftPsychotechnical.expirationDate ?? ""}
              onChange={(event) => setDraftPsychotechnical((current) => ({ ...current, expirationDate: event.target.value }))}
            />
          </label>
          <label>
            Situacao
            <select
              className="select"
              value={draftPsychotechnical.situation ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({
                  ...current,
                  situation: (event.target.value || undefined) as PsychotechnicalState["situation"]
                }))
              }
            >
              <option value="">Selecionar situacao</option>
              {psychotechnicalSituationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de exame
            <select
              className="select"
              value={draftPsychotechnical.examType ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({
                  ...current,
                  examType: (event.target.value || undefined) as PsychotechnicalState["examType"]
                }))
              }
            >
              <option value="">Selecionar tipo</option>
              {psychotechnicalExamTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {draftPsychotechnical.situation === "APTO_COM_RESTRICOES" ? (
            <label className="driver-editor-modal-field-full">
              Descrever restricoes
              <textarea
                rows={3}
                value={draftPsychotechnical.restrictionsDescription ?? ""}
                onChange={(event) =>
                  setDraftPsychotechnical((current) => ({ ...current, restrictionsDescription: event.target.value }))
                }
                placeholder="Detalhe as restricoes identificadas no exame."
              />
            </label>
          ) : null}
          <label>
            Avisar quantos dias antes do vencimento
            <input
              type="number"
              min={0}
              value={draftPsychotechnical.expiryAlertLeadDays ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({
                  ...current,
                  expiryAlertLeadDays:
                    event.target.value.trim().length === 0 ? undefined : Math.max(0, Number(event.target.value))
                }))
              }
              placeholder="Ex.: 30"
            />
          </label>
          <label>
            Repetir notificacao a cada quantos dias
            <input
              type="number"
              min={1}
              value={draftPsychotechnical.expiryAlertRepeatDays ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({
                  ...current,
                  expiryAlertRepeatDays:
                    event.target.value.trim().length === 0 ? undefined : Math.max(1, Number(event.target.value))
                }))
              }
              placeholder="Ex.: 7"
            />
          </label>
          <label>
            Nome da clinica
            <input
              value={draftPsychotechnical.clinicName ?? ""}
              onChange={(event) => setDraftPsychotechnical((current) => ({ ...current, clinicName: event.target.value }))}
              placeholder="Ex.: Clinica Sao Lucas"
            />
          </label>
          <label>
            CNPJ da clinica
            <input
              value={draftPsychotechnical.clinicCnpj ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({
                  ...current,
                  clinicCnpj: formatCnpjInput(event.target.value)
                }))
              }
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </label>
          <label>
            Nome do psicologo responsavel
            <input
              value={draftPsychotechnical.psychologistName ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({ ...current, psychologistName: event.target.value }))
              }
              placeholder="Nome completo do profissional"
            />
          </label>
          <label>
            CRP (registro do psicologo)
            <input
              value={draftPsychotechnical.psychologistCrp ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({ ...current, psychologistCrp: event.target.value }))
              }
              placeholder="Ex.: 06/123456"
            />
          </label>
          <label className="driver-editor-modal-field-full">
            Resultado detalhado
            <textarea
              rows={4}
              value={draftPsychotechnical.detailedResult ?? ""}
              onChange={(event) =>
                setDraftPsychotechnical((current) => ({ ...current, detailedResult: event.target.value }))
              }
              placeholder="Descreva o resultado e observacoes relevantes do exame."
            />
          </label>
          <div className="driver-editor-modal-field-full driver-editor-license-photo-field">
            <span>Anexos</span>
            <div className="driver-editor-license-photo-row">
              <div className="driver-editor-license-photo-preview" aria-hidden="true">
                {draftPsychotechnical.reportAttachmentDataUrl ? (
                  draftPsychotechnical.reportAttachmentMimeType === "application/pdf" ? (
                    <strong>PDF</strong>
                  ) : (
                    <img src={draftPsychotechnical.reportAttachmentDataUrl} alt="" />
                  )
                ) : (
                  <strong>LAUDO</strong>
                )}
              </div>
              <div className="driver-editor-license-photo-copy">
                <p className="helper-text">
                  Laudo do exame (
                  {draftPsychotechnical.reportAttachmentName?.trim()
                    ? draftPsychotechnical.reportAttachmentName.trim()
                    : "PDF ou imagem pendente"}
                  ).
                </p>
                <div className="driver-editor-license-photo-actions">
                  <input
                    ref={psychotechnicalReportInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handlePsychotechnicalReportChange}
                    className="driver-editor-photo-input"
                  />
                  <button type="button" className="secondary" onClick={openPsychotechnicalReportPicker}>
                    {draftPsychotechnical.reportAttachmentDataUrl ? "Trocar laudo" : "Anexar laudo"}
                  </button>
                  {draftPsychotechnical.reportAttachmentDataUrl ? (
                    <button type="button" className="secondary" onClick={clearPsychotechnicalReport}>
                      Remover
                    </button>
                  ) : null}
                </div>
                {psychotechnicalReportError ? (
                  <small className="driver-editor-photo-error">{psychotechnicalReportError}</small>
                ) : null}
              </div>
            </div>
          </div>
          <div className="driver-editor-modal-field-full driver-editor-modal-status-inline">
            <span>Status de validade calculado automaticamente</span>
            <strong className={resolveComplianceExamStatusClassName(draftPsychotechnicalStatus)}>{draftPsychotechnicalStatusLabel}</strong>
          </div>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isRequiredDocumentModalOpen}
        title="Documento obrigatorio"
        description="Anexe o documento e informe a validade quando houver."
        onClose={() => setIsRequiredDocumentModalOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setIsRequiredDocumentModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={saveRequiredDocument}>
              Salvar documento
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label>
            Categoria do documento
            <select
              className="select"
              value={draftRequiredDocument.category}
              onChange={(event) =>
                setDraftRequiredDocument((current) => ({
                  ...current,
                  category: event.target.value as DriverDocumentCategory
                }))
              }
            >
              <option value="IDENTIFICATION">Identificacao</option>
              <option value="CRIMINAL_RECORD">Antecedentes</option>
              <option value="RESIDENCE_PROOF">Comprovante de residencia</option>
              <option value="TRAINING">Treinamento</option>
              <option value="OTHER">Outros</option>
            </select>
          </label>
          <label>
            Titulo do documento
            <input
              value={draftRequiredDocument.title}
              onChange={(event) =>
                setDraftRequiredDocument((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Ex.: Documento de identificacao oficial"
            />
          </label>
          <label>
            Data de validade (opcional)
            <input
              type="date"
              value={draftRequiredDocument.expiresAt}
              onChange={(event) =>
                setDraftRequiredDocument((current) => ({ ...current, expiresAt: event.target.value }))
              }
            />
          </label>
          <div className="driver-editor-modal-field-full driver-editor-license-photo-field">
            <span>Anexo</span>
            <div className="driver-editor-license-photo-row">
              <div className="driver-editor-license-photo-preview" aria-hidden="true">
                {draftRequiredDocument.fileUrl ? <strong>DOC</strong> : <strong>PDF</strong>}
              </div>
              <div className="driver-editor-license-photo-copy">
                <p className="helper-text">
                  {draftRequiredDocument.fileName.trim()
                    ? draftRequiredDocument.fileName.trim()
                    : "PDF ou imagem pendente"}
                </p>
                <div className="driver-editor-license-photo-actions">
                  <input
                    ref={requiredDocumentInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleRequiredDocumentFileChange}
                    className="driver-editor-photo-input"
                  />
                  <button type="button" className="secondary" onClick={openRequiredDocumentFilePicker}>
                    {draftRequiredDocument.fileUrl ? "Trocar anexo" : "Anexar documento"}
                  </button>
                  {draftRequiredDocument.fileUrl ? (
                    <button type="button" className="secondary" onClick={clearRequiredDocumentFile}>
                      Remover
                    </button>
                  ) : null}
                </div>
                {requiredDocumentError ? <small className="driver-editor-photo-error">{requiredDocumentError}</small> : null}
              </div>
            </div>
          </div>
          <label className="driver-editor-modal-field-full">
            Observacoes (opcional)
            <textarea
              rows={3}
              value={draftRequiredDocument.notes}
              onChange={(event) =>
                setDraftRequiredDocument((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Observacoes internas sobre o documento."
            />
          </label>
          <div className="driver-editor-modal-field-full driver-editor-modal-status-inline">
            <span>Status calculado automaticamente</span>
            <strong className={resolveRequiredDocumentStatusClassName(draftRequiredDocumentStatus)}>
              {resolveRequiredDocumentStatusLabel(draftRequiredDocumentStatus)}
            </strong>
          </div>
        </div>
      </DriverProfileEditorModal>
    </article>
  );
}

