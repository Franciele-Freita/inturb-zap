"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import {
  DriverAddress,
  CompanyProfileConfig,
  DriverContract,
  DriverContractProfile,
  DriverEmploymentContract,
  DriverEmploymentContractEndorsementType,
  DriverJourney,
  DriverEmploymentContractStatus,
  request
} from "../lib/api";
import { type DocumentTemplate, loadDocumentTemplates } from "../lib/document-templates";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type DriverProfileEditorContractsSectionProps = {
  activeSection: DriverEditorSection;
  mode: "create" | "edit";
  driverId?: string;
  driverName: string;
  driverEmail?: string;
  address?: DriverAddress;
  contractProfile: DriverContractProfile;
  contract?: DriverContract;
  journey?: DriverJourney;
  onContractChange: (next: DriverContract | undefined) => void;
  isGeneratingContract: boolean;
  isRenewingContract: boolean;
  isActivatingContract: boolean;
  isRequestingSignature: boolean;
  isCreatingEndorsement: boolean;
  isTerminatingContract: boolean;
  onGenerateContract: (payload?: {
    templateKey?: string;
    templateName?: string;
    templateVersion?: string;
    templateContent?: string;
  }) => Promise<void>;
  onRenewContract: (
    contractId: string,
    payload?: {
      templateKey?: string;
      templateName?: string;
      templateVersion?: string;
      templateContent?: string;
      contract?: Partial<DriverContract>;
      journey?: Partial<DriverJourney>;
    }
  ) => Promise<void>;
  onActivateContract: (contractId: string) => Promise<void>;
  onRequestSignature: (contractId: string) => Promise<void>;
  onTerminateContract: (
    contractId: string,
    payload: {
      mode: "CANCEL" | "FINALIZE";
      reason?: string;
    }
  ) => Promise<void>;
  onCreateEndorsement: (contractId: string, payload: {
    type: DriverEmploymentContractEndorsementType;
    effectiveDate: string;
    notes?: string;
    applySettings?: boolean;
    contract?: Partial<DriverContract>;
    journey?: Partial<DriverJourney>;
  }) => Promise<void>;
};

type ContractReadiness = {
  eligible: boolean;
  reasons: string[];
};

type ContractTemplateOption = {
  key: string;
  name: string;
  version: string;
};

type ContractsTab = "CURRENT" | "HISTORY";
type TemplatePreviewState = {
  title: string;
  description: string;
  content: string;
};

export function DriverProfileEditorContractsSection({
  activeSection,
  mode,
  driverId,
  driverName,
  driverEmail,
  address,
  contractProfile,
  contract,
  journey,
  onContractChange,
  isGeneratingContract,
  isRenewingContract,
  isActivatingContract,
  isRequestingSignature,
  isCreatingEndorsement,
  isTerminatingContract,
  onGenerateContract,
  onRenewContract,
  onActivateContract,
  onRequestSignature,
  onTerminateContract,
  onCreateEndorsement
}: DriverProfileEditorContractsSectionProps) {
  const [selectedContract, setSelectedContract] = useState<DriverEmploymentContract | null>(null);
  const [selectedContractPrintHtml, setSelectedContractPrintHtml] = useState("");
  const [isBuildingContractPreview, setIsBuildingContractPreview] = useState(false);
  const [isEndorsementModalOpen, setIsEndorsementModalOpen] = useState(false);
  const [endorsementType, setEndorsementType] = useState<DriverEmploymentContractEndorsementType>("OTHER");
  const [endorsementEffectiveDate, setEndorsementEffectiveDate] = useState(() => toDateInput(new Date()));
  const [endorsementNotes, setEndorsementNotes] = useState("");
  const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false);
  const [terminationMode, setTerminationMode] = useState<"CANCEL" | "FINALIZE">("FINALIZE");
  const [terminationReason, setTerminationReason] = useState("");
  const [terminationContractId, setTerminationContractId] = useState<string | null>(null);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalContractId, setRenewalContractId] = useState<string | null>(null);
  const [renewalTemplateKey, setRenewalTemplateKey] = useState("");
  const [renewalContractDraft, setRenewalContractDraft] = useState<Partial<DriverContract>>({});
  const [renewalJourneyDraft, setRenewalJourneyDraft] = useState<Partial<DriverJourney>>({});
  const [isEndorsementConfigEnabled, setIsEndorsementConfigEnabled] = useState(false);
  const [endorsementContractDraft, setEndorsementContractDraft] = useState<Partial<DriverContract>>({});
  const [endorsementJourneyDraft, setEndorsementJourneyDraft] = useState<Partial<DriverJourney>>({});
  const [templateOptions, setTemplateOptions] = useState<ContractTemplateOption[]>([]);
  const [templateCatalog, setTemplateCatalog] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(() => contract?.employmentTemplateKey?.trim() ?? "");
  const [selectedTemplatePreview, setSelectedTemplatePreview] = useState<TemplatePreviewState | null>(null);
  const [activeTab, setActiveTab] = useState<ContractsTab>("CURRENT");
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileConfig | null>(null);

  useEffect(() => {
    const catalog = loadDocumentTemplates()
      .filter((item) => item.scope === "DRIVER_EMPLOYMENT" && item.status === "PUBLISHED")
      .sort((a, b) => a.name.localeCompare(b.name));
    setTemplateCatalog(catalog);
    const options = catalog
      .map((item) => ({
        key: item.key,
        name: item.name,
        version: item.version
      }));
    setTemplateOptions(options);
  }, []);

  useEffect(() => {
    void request<CompanyProfileConfig>("/admin/company-profile")
      .then((loaded) => setCompanyProfile(loaded))
      .catch(() => setCompanyProfile(null));
  }, []);

  useEffect(() => {
    setSelectedTemplateKey(contract?.employmentTemplateKey?.trim() ?? "");
  }, [contract?.employmentTemplateKey]);

  const history = useMemo(
    () =>
      [...(contract?.employmentContracts ?? [])].sort(
        (a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt)
      ),
    [contract?.employmentContracts]
  );
  const selectedTemplateOption = useMemo(
    () => templateOptions.find((item) => item.key === selectedTemplateKey),
    [selectedTemplateKey, templateOptions]
  );
  const selectedTemplateCatalogItem = useMemo(() => {
    if (selectedTemplateKey) {
      return templateCatalog.find((item) => item.key === selectedTemplateKey);
    }
    return resolveTemplateByProfile(templateCatalog, contractProfile);
  }, [selectedTemplateKey, templateCatalog, contractProfile]);
  const latest = history[0];
  const readiness = useMemo(() => buildContractReadiness(contractProfile, contract), [contractProfile, contract]);
  const lifecycleLabel = resolveContractLifecycleLabel(latest);
  const lifecycleTone = resolveContractLifecycleTone(latest);
  const latestStatus = latest?.status;
  const requiresPersistedDriver = mode === "create" || !driverId;
  const pendingSignatureContract = history.find(
    (item) => item.status === "DRAFT" || item.status === "PENDING_SIGNATURE"
  );
  const activeContract = history.find(
    (item) => item.status === "ACTIVE" || item.status === "EXPIRING_SOON"
  );
  const isTemplateLocked = Boolean(pendingSignatureContract || activeContract);
  const renewalBaseContract = history.find(
    (item) => item.status === "EXPIRING_SOON" || item.status === "EXPIRED"
  );
  const canGenerate =
    !requiresPersistedDriver &&
    readiness.eligible &&
    isContractualProfile(contractProfile) &&
    !pendingSignatureContract &&
    !activeContract &&
    !isGeneratingContract;
  const canRenew =
    !requiresPersistedDriver &&
    readiness.eligible &&
    isContractualProfile(contractProfile) &&
    Boolean(renewalBaseContract) &&
    !pendingSignatureContract &&
    !activeContract &&
    !isRenewingContract;
  const canActivate = !requiresPersistedDriver && Boolean(pendingSignatureContract) && !isActivatingContract;
  const canCreateEndorsement =
    !requiresPersistedDriver &&
    Boolean(activeContract) &&
    !pendingSignatureContract &&
    !isCreatingEndorsement;
  const showGenerateAction = !pendingSignatureContract && !activeContract;
  const showRenewAction = !pendingSignatureContract && Boolean(renewalBaseContract) && !activeContract;
  const showActivateAction = Boolean(pendingSignatureContract);
  const showEndorsementAction = Boolean(activeContract);
  const showCancelAction = Boolean(pendingSignatureContract);
  const showTerminateAction = Boolean(activeContract);
  const canRequestSignature =
    !requiresPersistedDriver &&
    Boolean(pendingSignatureContract) &&
    Boolean(driverEmail?.trim()) &&
    !isRequestingSignature;
  const showTemplateSelector =
    !requiresPersistedDriver &&
    !isTemplateLocked &&
    isContractualProfile(contractProfile);
  const isProfileContractual = isContractualProfile(contractProfile);
  const contractStage: "NOT_ELIGIBLE" | "ELIGIBLE" | "GENERATED" = latest
    ? "GENERATED"
    : !requiresPersistedDriver && isProfileContractual && readiness.eligible
      ? "ELIGIBLE"
      : "NOT_ELIGIBLE";
  const notEligibleReasons = requiresPersistedDriver
    ? ["Finalize o cadastro inicial para habilitar contratos."]
    : readiness.reasons.length > 0
      ? readiness.reasons
      : ["Ajuste os dados obrigatorios para habilitar a geracao."];

  async function handleGenerateClick() {
    if (!canGenerate) {
      return;
    }
    const selectedOption = templateOptions.find((item) => item.key === selectedTemplateKey);
    const generatedAt = new Date().toISOString();
    const renderedTemplateContent = selectedTemplateCatalogItem
      ? renderTemplateContent(selectedTemplateCatalogItem.content, {
          driverId,
          driverName,
          address,
          contractProfile,
          contract,
          journey,
          companyProfile,
          generatedAt
        })
      : undefined;
    await onGenerateContract(
      selectedTemplateKey
        ? {
            templateKey: selectedTemplateKey,
            templateName: selectedOption?.name || contract?.employmentTemplateName || undefined,
            templateVersion: selectedOption?.version || contract?.employmentTemplateVersion || undefined,
            templateContent: renderedTemplateContent
          }
        : undefined
    );
  }

  function openRenewalModal() {
    if (!canRenew || !renewalBaseContract) {
      return;
    }
    setRenewalContractId(renewalBaseContract.id);
    const preselectedTemplateKey =
      contract?.employmentTemplateKey?.trim() ||
      renewalBaseContract.templateKey ||
      "";
    setRenewalTemplateKey(preselectedTemplateKey);
    setRenewalContractDraft({
      startDate: contract?.startDate,
      hasFixedTermContract: contract?.hasFixedTermContract,
      endDate: contract?.endDate,
      salaryModel: contract?.salaryModel,
      fixedSalary: contract?.fixedSalary,
      commissionType: contract?.commissionType,
      commissionPercent: contract?.commissionPercent,
      commissionPerRide: contract?.commissionPerRide,
      commissionApplyOn: contract?.commissionApplyOn,
      intermittentPaymentMode: contract?.intermittentPaymentMode,
      intermittentDailyRate: contract?.intermittentDailyRate,
      intermittentRideCompensationType: contract?.intermittentRideCompensationType,
      intermittentRidePercent: contract?.intermittentRidePercent,
      intermittentRideAmount: contract?.intermittentRideAmount,
      meiRemunerationModel: contract?.meiRemunerationModel,
      meiCommissionPercent: contract?.meiCommissionPercent,
      meiPerRideAmount: contract?.meiPerRideAmount,
      meiRevenueSharePercent: contract?.meiRevenueSharePercent,
      meiFixedBaseAmount: contract?.meiFixedBaseAmount,
      paymentMethod: contract?.paymentMethod,
      paymentFrequency: contract?.paymentFrequency
    });
    setRenewalJourneyDraft({
      shift: journey?.shift,
      scale: journey?.scale,
      startTime: journey?.startTime,
      endTime: journey?.endTime,
      availabilityStartTime: journey?.availabilityStartTime,
      availabilityEndTime: journey?.availabilityEndTime
    });
    setIsRenewalModalOpen(true);
  }

  async function handleActivateClick() {
    if (!canActivate || !pendingSignatureContract) {
      return;
    }
    await onActivateContract(pendingSignatureContract.id);
  }

  async function handleRequestSignatureClick() {
    if (!canRequestSignature || !pendingSignatureContract) {
      return;
    }
    await onRequestSignature(pendingSignatureContract.id);
  }

  function openTerminationModal(mode: "CANCEL" | "FINALIZE", contractId: string) {
    setTerminationMode(mode);
    setTerminationReason("");
    setTerminationContractId(contractId);
    setIsTerminationModalOpen(true);
  }

  async function handleConfirmTermination() {
    if (!terminationContractId) {
      return;
    }
    await onTerminateContract(terminationContractId, {
      mode: terminationMode,
      reason: terminationReason.trim() || undefined
    });
    setIsTerminationModalOpen(false);
    setTerminationContractId(null);
    setTerminationReason("");
  }

  function handleCreateEndorsementClick() {
    if (!canCreateEndorsement || !activeContract) {
      return;
    }
    setEndorsementEffectiveDate(toDateInput(new Date()));
    setEndorsementType("OTHER");
    setEndorsementNotes("");
    setIsEndorsementConfigEnabled(false);
    setEndorsementContractDraft({
      startDate: contract?.startDate,
      hasFixedTermContract: contract?.hasFixedTermContract,
      endDate: contract?.endDate,
      salaryModel: contract?.salaryModel,
      fixedSalary: contract?.fixedSalary,
      commissionType: contract?.commissionType,
      commissionPercent: contract?.commissionPercent,
      commissionPerRide: contract?.commissionPerRide,
      commissionApplyOn: contract?.commissionApplyOn,
      intermittentPaymentMode: contract?.intermittentPaymentMode,
      intermittentDailyRate: contract?.intermittentDailyRate,
      intermittentRideCompensationType: contract?.intermittentRideCompensationType,
      intermittentRidePercent: contract?.intermittentRidePercent,
      intermittentRideAmount: contract?.intermittentRideAmount,
      meiRemunerationModel: contract?.meiRemunerationModel,
      meiCommissionPercent: contract?.meiCommissionPercent,
      meiPerRideAmount: contract?.meiPerRideAmount,
      meiRevenueSharePercent: contract?.meiRevenueSharePercent,
      meiFixedBaseAmount: contract?.meiFixedBaseAmount,
      paymentMethod: contract?.paymentMethod,
      paymentFrequency: contract?.paymentFrequency
    });
    setEndorsementJourneyDraft({
      shift: journey?.shift,
      scale: journey?.scale,
      startTime: journey?.startTime,
      endTime: journey?.endTime,
      availabilityStartTime: journey?.availabilityStartTime,
      availabilityEndTime: journey?.availabilityEndTime
    });
    setIsEndorsementModalOpen(true);
  }

  async function handleConfirmRenewal() {
    if (!renewalContractId) {
      return;
    }
    await onRenewContract(renewalContractId, {
      templateKey: renewalTemplateKey || undefined,
      templateName:
        templateOptions.find((item) => item.key === renewalTemplateKey)?.name ||
        undefined,
      templateVersion:
        templateOptions.find((item) => item.key === renewalTemplateKey)?.version ||
        undefined,
      templateContent:
        templateCatalog.find((item) => item.key === renewalTemplateKey)?.content ||
        undefined,
      contract: renewalContractDraft,
      journey: renewalJourneyDraft
    });
    setIsRenewalModalOpen(false);
  }

  async function handleConfirmEndorsement() {
    if (!activeContract || !endorsementEffectiveDate.trim()) {
      return;
    }
    await onCreateEndorsement(activeContract.id, {
      type: endorsementType,
      effectiveDate: endorsementEffectiveDate.trim(),
      notes: endorsementNotes.trim() || undefined,
      applySettings: isEndorsementConfigEnabled,
      contract: isEndorsementConfigEnabled ? endorsementContractDraft : undefined,
      journey: isEndorsementConfigEnabled ? endorsementJourneyDraft : undefined
    });
    setIsEndorsementModalOpen(false);
  }

  function handleContractTemplateChange(nextKey: string) {
    setSelectedTemplateKey(nextKey);

    if (!nextKey) {
      onContractChange({
        ...(contract ?? {}),
        employmentTemplateKey: undefined,
        employmentTemplateName: undefined,
        employmentTemplateVersion: undefined
      });
      return;
    }

    const option = templateOptions.find((item) => item.key === nextKey);
    if (!option) {
      return;
    }

    onContractChange({
      ...(contract ?? {}),
      employmentTemplateKey: option.key,
      employmentTemplateName: option.name,
      employmentTemplateVersion: option.version
    });
  }

  function handlePreviewSelectedTemplate() {
    const selectedTemplate = selectedTemplateCatalogItem;
    if (!selectedTemplate) {
      return;
    }

    const generatedAt = new Date().toISOString();
    const content = renderTemplateContent(selectedTemplate.content, {
      driverId,
      driverName,
      address,
      contractProfile,
      contract,
      journey,
      companyProfile,
      generatedAt
    });

    setSelectedTemplatePreview({
      title: `Pre-visualizacao - ${selectedTemplate.name}`,
      description: `${selectedTemplate.name} (${selectedTemplate.version}) - ${selectedTemplate.key}`,
      content
    });
  }

  async function buildContractPrintHtml(
    contractToPrint: DriverEmploymentContract,
    mode: "print" | "preview" = "print"
  ): Promise<string> {
    const contentForPrint = stripEmbeddedSignatureEvidence(contractToPrint.content);
    const printableContent = looksLikeHtml(contentForPrint)
      ? contentForPrint
      : `<pre class="sheet-text">${escapeHtml(contentForPrint)}</pre>`;
    const title = contractToPrint.title || "Contrato";
    const signatureEvidence = extractContractSignatureEvidence(contractToPrint);
    const contentHash = await computeSha256Hex(contractToPrint.content);
    const logsGeneratedAt = formatDateTime(new Date().toISOString());
    const processNote = signatureEvidence.signedAt
      ? `Processo de assinatura concluido para documento ${contractToPrint.id}.`
      : `Processo de assinatura ainda nao concluido para documento ${contractToPrint.id}.`;
    const auditLogs = extractContractAuditLogs(contractToPrint, processNote);
    const auditRows = auditLogs
      .map(
        (entry) => `
          <div class="log-row">
            <div class="log-time">${escapeHtml(formatDateTime(entry.createdAt))}</div>
            <div class="log-message">${escapeHtml(entry.message)}</div>
          </div>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            :root { color-scheme: light; }
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              margin: 0;
              background: #f2f4fb;
              color: #1f2a44;
              font-family: "Segoe UI", Tahoma, sans-serif;
              line-height: 1.55;
            }
            .sheet-wrapper {
              padding: 24px;
              display: flex;
              justify-content: center;
            }
            .sheet {
              width: min(210mm, 100%);
              min-height: 297mm;
              background: #ffffff;
              border: 1px solid #d9e2f6;
              box-shadow: 0 12px 30px rgba(31, 42, 68, 0.12);
              padding: 22mm 18mm;
              box-sizing: border-box;
            }
            .contract-sheet {
              padding-bottom: 16mm;
            }
            .sheet-text {
              margin: 0;
              white-space: pre-wrap;
              word-break: break-word;
              font-family: "Segoe UI", Tahoma, sans-serif;
              font-size: 14px;
            }
            .contract-footer {
              position: fixed;
              left: 10mm;
              right: 10mm;
              bottom: 6mm;
              border-top: 1px solid #d9e2f6;
              padding-top: 5px;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              gap: 8px;
              font-size: 10.5px;
              color: #5f6f99;
              background: #fff;
              white-space: nowrap;
            }
            .log-sheet {
              page-break-before: always;
            }
            .log-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 12px;
              padding-bottom: 10px;
              border-bottom: 1px solid #d9e2f6;
            }
            .log-brand {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 0.2px;
              color: #1f2a44;
            }
            .log-generated {
              text-align: right;
              color: #5f6f99;
              font-size: 12px;
            }
            .log-title {
              margin: 14px 0 6px;
              font-size: 24px;
              color: #1d2441;
            }
            .log-code {
              margin: 0 0 14px;
              color: #5f6f99;
              font-size: 13px;
            }
            .log-meta {
              margin: 0 0 14px;
              display: grid;
              gap: 3px;
              font-size: 12.5px;
              color: #2a314a;
            }
            .log-meta span strong {
              color: #1f2a44;
            }
            .log-heading {
              margin: 0 0 10px;
              font-size: 19px;
              color: #1d2441;
            }
            .log-list {
              display: grid;
              gap: 0;
            }
            .log-row {
              display: grid;
              grid-template-columns: 190px minmax(0, 1fr);
              gap: 12px;
              padding: 10px 0;
              border-bottom: 1px solid #e3e8f7;
            }
            .log-time {
              color: #7281a2;
              font-size: 13px;
              white-space: nowrap;
            }
            .log-message {
              color: #1f2a44;
              font-size: 13px;
            }
            body.is-preview {
              background: #eff3fb;
            }
            .is-preview .sheet-wrapper {
              padding: 12px 8px;
            }
            .is-preview .sheet {
              width: 210mm;
              min-height: 297mm;
              box-shadow: 0 8px 24px rgba(31, 42, 68, 0.08);
              padding: 14mm 12mm 18mm;
            }
            .is-preview .contract-sheet {
              padding-bottom: 14mm;
            }
            .is-preview .contract-footer {
              position: static;
              width: 210mm;
              margin: 6px auto 0;
              border-top: 1px solid #d9e2f6;
              background: transparent;
              padding-top: 4px;
            }
            .is-preview .log-sheet {
              page-break-before: always;
              margin-top: 0;
            }
            @media (max-width: 920px) {
              .is-preview .sheet,
              .is-preview .contract-footer {
                width: min(210mm, calc(100% - 8px));
              }
            }
            @media print {
              body {
                background: #fff;
              }
              .sheet-wrapper {
                padding: 0;
              }
              .sheet {
                width: 100%;
                min-height: auto;
                border: 0;
                box-shadow: none;
                padding: 14mm 12mm 18mm;
              }
              .contract-sheet {
                padding-bottom: 14mm;
              }
              .log-row {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body class="${mode === "preview" ? "is-preview" : "is-print"}">
          <div class="sheet-wrapper contract-wrapper">
            <article class="sheet contract-sheet">
              ${printableContent}
            </article>
          </div>
          <footer class="contract-footer">
            <span>Codigo do documento: ${escapeHtml(contractToPrint.id)}</span>
          </footer>

          <div class="sheet-wrapper">
            <article class="sheet log-sheet">
              <header class="log-header">
                <strong class="log-brand">Inturb</strong>
                <div class="log-generated">Log gerado em ${escapeHtml(logsGeneratedAt)}</div>
              </header>
              <h1 class="log-title">${escapeHtml(contractToPrint.title)}</h1>
              <p class="log-code">Codigo do documento: ${escapeHtml(contractToPrint.id)}<br/>Hash SHA-256: ${escapeHtml(contentHash || "-")}</p>
              <div class="log-meta">
                <span><strong>Data/hora:</strong> ${escapeHtml(formatDateTime(signatureEvidence.signedAt || contractToPrint.generatedAt))}</span>
                <span><strong>Assinante:</strong> ${escapeHtml(signatureEvidence.signerName || "-")}</span>
                <span><strong>Documento:</strong> ${escapeHtml(signatureEvidence.signerDocument || "-")}</span>
                <span><strong>E-mail:</strong> ${escapeHtml(signatureEvidence.signerEmail || "-")}</span>
                <span><strong>IP:</strong> ${escapeHtml(signatureEvidence.signerIp || "-")}</span>
              </div>
              <h2 class="log-heading">Logs</h2>
              <section class="log-list">
                ${auditRows}
              </section>
            </article>
          </div>
        </body>
      </html>
    `;
  }

  async function openContractPreview(contractToPreview: DriverEmploymentContract) {
    setIsBuildingContractPreview(true);
    setSelectedContract(contractToPreview);
    setSelectedContractPrintHtml("");
    try {
      const html = await buildContractPrintHtml(contractToPreview, "preview");
      setSelectedContractPrintHtml(html);
    } finally {
      setIsBuildingContractPreview(false);
    }
  }

  async function handlePrintContract(contractToPrint?: DriverEmploymentContract | null) {
    if (!contractToPrint || typeof window === "undefined") {
      return;
    }
    const html = await buildContractPrintHtml(contractToPrint, "print");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        iframe.remove();
        return;
      }
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => iframe.remove(), 1200);
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  }

  return (
    <article
      id="driver-editor-contracts"
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "contracts" ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">06</span>
        <div className="panel-head">
          <h2>Contratos</h2>
          <span>Gere contrato, acompanhe assinatura e mantenha historico de versoes e renovacoes.</span>
        </div>
      </div>

      <div className="driver-editor-compliance-tabs" role="tablist" aria-label="Abas de contratos">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "CURRENT"}
          className={`driver-editor-compliance-tab ${activeTab === "CURRENT" ? "is-active" : ""}`}
          onClick={() => setActiveTab("CURRENT")}
        >
          Estado atual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "HISTORY"}
          className={`driver-editor-compliance-tab ${activeTab === "HISTORY" ? "is-active" : ""}`}
          onClick={() => setActiveTab("HISTORY")}
        >
          Historico
        </button>
      </div>

      {activeTab === "CURRENT" ? (
        <div className="driver-editor-summary-strip driver-editor-contract-grid">
          <article className="driver-editor-summary-card">
            {contractStage === "NOT_ELIGIBLE" ? (
              <>
                <span>Etapa atual</span>
                <strong>Ainda nao elegivel para contrato</strong>
                <small>Preencha os itens abaixo para habilitar a geracao.</small>
                <ul className="driver-editor-contracts-pending-list">
                  {notEligibleReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {contractStage === "ELIGIBLE" ? (
              <>
                <span>Etapa atual</span>
                <strong>Elegivel para gerar contrato</strong>
                <small>Selecione o modelo (opcional) e gere o primeiro contrato.</small>
                {showTemplateSelector ? (
                  <label>
                    Modelo para geracao
                    <select
                      className="select"
                      value={selectedTemplateKey}
                      onChange={(event) => handleContractTemplateChange(event.target.value)}
                    >
                      <option value="">Padrao automatico ({resolveContractProfileLabel(contractProfile)})</option>
                      {selectedTemplateKey && !selectedTemplateOption ? (
                        <option value={selectedTemplateKey}>
                          Modelo salvo ({contract?.employmentTemplateName || selectedTemplateKey})
                        </option>
                      ) : null}
                      {templateOptions.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.name} ({item.version})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {selectedTemplateOption ? (
                  <small>
                    Modelo selecionado: {selectedTemplateOption.name} ({selectedTemplateOption.version}).
                  </small>
                ) : (
                  <small>Sem selecao manual. O sistema usa o modelo padrao por perfil.</small>
                )}
                <div className="driver-contract-actions">
                  <button type="button" className="secondary" onClick={handleGenerateClick} disabled={!canGenerate}>
                    {isGeneratingContract ? "Gerando..." : "Gerar contrato"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={handlePreviewSelectedTemplate}
                    disabled={!selectedTemplateCatalogItem}
                  >
                    Pre-visualizar modelo
                  </button>
                </div>
              </>
            ) : null}

            {contractStage === "GENERATED" ? (
              <>
                <div className="driver-editor-contracts-stage-copy">
                  <span>Etapa atual</span>
                  <strong>{lifecycleLabel}</strong>
                  <small className={`driver-editor-contracts-status-chip is-${lifecycleTone}`}>{lifecycleLabel}</small>
                  {pendingSignatureContract ? (
                    <small>Conclua a assinatura para liberar novos ciclos.</small>
                  ) : activeContract ? (
                    <small>Use endosso para ajustes e renovacao no encerramento do ciclo.</small>
                  ) : (
                    <small>
                      {latestStatus === "EXPIRED"
                        ? "Contrato expirado. Proximo passo: gerar novo contrato."
                        : "Contrato encerrado/cancelado. Proximo passo: gerar novo contrato."}
                    </small>
                  )}
                </div>

                <div className="driver-editor-contracts-action-panel">
                  {(showGenerateAction || showRenewAction || showActivateAction || showEndorsementAction) ? (
                    <small className="driver-editor-contracts-action-title">Acoes</small>
                  ) : null}
                  {showGenerateAction && showTemplateSelector ? (
                    <label>
                      Modelo para novo contrato
                      <select
                        className="select"
                        value={selectedTemplateKey}
                        onChange={(event) => handleContractTemplateChange(event.target.value)}
                      >
                        <option value="">Padrao automatico ({resolveContractProfileLabel(contractProfile)})</option>
                        {selectedTemplateKey && !selectedTemplateOption ? (
                          <option value={selectedTemplateKey}>
                            Modelo salvo ({contract?.employmentTemplateName || selectedTemplateKey})
                          </option>
                        ) : null}
                        {templateOptions.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.name} ({item.version})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="driver-contract-actions">
                    {showActivateAction ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void handleRequestSignatureClick()}
                        disabled={!canRequestSignature}
                      >
                        {isRequestingSignature
                          ? "Enviando..."
                          : pendingSignatureContract?.status === "PENDING_SIGNATURE"
                            ? "Reenviar assinatura"
                            : "Enviar para assinatura"}
                      </button>
                    ) : null}
                    {showActivateAction ? (
                      <button type="button" className="secondary" onClick={handleActivateClick} disabled={!canActivate}>
                        {isActivatingContract ? "Ativando..." : "Marcar assinado"}
                      </button>
                    ) : null}
                    {showRenewAction ? (
                      <button type="button" className="secondary" onClick={openRenewalModal} disabled={!canRenew}>
                        {isRenewingContract ? "Renovando..." : "Preparar renovacao"}
                      </button>
                    ) : null}
                    {showEndorsementAction ? (
                      <button type="button" className="secondary" onClick={handleCreateEndorsementClick} disabled={!canCreateEndorsement}>
                        {isCreatingEndorsement ? "Criando..." : "Criar endosso"}
                      </button>
                    ) : null}
                    {showCancelAction && pendingSignatureContract ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => openTerminationModal("CANCEL", pendingSignatureContract.id)}
                        disabled={isTerminatingContract}
                      >
                        {isTerminatingContract ? "Cancelando..." : "Cancelar contrato"}
                      </button>
                    ) : null}
                    {showTerminateAction && activeContract ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => openTerminationModal("FINALIZE", activeContract.id)}
                        disabled={isTerminatingContract}
                      >
                        {isTerminatingContract ? "Encerrando..." : "Encerrar contrato"}
                      </button>
                    ) : null}
                    {showGenerateAction ? (
                      <button type="button" className="secondary" onClick={handleGenerateClick} disabled={!canGenerate}>
                        {isGeneratingContract ? "Gerando..." : "Gerar novo contrato"}
                      </button>
                    ) : null}
                    {showGenerateAction ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={handlePreviewSelectedTemplate}
                        disabled={!selectedTemplateCatalogItem}
                      >
                        Pre-visualizar modelo
                      </button>
                    ) : latest ? (
                      <>
                        <button type="button" className="secondary" onClick={() => void openContractPreview(latest)}>
                          Pre-visualizar atual
                        </button>
                        <button type="button" className="secondary" onClick={() => handlePrintContract(latest)}>
                          Imprimir atual
                        </button>
                      </>
                    ) : null}
                  </div>
                  {showActivateAction && !driverEmail?.trim() ? (
                    <small>Informe um e-mail do motorista no Step 3 para enviar assinatura digital.</small>
                  ) : null}
                  {showGenerateAction && !canGenerate && readiness.reasons.length > 0 ? (
                    <small>
                      Para gerar novo contrato, ajuste: {readiness.reasons[0]}
                    </small>
                  ) : null}
                  {showGenerateAction ? (
                    <small>
                      O Step 5 define apenas o proximo ciclo.
                    </small>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        </div>
      ) : null}

      {activeTab === "HISTORY" ? (
        <div className="driver-editor-block">
          <div className="driver-editor-block-head">
            <strong>Historico de contratos</strong>
            <p className="helper-text">Todas as versoes, renovacoes e status de assinatura.</p>
          </div>

          {history.length > 0 ? (
            <div className="driver-editor-contracts-history">
              {history.map((item) => (
                <article key={item.id} className="driver-editor-contracts-history-item">
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {resolveContractProfileLabel(item.profile)} - {item.kind === "RENEWAL" ? "Renovacao" : "Contrato inicial"} - {formatDateTime(item.generatedAt)}
                    </small>
                    <small>Modelo: {item.templateName || item.templateKey} ({item.templateVersion})</small>
                    <small>Vigencia: {item.validFrom ? formatDate(item.validFrom) : "-"} ate {item.validTo ? formatDate(item.validTo) : "indeterminado"}</small>
                    {item.endorsements && item.endorsements.length > 0 ? (
                      <small>{item.endorsements.length} endosso(s) registrado(s).</small>
                    ) : null}
                  </div>
                  <div className="driver-editor-contracts-history-actions">
                    <span className={`driver-editor-contracts-status-chip is-${resolveStatusTone(item.status)}`}>
                      {resolveStatusLabel(item.status)}
                    </span>
                    <button type="button" className="secondary" onClick={() => void openContractPreview(item)}>
                      Pre-visualizar
                    </button>
                    <button type="button" className="secondary" onClick={() => void handlePrintContract(item)}>
                      Imprimir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="driver-editor-contracts-empty">
              Nenhum contrato foi gerado para {driverName || "este motorista"}.
            </div>
          )}
        </div>
      ) : null}

      <DriverProfileEditorModal
        open={isRenewalModalOpen}
        title="Preparar renovacao"
        description="Revise vigencia, remuneracao e jornada antes de gerar a nova versao do contrato."
        onClose={() => setIsRenewalModalOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setIsRenewalModalOpen(false)} disabled={isRenewingContract}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleConfirmRenewal()} disabled={isRenewingContract || !renewalContractId}>
              {isRenewingContract ? "Gerando..." : "Gerar renovacao"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="driver-editor-modal-field-full">
            Modelo da renovacao
            <select
              className="select"
              value={renewalTemplateKey}
              onChange={(event) => setRenewalTemplateKey(event.target.value)}
            >
              <option value="">Padrao automatico ({resolveContractProfileLabel(contractProfile)})</option>
              {renewalTemplateKey && !templateOptions.some((item) => item.key === renewalTemplateKey) ? (
                <option value={renewalTemplateKey}>Modelo atual ({renewalTemplateKey})</option>
              ) : null}
              {templateOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name} ({item.version})
                </option>
              ))}
            </select>
          </label>
          <ContractSettingsEditor
            profile={contractProfile}
            contractDraft={renewalContractDraft}
            journeyDraft={renewalJourneyDraft}
            onContractDraftChange={setRenewalContractDraft}
            onJourneyDraftChange={setRenewalJourneyDraft}
          />
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isEndorsementModalOpen}
        title="Criar endosso"
        description="Registre um aditivo e, se necessario, aplique alteracoes de configuracao."
        onClose={() => setIsEndorsementModalOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setIsEndorsementModalOpen(false)} disabled={isCreatingEndorsement}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleConfirmEndorsement()} disabled={isCreatingEndorsement || !endorsementEffectiveDate.trim()}>
              {isCreatingEndorsement ? "Salvando..." : "Salvar endosso"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label>
            Tipo do endosso
            <select
              className="select"
              value={endorsementType}
              onChange={(event) => setEndorsementType(event.target.value as DriverEmploymentContractEndorsementType)}
            >
              <option value="SALARY_CHANGE">Alteracao salarial</option>
              <option value="SCHEDULE_CHANGE">Alteracao de jornada</option>
              <option value="BENEFITS_CHANGE">Alteracao de beneficios</option>
              <option value="TERM_EXTENSION">Prorrogacao de prazo</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>
          <label>
            Vigencia do endosso
            <input
              type="date"
              value={endorsementEffectiveDate}
              onChange={(event) => setEndorsementEffectiveDate(event.target.value)}
            />
          </label>
          <label className="driver-editor-modal-field-full">
            Observacoes
            <textarea
              value={endorsementNotes}
              onChange={(event) => setEndorsementNotes(event.target.value)}
              placeholder="Detalhe o motivo ou regra alterada por este endosso."
            />
          </label>
          <label className="driver-editor-modal-checkbox driver-editor-modal-field-full">
            <input
              type="checkbox"
              checked={isEndorsementConfigEnabled}
              onChange={(event) => setIsEndorsementConfigEnabled(event.target.checked)}
            />
            <span>Aplicar alteracoes de configuracao neste endosso</span>
          </label>
        </div>
        {isEndorsementConfigEnabled ? (
          <ContractSettingsEditor
            profile={contractProfile}
            contractDraft={endorsementContractDraft}
            journeyDraft={endorsementJourneyDraft}
            onContractDraftChange={setEndorsementContractDraft}
            onJourneyDraftChange={setEndorsementJourneyDraft}
          />
        ) : null}
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isTerminationModalOpen}
        title={terminationMode === "CANCEL" ? "Cancelar contrato" : "Encerrar contrato"}
        description={
          terminationMode === "CANCEL"
            ? "Use para cancelar documento em rascunho ou pendente de assinatura."
            : "Use para finalizar o ciclo de um contrato ativo."
        }
        onClose={() => {
          if (!isTerminatingContract) {
            setIsTerminationModalOpen(false);
          }
        }}
        footer={
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => setIsTerminationModalOpen(false)}
              disabled={isTerminatingContract}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmTermination()}
              disabled={isTerminatingContract || !terminationContractId}
            >
              {isTerminatingContract
                ? terminationMode === "CANCEL"
                  ? "Cancelando..."
                  : "Encerrando..."
                : terminationMode === "CANCEL"
                  ? "Confirmar cancelamento"
                  : "Confirmar encerramento"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="driver-editor-modal-field-full">
            Motivo (opcional)
            <textarea
              value={terminationReason}
              onChange={(event) => setTerminationReason(event.target.value)}
              placeholder={
                terminationMode === "CANCEL"
                  ? "Ex.: contrato gerado indevidamente, dados incompletos, etc."
                  : "Ex.: desligamento, fim da parceria, encerramento operacional."
              }
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={Boolean(selectedTemplatePreview)}
        title={selectedTemplatePreview ? selectedTemplatePreview.title : "Pre-visualizacao de modelo"}
        description={selectedTemplatePreview?.description}
        onClose={() => setSelectedTemplatePreview(null)}
        dialogWidth="min(1020px, calc(100vw - 24px))"
        footer={
          <button type="button" className="secondary" onClick={() => setSelectedTemplatePreview(null)}>
            Fechar
          </button>
        }
      >
        {selectedTemplatePreview ? (
          <div className="driver-editor-contracts-preview">
            {looksLikeHtml(selectedTemplatePreview.content) ? (
              <div
                className="driver-editor-contracts-preview-html"
                dangerouslySetInnerHTML={{ __html: selectedTemplatePreview.content }}
              />
            ) : (
              <pre>{selectedTemplatePreview.content}</pre>
            )}
          </div>
        ) : null}
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={Boolean(selectedContract)}
        title={selectedContract ? selectedContract.title : "Contrato"}
        description={
          selectedContract
            ? `${resolveStatusLabel(selectedContract.status)} - ${formatDateTime(selectedContract.generatedAt)} - ${selectedContract.templateName || selectedContract.templateKey} (${selectedContract.templateVersion})`
            : undefined
        }
        onClose={() => {
          setSelectedContract(null);
          setSelectedContractPrintHtml("");
          setIsBuildingContractPreview(false);
        }}
        dialogWidth="min(1020px, calc(100vw - 24px))"
        bodyScrollable={false}
        footer={
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => void handlePrintContract(selectedContract)}
              disabled={!selectedContract}
            >
              Imprimir
            </button>
            <button type="button" className="secondary" onClick={() => setSelectedContract(null)}>
              Fechar
            </button>
          </>
        }
      >
        {selectedContract ? (
          <div className="driver-editor-contracts-preview is-frame">
            {isBuildingContractPreview ? (
              <p className="helper-text">Carregando pre-visualizacao...</p>
            ) : selectedContractPrintHtml ? (
              <iframe
                title="Pre-visualizacao de impressao do contrato"
                srcDoc={selectedContractPrintHtml}
                style={{
                  width: "100%",
                  height: "72vh",
                  border: "1px solid rgba(217, 224, 238, 0.9)",
                  borderRadius: "12px",
                  background: "#fff",
                  display: "block"
                }}
              />
            ) : (
              <p className="helper-text">Nao foi possivel montar a pre-visualizacao.</p>
            )}
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </article>
  );
}

type ContractSettingsEditorProps = {
  profile: DriverContractProfile;
  contractDraft: Partial<DriverContract>;
  journeyDraft: Partial<DriverJourney>;
  onContractDraftChange: Dispatch<SetStateAction<Partial<DriverContract>>>;
  onJourneyDraftChange: Dispatch<SetStateAction<Partial<DriverJourney>>>;
};

function ContractSettingsEditor({
  profile,
  contractDraft,
  journeyDraft,
  onContractDraftChange,
  onJourneyDraftChange
}: ContractSettingsEditorProps) {
  const cltSalaryModel =
    (contractDraft.salaryModel ?? "FIXED") === "COMMISSION"
      ? "FIXED_PLUS_COMMISSION"
      : (contractDraft.salaryModel ?? "FIXED");

  function setContractField<Key extends keyof DriverContract>(field: Key, value: DriverContract[Key]) {
    onContractDraftChange((current) => ({ ...current, [field]: value }));
  }

  function setJourneyField<Key extends keyof DriverJourney>(field: Key, value: DriverJourney[Key]) {
    onJourneyDraftChange((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="form-grid">
      <label>
        Inicio do contrato
        <input
          type="date"
          value={contractDraft.startDate ?? ""}
          onChange={(event) => setContractField("startDate", event.target.value || undefined)}
        />
      </label>
      <label>
        Contrato com prazo?
        <select
          className="select"
          value={contractDraft.hasFixedTermContract ? "YES" : "NO"}
          onChange={(event) => setContractField("hasFixedTermContract", event.target.value === "YES")}
        >
          <option value="NO">Nao</option>
          <option value="YES">Sim</option>
        </select>
      </label>
      {contractDraft.hasFixedTermContract ? (
        <label>
          Fim do contrato
          <input
            type="date"
            value={contractDraft.endDate ?? ""}
            onChange={(event) => setContractField("endDate", event.target.value || undefined)}
          />
        </label>
      ) : null}

      {profile === "CLT" ? (
        <>
          <label>
            Estrutura salarial
            <select
              className="select"
              value={cltSalaryModel}
              onChange={(event) => {
                const nextSalaryModel = event.target.value as "FIXED" | "FIXED_PLUS_COMMISSION";
                onContractDraftChange((current) => {
                  if (nextSalaryModel === "FIXED") {
                    return {
                      ...current,
                      salaryModel: "FIXED",
                      commissionType: undefined,
                      commissionPercent: undefined,
                      commissionPerRide: undefined,
                      commissionApplyOn: undefined
                    };
                  }

                  return {
                    ...current,
                    salaryModel: "FIXED_PLUS_COMMISSION",
                    commissionType: current.commissionType ?? "PERCENT",
                    commissionApplyOn: current.commissionApplyOn ?? "RIDE"
                  };
                });
              }}
            >
              <option value="FIXED">Salario fixo</option>
              <option value="FIXED_PLUS_COMMISSION">Salario + comissao</option>
            </select>
          </label>
          <label>
            Fixo mensal (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={contractDraft.fixedSalary ?? ""}
              onChange={(event) =>
                setContractField("fixedSalary", toNumberOrUndefined(event.target.value))
              }
            />
          </label>
          {cltSalaryModel === "FIXED_PLUS_COMMISSION" ? (
            <>
              <label>
                Tipo de comissao
                <select
                  className="select"
                  value={contractDraft.commissionType ?? "PERCENT"}
                  onChange={(event) =>
                    setContractField(
                      "commissionType",
                      event.target.value as DriverContract["commissionType"]
                    )
                  }
                >
                  <option value="PERCENT">Percentual</option>
                  <option value="PER_RIDE">Valor por corrida</option>
                </select>
              </label>
              {(contractDraft.commissionType ?? "PERCENT") === "PERCENT" ? (
                <label>
                  Percentual (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={contractDraft.commissionPercent ?? ""}
                    onChange={(event) =>
                      setContractField("commissionPercent", toNumberOrUndefined(event.target.value))
                    }
                  />
                </label>
              ) : (
                <label>
                  Valor comissao (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={contractDraft.commissionPerRide ?? ""}
                    onChange={(event) =>
                      setContractField("commissionPerRide", toNumberOrUndefined(event.target.value))
                    }
                  />
                </label>
              )}
            </>
          ) : null}
          <label>
            Turno
            <input
              value={journeyDraft.shift ?? ""}
              onChange={(event) => setJourneyField("shift", event.target.value || undefined)}
            />
          </label>
          <label>
            Escala
            <input
              value={journeyDraft.scale ?? ""}
              onChange={(event) => setJourneyField("scale", event.target.value || undefined)}
            />
          </label>
          <label>
            Inicio da jornada
            <input
              type="time"
              value={journeyDraft.startTime ?? ""}
              onChange={(event) => setJourneyField("startTime", event.target.value || undefined)}
            />
          </label>
          <label>
            Fim da jornada
            <input
              type="time"
              value={journeyDraft.endTime ?? ""}
              onChange={(event) => setJourneyField("endTime", event.target.value || undefined)}
            />
          </label>
        </>
      ) : null}

      {profile === "INTERMITENTE" ? (
        <>
          <label>
            Pagamento principal
            <select
              className="select"
              value={contractDraft.intermittentPaymentMode ?? "DAILY"}
              onChange={(event) =>
                setContractField(
                  "intermittentPaymentMode",
                  event.target.value as DriverContract["intermittentPaymentMode"]
                )
              }
            >
              <option value="DAILY">Diaria</option>
              <option value="PER_RIDE">Por corrida</option>
              <option value="DAILY_PLUS_RIDE">Diaria + corrida</option>
            </select>
          </label>
          {(contractDraft.intermittentPaymentMode === "DAILY" ||
            contractDraft.intermittentPaymentMode === "DAILY_PLUS_RIDE" ||
            !contractDraft.intermittentPaymentMode) ? (
            <label>
              Valor da diaria (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractDraft.intermittentDailyRate ?? ""}
                onChange={(event) =>
                  setContractField("intermittentDailyRate", toNumberOrUndefined(event.target.value))
                }
              />
            </label>
          ) : null}
          {(contractDraft.intermittentPaymentMode === "PER_RIDE" ||
            contractDraft.intermittentPaymentMode === "DAILY_PLUS_RIDE") ? (
            <>
              <label>
                Variavel por corrida
                <select
                  className="select"
                  value={contractDraft.intermittentRideCompensationType ?? "AMOUNT"}
                  onChange={(event) =>
                    setContractField(
                      "intermittentRideCompensationType",
                      event.target.value as DriverContract["intermittentRideCompensationType"]
                    )
                  }
                >
                  <option value="AMOUNT">Valor</option>
                  <option value="PERCENT">Percentual</option>
                </select>
              </label>
              {(contractDraft.intermittentRideCompensationType ?? "AMOUNT") === "PERCENT" ? (
                <label>
                  Percentual (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={contractDraft.intermittentRidePercent ?? ""}
                    onChange={(event) =>
                      setContractField("intermittentRidePercent", toNumberOrUndefined(event.target.value))
                    }
                  />
                </label>
              ) : (
                <label>
                  Valor por corrida (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={contractDraft.intermittentRideAmount ?? ""}
                    onChange={(event) =>
                      setContractField("intermittentRideAmount", toNumberOrUndefined(event.target.value))
                    }
                  />
                </label>
              )}
            </>
          ) : null}
          <label>
            Disponibilidade inicio
            <input
              type="time"
              value={journeyDraft.availabilityStartTime ?? ""}
              onChange={(event) =>
                setJourneyField("availabilityStartTime", event.target.value || undefined)
              }
            />
          </label>
          <label>
            Disponibilidade fim
            <input
              type="time"
              value={journeyDraft.availabilityEndTime ?? ""}
              onChange={(event) =>
                setJourneyField("availabilityEndTime", event.target.value || undefined)
              }
            />
          </label>
        </>
      ) : null}

      {profile === "MEI" ? (
        <>
          <label>
            Modelo de remuneracao
            <select
              className="select"
              value={contractDraft.meiRemunerationModel ?? "COMMISSION_PERCENT"}
              onChange={(event) =>
                setContractField(
                  "meiRemunerationModel",
                  event.target.value as DriverContract["meiRemunerationModel"]
                )
              }
            >
              <option value="COMMISSION_PERCENT">Comissao (%)</option>
              <option value="PER_RIDE_FIXED">Valor por corrida</option>
              <option value="RIDE_REVENUE_SHARE">Repasse por corrida</option>
              <option value="FIXED_PLUS_VARIABLE">Fixo + variavel</option>
            </select>
          </label>
          {contractDraft.meiRemunerationModel === "COMMISSION_PERCENT" ? (
            <label>
              Comissao (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractDraft.meiCommissionPercent ?? ""}
                onChange={(event) =>
                  setContractField("meiCommissionPercent", toNumberOrUndefined(event.target.value))
                }
              />
            </label>
          ) : null}
          {contractDraft.meiRemunerationModel === "PER_RIDE_FIXED" ? (
            <label>
              Valor corrida (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractDraft.meiPerRideAmount ?? ""}
                onChange={(event) =>
                  setContractField("meiPerRideAmount", toNumberOrUndefined(event.target.value))
                }
              />
            </label>
          ) : null}
          {contractDraft.meiRemunerationModel === "RIDE_REVENUE_SHARE" ? (
            <label>
              Repasse (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractDraft.meiRevenueSharePercent ?? ""}
                onChange={(event) =>
                  setContractField("meiRevenueSharePercent", toNumberOrUndefined(event.target.value))
                }
              />
            </label>
          ) : null}
          {contractDraft.meiRemunerationModel === "FIXED_PLUS_VARIABLE" ? (
            <label>
              Base fixa (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractDraft.meiFixedBaseAmount ?? ""}
                onChange={(event) =>
                  setContractField("meiFixedBaseAmount", toNumberOrUndefined(event.target.value))
                }
              />
            </label>
          ) : null}
          <label>
            Forma de pagamento
            <select
              className="select"
              value={contractDraft.paymentMethod ?? ""}
              onChange={(event) => setContractField("paymentMethod", event.target.value || undefined)}
            >
              <option value="">Selecionar</option>
              <option value="PIX">Pix</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </label>
          <label>
            Frequencia
            <select
              className="select"
              value={contractDraft.paymentFrequency ?? ""}
              onChange={(event) => setContractField("paymentFrequency", event.target.value || undefined)}
            >
              <option value="">Selecionar</option>
              <option value="DIARIA">Diaria</option>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINZENAL">Quinzenal</option>
              <option value="MENSAL">Mensal</option>
            </select>
          </label>
          <label>
            Forma de atuacao
            <select
              className="select"
              value={contractDraft.meiWorkMode ?? "ON_DEMAND"}
              onChange={(event) =>
                setContractField("meiWorkMode", event.target.value as DriverContract["meiWorkMode"])
              }
            >
              <option value="ON_DEMAND">Sob demanda</option>
              <option value="SCHEDULED">Agenda definida</option>
              <option value="MIXED">Mista</option>
            </select>
          </label>
          <label>
            Veiculo
            <select
              className="select"
              value={contractDraft.meiOperationVehicleMode ?? "OWN_VEHICLE"}
              onChange={(event) =>
                setContractField(
                  "meiOperationVehicleMode",
                  event.target.value as DriverContract["meiOperationVehicleMode"]
                )
              }
            >
              <option value="OWN_VEHICLE">Proprio</option>
              <option value="COMPANY_VEHICLE">Empresa</option>
              <option value="BOTH">Ambos</option>
            </select>
          </label>
        </>
      ) : null}
    </div>
  );
}

function toNumberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function buildContractReadiness(
  profile: DriverContractProfile,
  contract?: DriverContract
): ContractReadiness {
  const reasons: string[] = [];
  const meiCnpjDigits = (contract?.meiCnpj ?? "").replace(/\D/g, "");

  if (!isContractualProfile(profile)) {
    reasons.push("Perfil contratual invalido para geracao automatica.");
    return { eligible: false, reasons };
  }

  if (!contract?.startDate) {
    reasons.push("Defina a data de inicio do contrato.");
  }
  if (contract?.hasFixedTermContract && !contract.endDate) {
    reasons.push("Defina a data de termino para contratos com prazo.");
  }
  if (contract?.experienceEnabled && (!contract.experienceStartDate || !contract.experienceEndDate)) {
    reasons.push("Preencha inicio e fim do periodo de experiencia.");
  }

  if (profile === "CLT") {
    const cltSalaryModel = contract?.salaryModel === "COMMISSION" ? "FIXED_PLUS_COMMISSION" : contract?.salaryModel;
    const commissionType = contract?.commissionType ?? "PERCENT";

    if (!contract?.salaryModel) {
      reasons.push("Defina a estrutura salarial do CLT.");
    }
    if (!hasPositiveNumber(contract?.fixedSalary)) {
      reasons.push("Informe o valor fixo mensal do CLT.");
    }
    if (cltSalaryModel === "FIXED_PLUS_COMMISSION") {
      if (commissionType === "PERCENT" && !hasPositiveNumber(contract?.commissionPercent)) {
        reasons.push("Informe o percentual de comissao do CLT.");
      }
      if (commissionType === "PER_RIDE" && !hasPositiveNumber(contract?.commissionPerRide)) {
        reasons.push("Informe o valor de comissao por corrida do CLT.");
      }
    }
  }

  if (profile === "INTERMITENTE") {
    if (!contract?.intermittentPaymentMode) {
      reasons.push("Defina a forma de pagamento principal do Intermitente.");
    }
    if (!contract?.intermittentConvocationMode) {
      reasons.push("Defina o modelo de convocacao do Intermitente.");
    }
    if (
      contract?.intermittentConvocationMode === "ADVANCE_NOTICE" &&
      contract.intermittentNoticeHours === undefined
    ) {
      reasons.push("Informe o aviso minimo (horas) da convocacao.");
    }
    if (
      (contract?.intermittentPaymentMode === "DAILY" ||
        contract?.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
      !hasPositiveNumber(contract?.intermittentDailyRate)
    ) {
      reasons.push("Informe o valor da diaria do Intermitente.");
    }
    if (
      (contract?.intermittentPaymentMode === "PER_RIDE" ||
        contract?.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
      (contract?.intermittentRideCompensationType ?? "AMOUNT") === "PERCENT" &&
      !hasPositiveNumber(contract?.intermittentRidePercent)
    ) {
      reasons.push("Informe o percentual por corrida do Intermitente.");
    }
    if (
      (contract?.intermittentPaymentMode === "PER_RIDE" ||
        contract?.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
      (contract?.intermittentRideCompensationType ?? "AMOUNT") === "AMOUNT" &&
      !hasPositiveNumber(contract?.intermittentRideAmount)
    ) {
      reasons.push("Informe o valor por corrida do Intermitente.");
    }
  }

  if (profile === "MEI") {
    if (!contract?.meiRemunerationModel) {
      reasons.push("Defina o modelo de remuneracao do MEI.");
    }
    if (!contract?.paymentMethod) {
      reasons.push("Defina a forma de pagamento do MEI.");
    }
    if (!contract?.paymentFrequency) {
      reasons.push("Defina a frequencia de pagamento do MEI.");
    }
    if (!contract?.meiWorkMode) {
      reasons.push("Defina a forma de atuacao do MEI.");
    }
    if (meiCnpjDigits.length !== 14) {
      reasons.push("Informe um CNPJ valido do prestador MEI.");
    }
    if (!contract?.meiLegalName?.trim()) {
      reasons.push("Informe a razao social do prestador MEI.");
    }
    if (!contract?.meiOperationVehicleMode) {
      reasons.push("Defina a forma de operacao do MEI.");
    }
    if (!contract?.meiFuelResponsibility) {
      reasons.push("Defina a responsabilidade de combustivel no MEI.");
    }
    if (!contract?.meiMaintenanceResponsibility) {
      reasons.push("Defina a responsabilidade de manutencao no MEI.");
    }
    if (contract?.meiRemunerationModel === "COMMISSION_PERCENT") {
      if (!hasPositiveNumber(contract?.meiCommissionPercent)) {
        reasons.push("Informe o percentual de comissao do MEI.");
      }
      if (!contract?.meiCommissionBase) {
        reasons.push("Defina a base da comissao do MEI.");
      }
    }
    if (contract?.meiRemunerationModel === "PER_RIDE_FIXED" && !hasPositiveNumber(contract?.meiPerRideAmount)) {
      reasons.push("Informe o valor por corrida do MEI.");
    }
    if (contract?.meiRemunerationModel === "RIDE_REVENUE_SHARE") {
      if (!hasPositiveNumber(contract?.meiRevenueSharePercent)) {
        reasons.push("Informe o percentual de repasse do MEI.");
      }
      if (!contract?.meiRevenueShareBase) {
        reasons.push("Defina a base do repasse do MEI.");
      }
    }
    if (contract?.meiRemunerationModel === "FIXED_PLUS_VARIABLE") {
      if (!hasPositiveNumber(contract?.meiFixedBaseAmount)) {
        reasons.push("Informe o valor base do MEI.");
      }
      if ((contract?.meiVariableType ?? "PERCENT") === "PERCENT" && !hasPositiveNumber(contract?.meiVariablePercent)) {
        reasons.push("Informe o percentual variavel do MEI.");
      }
      if ((contract?.meiVariableType ?? "PERCENT") === "AMOUNT" && !hasPositiveNumber(contract?.meiVariableAmount)) {
        reasons.push("Informe o valor variavel do MEI.");
      }
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

function isContractualProfile(profile: DriverContractProfile): boolean {
  return profile === "CLT" || profile === "INTERMITENTE" || profile === "MEI";
}

function resolveContractProfileLabel(profile: DriverContractProfile | DriverEmploymentContract["profile"]): string {
  if (profile === "CLT") return "CLT";
  if (profile === "INTERMITENTE") return "Intermitente";
  return "MEI";
}

function resolveDriverRoleLabel(profile: DriverContractProfile): string {
  if (profile === "CLT") return "Motorista CLT";
  if (profile === "INTERMITENTE") return "Motorista Intermitente";
  return "Motorista MEI";
}

function resolveContractLifecycleLabel(contract?: DriverEmploymentContract): string {
  if (!contract) return "Sem contrato gerado";
  if (contract.status === "ACTIVE") return "Contrato ativo";
  if (contract.status === "EXPIRING_SOON") return "Contrato expirando";
  if (contract.status === "EXPIRED") return "Contrato expirado";
  if (contract.status === "TERMINATED") return "Contrato encerrado";
  if (contract.status === "PENDING_SIGNATURE") {
    return "Contrato pendente de assinatura";
  }
  if (contract.status === "DRAFT") return "Contrato em rascunho";
  return "Contrato encerrado";
}

function resolveContractLifecycleTone(contract?: DriverEmploymentContract): string {
  if (!contract) return "none";
  if (contract.status === "ACTIVE") return "signed";
  if (contract.status === "EXPIRING_SOON") return "sent";
  if (contract.status === "EXPIRED") return "cancelled";
  if (contract.status === "TERMINATED") return "cancelled";
  if (contract.status === "PENDING_SIGNATURE") return "generated";
  if (contract.status === "DRAFT") return "draft";
  return "cancelled";
}

function resolveStatusLabel(status: DriverEmploymentContractStatus): string {
  if (status === "DRAFT") return "Rascunho";
  if (status === "PENDING_SIGNATURE") return "Pendente assinatura";
  if (status === "ACTIVE") return "Ativo";
  if (status === "EXPIRING_SOON") return "Expirando";
  if (status === "EXPIRED") return "Expirado";
  if (status === "TERMINATED") return "Encerrado";
  return "Encerrado";
}

function resolveStatusTone(status: DriverEmploymentContractStatus): string {
  if (status === "DRAFT") return "draft";
  if (status === "PENDING_SIGNATURE") return "generated";
  if (status === "ACTIVE") return "signed";
  if (status === "EXPIRING_SOON") return "sent";
  if (status === "EXPIRED") return "cancelled";
  if (status === "TERMINATED") return "cancelled";
  return "cancelled";
}

function hasPositiveNumber(value?: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function resolveTemplateByProfile(
  templates: DocumentTemplate[],
  profile: DriverContractProfile
): DocumentTemplate | undefined {
  if (templates.length === 0) return undefined;
  const profileToken = profile === "CLT" ? "CLT" : profile === "INTERMITENTE" ? "INTERMITENTE" : "MEI";
  return (
    templates.find((item) => item.key.toUpperCase().includes(profileToken)) ??
    templates.find((item) => item.name.toUpperCase().includes(profileToken)) ??
    templates[0]
  );
}

function renderTemplateContent(
  content: string,
  input: {
    driverId?: string;
    driverName: string;
    address?: DriverAddress;
    contractProfile: DriverContractProfile;
    contract?: DriverContract;
    journey?: DriverJourney;
    companyProfile?: CompanyProfileConfig | null;
    generatedAt: string;
  }
): string {
  const { driverId, driverName, address, contractProfile, contract, journey, companyProfile, generatedAt } = input;
  const generatedDateValue = new Date(generatedAt);
  const hasValidGeneratedDate = !Number.isNaN(generatedDateValue.getTime());
  const generatedDateOnly = hasValidGeneratedDate
    ? generatedDateValue.toLocaleDateString("pt-BR")
    : "-";
  const generatedTimeOnly = hasValidGeneratedDate
    ? generatedDateValue.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "-";
  const generatedDay = hasValidGeneratedDate ? String(generatedDateValue.getDate()).padStart(2, "0") : "-";
  const generatedMonth = hasValidGeneratedDate ? String(generatedDateValue.getMonth() + 1).padStart(2, "0") : "-";
  const generatedMonthName = hasValidGeneratedDate
    ? generatedDateValue.toLocaleDateString("pt-BR", { month: "long" })
    : "-";
  const generatedYear = hasValidGeneratedDate ? String(generatedDateValue.getFullYear()) : "-";
  const companyAddressFull = buildCompanyAddressFull(companyProfile);
  const driverAddressFull = buildDriverAddressFull(address);
  const driverRole = resolveDriverRoleLabel(contractProfile);

  const replacements: Record<string, string> = {
    "{{driver.id}}": driverId || "-",
    "{{driver.name}}": driverName || "-",
    "{{driver.role}}": driverRole,
    "{{driver.cpf}}": "-",
    "{{driver.phone}}": "-",
    "{{driver.email}}": "-",
    "{{driver.driverType}}": "-",
    "{{driver.address.zipCode}}": address?.cep || "-",
    "{{driver.address.street}}": address?.street || "-",
    "{{driver.address.number}}": address?.number || "-",
    "{{driver.address.neighborhood}}": address?.neighborhood || "-",
    "{{driver.address.complement}}": address?.complement || "-",
    "{{driver.address.city}}": address?.city || "-",
    "{{driver.address.state}}": address?.state || "-",
    "{{driver.address.type}}": resolveDriverAddressTypeLabel(address?.addressType),
    "{{driver.address.full}}": driverAddressFull,
    "{{contract.startDate}}": formatDate(contract?.startDate),
    "{{contract.endDate}}": formatDate(contract?.endDate),
    "{{contract.profile}}": resolveContractProfileLabel(contractProfile),
    "{{contract.salaryModel}}": contract?.salaryModel || "-",
    "{{contract.paymentMethod}}": contract?.paymentMethod || "-",
    "{{contract.paymentFrequency}}": contract?.paymentFrequency || "-",
    "{{contract.intermittentPaymentMode}}": contract?.intermittentPaymentMode || "-",
    "{{journey.shift}}": journey?.shift || "-",
    "{{journey.workStart}}": journey?.startTime || journey?.availabilityStartTime || "-",
    "{{journey.workEnd}}": journey?.endTime || journey?.availabilityEndTime || "-",
    "{{company.legalName}}": companyProfile?.legalName || "-",
    "{{company.tradeName}}": companyProfile?.tradeName || companyProfile?.legalName || "-",
    "{{company.cnpj}}": companyProfile?.cnpj || "-",
    "{{company.phone}}": companyProfile?.phone || "-",
    "{{company.email}}": companyProfile?.email || "-",
    "{{company.website}}": companyProfile?.website || "-",
    "{{company.address.zipCode}}": companyProfile?.zipCode || "-",
    "{{company.address.street}}": companyProfile?.street || "-",
    "{{company.address.number}}": companyProfile?.number || "-",
    "{{company.address.neighborhood}}": companyProfile?.neighborhood || "-",
    "{{company.address.city}}": companyProfile?.city || "-",
    "{{company.address.state}}": companyProfile?.state || "-",
    "{{company.address.full}}": companyAddressFull,
    "{{company.representative.name}}": companyProfile?.legalRepresentativeName || "-",
    "{{company.representative.cpf}}": companyProfile?.legalRepresentativeCpf || "-",
    "{{company.representative.role}}": companyProfile?.legalRepresentativeRole || "-",
    "{{company.contractSignatureCity}}":
      companyProfile?.contractSignatureCity || companyProfile?.city || "-",
    "{{generatedAt}}": formatDateTime(generatedAt),
    "{{generatedDate}}": generatedDateOnly,
    "{{generatedTime}}": generatedTimeOnly,
    "{{generatedDay}}": generatedDay,
    "{{generatedMonth}}": generatedMonth,
    "{{generatedMonthName}}": generatedMonthName,
    "{{generatedYear}}": generatedYear
  };

  return content.replace(/\{\{[^{}]+\}\}/g, (token) => replacements[token] ?? token);
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function extractContractSignatureEvidence(contract: DriverEmploymentContract): {
  signedAt?: string;
  signerName?: string;
  signerDocument?: string;
  signerEmail?: string;
  signerIp?: string;
} {
  const snapshot = asRecord(contract.snapshot);
  const signatureRequest = asRecord(snapshot?.signatureRequest);
  const digitalSignature = asRecord(snapshot?.digitalSignature);

  return {
    signedAt:
      firstNonEmptyString(contract.signedAt) ||
      firstNonEmptyString(readStringField(digitalSignature, "signedAt")) ||
      firstNonEmptyString(readStringField(signatureRequest, "signedAt")),
    signerName:
      firstNonEmptyString(readStringField(digitalSignature, "signerName")) ||
      firstNonEmptyString(readStringField(signatureRequest, "signerName")),
    signerDocument:
      firstNonEmptyString(readStringField(digitalSignature, "signerDocument")) ||
      firstNonEmptyString(readStringField(signatureRequest, "signerDocument")),
    signerEmail:
      firstNonEmptyString(readStringField(digitalSignature, "signerEmail")) ||
      firstNonEmptyString(readStringField(signatureRequest, "signerEmail")),
    signerIp:
      normalizeIpText(readStringField(digitalSignature, "signerIp")) ||
      normalizeIpText(readStringField(signatureRequest, "signerIp"))
  };
}

function extractContractAuditLogs(
  contract: DriverEmploymentContract,
  processNote: string
): Array<{ createdAt: string; message: string }> {
  const snapshot = asRecord(contract.snapshot);
  const rawEvents = Array.isArray(snapshot?.auditEvents) ? snapshot.auditEvents : [];

  const mapped = rawEvents
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      createdAt: firstNonEmptyString(readStringField(entry, "createdAt")) || contract.generatedAt,
      message: describeContractAuditEvent(entry)
    }))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  if (mapped.length === 0) {
    mapped.push({
      createdAt: contract.generatedAt,
      message: "Contrato gerado automaticamente pelo sistema."
    });
  }

  mapped.push({
    createdAt: firstNonEmptyString(contract.signedAt) || contract.generatedAt,
    message: processNote
  });

  return mapped;
}

function describeContractAuditEvent(event: Record<string, unknown>): string {
  const type = firstNonEmptyString(readStringField(event, "type")) || "EVENT";
  const signerEmail = firstNonEmptyString(readStringField(event, "signerEmail"));
  const signerName = firstNonEmptyString(readStringField(event, "signerName"));
  const signerDocument = firstNonEmptyString(readStringField(event, "signerDocument"));
  const signerIp = normalizeIpText(readStringField(event, "signerIp"));
  const expiresAt = firstNonEmptyString(readStringField(event, "expiresAt"));
  const source = firstNonEmptyString(readStringField(event, "source"));
  const explicitMessage = firstNonEmptyString(readStringField(event, "message"));

  if (type === "CONTRACT_GENERATED") {
    return "Contrato gerado automaticamente pelo sistema.";
  }
  if (type === "CONTRACT_RENEWED") {
    return "Contrato renovado com base no ciclo anterior.";
  }
  if (type === "SIGNATURE_REQUESTED") {
    return `Solicitacao de assinatura enviada para ${signerEmail || "e-mail nao informado"}${expiresAt ? ` com validade ate ${formatDateTime(expiresAt)}` : ""}.`;
  }
  if (type === "SIGNED_VIA_LINK") {
    return `Assinatura confirmada via link por ${signerName || signerEmail || "assinante nao identificado"}${signerDocument ? ` (documento ${signerDocument})` : ""}${signerIp ? `, IP ${signerIp}` : ""}.`;
  }
  if (type === "CONTRACT_TERMINATED") {
    return "Contrato encerrado/cancelado.";
  }
  if (explicitMessage) {
    return explicitMessage;
  }
  return `Evento ${type}${source ? ` (${source})` : ""}.`;
}

async function computeSha256Hex(value: string): Promise<string> {
  try {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      return "-";
    }
    const data = new TextEncoder().encode(value);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "-";
  }
}

function stripEmbeddedSignatureEvidence(content: string): string {
  if (!content) {
    return content;
  }

  if (looksLikeHtml(content)) {
    // Remove the appended signature section injected at contract-sign confirmation.
    return content
      .replace(
        /<section[^>]*>\s*<h3[^>]*>\s*Assinatura digital\s*<\/h3>[\s\S]*?<\/section>\s*$/i,
        ""
      )
      .trim();
  }

  // Remove plain-text signature appendix when content is not HTML.
  return content
    .replace(
      /[\r\n]+\s*-{20,}\s*[\r\n]+\s*ASSINATURA DIGITAL[\s\S]*?-{20,}\s*$/i,
      ""
    )
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readStringField(
  source: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  if (!source) return undefined;
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

function firstNonEmptyString(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeIpText(value?: string): string | undefined {
  const normalized = firstNonEmptyString(value);
  if (!normalized) return undefined;
  if (normalized === "::1") return "127.0.0.1";
  if (normalized.startsWith("::ffff:")) return normalized.slice("::ffff:".length);
  return normalized;
}

function resolveDriverAddressTypeLabel(addressType?: DriverAddress["addressType"]): string {
  if (addressType === "OWN") return "Endereco proprio";
  if (addressType === "RENTED") return "Endereco alugado";
  return "-";
}

function buildDriverAddressFull(address?: DriverAddress): string {
  if (!address) return "-";
  const lineOne = [address.street, address.number].filter(Boolean).join(", ");
  const cityState = [address.city, address.state].filter(Boolean).join(" - ");
  const lineTwo = [address.neighborhood, cityState, address.cep].filter(Boolean).join(" - ");
  const composed = [lineOne, lineTwo].filter(Boolean).join(", ");
  return composed || "-";
}

function buildCompanyAddressFull(companyProfile?: CompanyProfileConfig | null): string {
  if (!companyProfile) return "-";
  const lineOne = [companyProfile.street, companyProfile.number].filter(Boolean).join(", ");
  const cityState = [companyProfile.city, companyProfile.state].filter(Boolean).join(" - ");
  const lineTwo = [companyProfile.neighborhood, cityState, companyProfile.zipCode]
    .filter(Boolean)
    .join(" - ");
  const fullAddress = [lineOne, lineTwo].filter(Boolean).join(", ");
  return fullAddress || "-";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

