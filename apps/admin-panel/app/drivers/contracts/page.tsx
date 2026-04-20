"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DriverEmploymentContract,
  DriverEmploymentContractEndorsementType,
  DriverEmploymentContractStatus,
  DriverProfile,
  request
} from "../../../lib/api";
import { DriverProfileEditorModal } from "../../../components/driver-profile-editor-modal";

type ProfileFilter = "ALL" | "CLT" | "INTERMITENTE";
type StatusFilter = "ALL" | DriverEmploymentContractStatus | "NONE";

type SelectedContractPreview = {
  driverName: string;
  contract: DriverEmploymentContract;
};

type EndorsementTarget = {
  driverId: string;
  driverName: string;
  contractId: string;
};

export default function DriverContractsPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Carregando contratos de motoristas.");
  const [searchInput, setSearchInput] = useState("");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [generatingDriverId, setGeneratingDriverId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<SelectedContractPreview | null>(null);
  const [endorsementTarget, setEndorsementTarget] = useState<EndorsementTarget | null>(null);
  const [endorsementType, setEndorsementType] = useState<DriverEmploymentContractEndorsementType>("OTHER");
  const [endorsementEffectiveDate, setEndorsementEffectiveDate] = useState(() => toDateInput(new Date()));
  const [endorsementNotes, setEndorsementNotes] = useState("");

  async function loadDrivers() {
    setIsLoading(true);
    try {
      const data = await request<DriverProfile[]>("/admin/drivers");
      setDrivers(data);
      setStatusMessage(`${data.length} motorista(s) carregado(s) para gestao contratual.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Nao foi possivel carregar contratos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDrivers();
  }, []);

  const contractCandidates = useMemo(
    () =>
      drivers.filter(
        (driver) => driver.contractProfile === "CLT" || driver.contractProfile === "INTERMITENTE"
      ),
    [drivers]
  );

  const filteredDrivers = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return contractCandidates.filter((driver) => {
      const latest = getLatestEmploymentContract(driver);
      const matchesProfile = profileFilter === "ALL" || driver.contractProfile === profileFilter;
      const matchesSearch =
        query.length === 0 ||
        [driver.name, driver.cpf, driver.phone, driver.email ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "NONE" && !latest) ||
        (latest && latest.status === statusFilter);

      return matchesProfile && matchesSearch && matchesStatus;
    });
  }, [contractCandidates, profileFilter, searchInput, statusFilter]);

  const overview = useMemo(() => {
    const total = contractCandidates.length;
    const generated = contractCandidates.filter((driver) => Boolean(getLatestEmploymentContract(driver))).length;
    const signed = contractCandidates.filter((driver) => {
      const status = getLatestEmploymentContract(driver)?.status;
      return status === "ACTIVE" || status === "EXPIRING_SOON";
    }).length;
    const pending = total - generated;
    return { total, generated, signed, pending };
  }, [contractCandidates]);

  async function generateContract(driver: DriverProfile) {
    setGeneratingDriverId(driver.id);
    try {
      const selectedTemplatePayload =
        driver.contract?.employmentTemplateKey && driver.contract.employmentTemplateKey.trim().length > 0
          ? {
              templateKey: driver.contract.employmentTemplateKey.trim(),
              templateName: driver.contract.employmentTemplateName?.trim() || undefined,
              templateVersion: driver.contract.employmentTemplateVersion?.trim() || undefined
            }
          : undefined;
      const updated = await request<DriverProfile>(`/admin/drivers/${driver.id}/contracts/generate`, {
        method: "POST",
        body: JSON.stringify(selectedTemplatePayload ?? {})
      });
      setDrivers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(`Contrato gerado automaticamente para ${driver.name}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao gerar contrato.");
    } finally {
      setGeneratingDriverId(null);
    }
  }

  async function renewContract(driver: DriverProfile, contractId: string) {
    setGeneratingDriverId(driver.id);
    try {
      const updated = await request<DriverProfile>(`/admin/drivers/${driver.id}/contracts/${contractId}/renew`, {
        method: "POST"
      });
      setDrivers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(`Renovacao gerada automaticamente para ${driver.name}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao gerar renovacao.");
    } finally {
      setGeneratingDriverId(null);
    }
  }

  async function activateContract(driver: DriverProfile, contractId: string) {
    setGeneratingDriverId(driver.id);
    try {
      const updated = await request<DriverProfile>(`/admin/drivers/${driver.id}/contracts/${contractId}/activate`, {
        method: "POST"
      });
      setDrivers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(`Contrato ativado para ${driver.name}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao ativar contrato.");
    } finally {
      setGeneratingDriverId(null);
    }
  }

  async function createEndorsement(
    driver: DriverProfile,
    contractId: string,
    payload: {
      type: DriverEmploymentContractEndorsementType;
      effectiveDate: string;
      notes?: string;
    }
  ) {
    setGeneratingDriverId(driver.id);
    try {
      const updated = await request<DriverProfile>(`/admin/drivers/${driver.id}/contracts/${contractId}/endorse`, {
        method: "POST",
        body: JSON.stringify({
          type: payload.type,
          effectiveDate: payload.effectiveDate,
          notes: payload.notes,
          changes: { source: "DRIVER_CONTRACTS_PAGE", endorsementType: payload.type }
        })
      });
      setDrivers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(`Endosso criado para ${driver.name}.`);
      setEndorsementTarget(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao criar endosso.");
    } finally {
      setGeneratingDriverId(null);
    }
  }

  function openEndorsementModal(driver: DriverProfile, contractId: string) {
    setEndorsementType("OTHER");
    setEndorsementEffectiveDate(toDateInput(new Date()));
    setEndorsementNotes("");
    setEndorsementTarget({
      driverId: driver.id,
      driverName: driver.name,
      contractId
    });
  }

  async function handleConfirmEndorsement() {
    if (!endorsementTarget || !endorsementEffectiveDate.trim()) {
      return;
    }

    const driver = drivers.find((item) => item.id === endorsementTarget.driverId);
    if (!driver) {
      return;
    }

    await createEndorsement(driver, endorsementTarget.contractId, {
      type: endorsementType,
      effectiveDate: endorsementEffectiveDate.trim(),
      notes: endorsementNotes.trim() || undefined
    });
  }

  return (
    <main className="page-shell driver-contracts-shell">
      <section className="drivers-page-topbar driver-list-topbar">
        <div className="driver-list-topbar-copy">
          <div className="driver-list-topbar-header">
            <div className="driver-list-topbar-heading">
              <p className="eyebrow">Motoristas - Contratos</p>
              <h1>Contratos de trabalho</h1>
              <p className="drivers-page-status">
                Gere contratos CLT e Intermitente automaticamente a partir dos dados do cadastro.
                {" "}
                {statusMessage}
              </p>
            </div>
            <div className="drivers-page-head-actions">
              <Link href="/documents/templates" className="button-link secondary-link">
                Templates de documentos
              </Link>
              <Link href="/drivers" className="button-link secondary-link">
                Ir para cadastro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="drivers-overview-strip driver-list-overview-strip">
        <article className="drivers-overview-item">
          <span>Elegiveis</span>
          <strong>{overview.total}</strong>
          <small>CLT e Intermitente com base contratual.</small>
        </article>
        <article className="drivers-overview-item">
          <span>Gerados</span>
          <strong>{overview.generated}</strong>
          <small>Motoristas com documento gerado.</small>
        </article>
        <article className="drivers-overview-item">
          <span>Assinados</span>
          <strong>{overview.signed}</strong>
          <small>Contratos marcados como assinados.</small>
        </article>
        <article className="drivers-overview-item">
          <span>Pendentes</span>
          <strong>{overview.pending}</strong>
          <small>Sem documento gerado.</small>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Esteira de contratos</h2>
              <span>{filteredDrivers.length} registro(s) visiveis na listagem atual.</span>
            </div>
            <div className="drivers-table-tools driver-contracts-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por nome, CPF ou contato..."
                />
              </label>
              <label>
                <span>Perfil</span>
                <select
                  className="select"
                  value={profileFilter}
                  onChange={(event) => setProfileFilter(event.target.value as ProfileFilter)}
                >
                  <option value="ALL">Todos</option>
                  <option value="CLT">CLT</option>
                  <option value="INTERMITENTE">Intermitente</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  className="select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="ALL">Todos</option>
                  <option value="NONE">Sem contrato</option>
                  <option value="PENDING_SIGNATURE">Pendente assinatura</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="EXPIRING_SOON">Expirando</option>
                  <option value="EXPIRED">Expirado</option>
                  <option value="DRAFT">Rascunho</option>
                  <option value="TERMINATED">Encerrado</option>
                </select>
              </label>
            </div>
          </div>

          <div className="drivers-table-wrap">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Perfil</th>
                  <th>Vigencia</th>
                  <th>Ultimo contrato</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const latest = getLatestEmploymentContract(driver);
                  const pendingContract = getPendingSignatureContract(driver);
                  const activeContract = getActiveContract(driver);
                  const renewalBase = getRenewalBaseContract(driver);
                  const canGenerate = !pendingContract && !activeContract;
                  const canRenew = !pendingContract && Boolean(renewalBase);
                  const canActivate = Boolean(pendingContract);
                  const canEndorse = Boolean(activeContract);
                  return (
                    <tr key={driver.id}>
                      <td>
                        <strong>{driver.name}</strong>
                        <small>{driver.cpf}</small>
                      </td>
                      <td>{driver.contractProfile === "CLT" ? "CLT" : "Intermitente"}</td>
                      <td>{resolveContractTerm(driver)}</td>
                      <td>
                        {latest ? (
                          <>
                            <strong>{latest.title}</strong>
                            <small>{formatDateTime(latest.generatedAt)}</small>
                            <small>{latest.templateName || latest.templateKey} ({latest.templateVersion})</small>
                          </>
                        ) : (
                          <span>Nenhum contrato gerado</span>
                        )}
                      </td>
                      <td>
                        <span className={`driver-contract-status is-${resolveStatusTone(latest?.status)}`}>
                          {resolveStatusLabel(latest?.status)}
                        </span>
                      </td>
                      <td>
                        <div className="driver-contract-actions">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => generateContract(driver)}
                            disabled={generatingDriverId === driver.id || !canGenerate}
                          >
                            {generatingDriverId === driver.id ? "Gerando..." : "Gerar contrato"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => renewalBase && renewContract(driver, renewalBase.id)}
                            disabled={generatingDriverId === driver.id || !canRenew}
                          >
                            {generatingDriverId === driver.id ? "Renovando..." : "Renovar"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => pendingContract && activateContract(driver, pendingContract.id)}
                            disabled={generatingDriverId === driver.id || !canActivate}
                          >
                            {generatingDriverId === driver.id ? "Ativando..." : "Marcar assinado"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => activeContract && openEndorsementModal(driver, activeContract.id)}
                            disabled={generatingDriverId === driver.id || !canEndorse}
                          >
                            Endosso
                          </button>
                          {latest ? (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setSelectedPreview({ driverName: driver.name, contract: latest })}
                            >
                              Visualizar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="driver-contract-empty">
                        Nenhum motorista encontrado para os filtros atuais.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <DriverProfileEditorModal
        open={Boolean(endorsementTarget)}
        title={endorsementTarget ? `Criar endosso - ${endorsementTarget.driverName}` : "Criar endosso"}
        description="Registre o aditivo do contrato ativo."
        onClose={() => setEndorsementTarget(null)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setEndorsementTarget(null)} disabled={Boolean(generatingDriverId)}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleConfirmEndorsement()} disabled={Boolean(generatingDriverId) || !endorsementEffectiveDate.trim()}>
              {generatingDriverId ? "Salvando..." : "Salvar endosso"}
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
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={Boolean(selectedPreview)}
        title={selectedPreview ? `Contrato - ${selectedPreview.driverName}` : "Contrato"}
        description={
          selectedPreview
            ? `${resolveStatusLabel(selectedPreview.contract.status)} - Gerado em ${formatDateTime(
                selectedPreview.contract.generatedAt
              )}`
            : undefined
        }
        onClose={() => setSelectedPreview(null)}
        footer={
          <button type="button" className="secondary" onClick={() => setSelectedPreview(null)}>
            Fechar
          </button>
        }
      >
        {selectedPreview ? (
          <div className="driver-contract-preview">
            <pre>{selectedPreview.contract.content}</pre>
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </main>
  );
}

function getLatestEmploymentContract(driver: DriverProfile): DriverEmploymentContract | undefined {
  const contracts = driver.contract?.employmentContracts;
  if (!contracts || contracts.length === 0) {
    return undefined;
  }

  return [...contracts].sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt))[0];
}

function resolveStatusLabel(status?: DriverEmploymentContractStatus): string {
  if (!status) return "Sem contrato";
  if (status === "DRAFT") return "Rascunho";
  if (status === "PENDING_SIGNATURE") return "Pendente assinatura";
  if (status === "ACTIVE") return "Ativo";
  if (status === "EXPIRING_SOON") return "Expirando";
  if (status === "EXPIRED") return "Expirado";
  return "Encerrado";
}

function resolveStatusTone(status?: DriverEmploymentContractStatus): string {
  if (!status) return "none";
  if (status === "DRAFT") return "draft";
  if (status === "PENDING_SIGNATURE") return "generated";
  if (status === "ACTIVE") return "signed";
  if (status === "EXPIRING_SOON") return "sent";
  if (status === "EXPIRED" || status === "TERMINATED") return "cancelled";
  return "none";
}

function getPendingSignatureContract(driver: DriverProfile): DriverEmploymentContract | undefined {
  const contracts = driver.contract?.employmentContracts ?? [];
  return [...contracts]
    .sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt))
    .find((item) => item.status === "DRAFT" || item.status === "PENDING_SIGNATURE");
}

function getActiveContract(driver: DriverProfile): DriverEmploymentContract | undefined {
  const contracts = driver.contract?.employmentContracts ?? [];
  return [...contracts]
    .sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt))
    .find((item) => item.status === "ACTIVE" || item.status === "EXPIRING_SOON");
}

function getRenewalBaseContract(driver: DriverProfile): DriverEmploymentContract | undefined {
  const contracts = driver.contract?.employmentContracts ?? [];
  return [...contracts]
    .sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt))
    .find((item) => item.status === "ACTIVE" || item.status === "EXPIRING_SOON" || item.status === "EXPIRED");
}

function resolveContractTerm(driver: DriverProfile): string {
  const contract = driver.contract;
  if (!contract?.startDate) {
    return "Nao configurado";
  }

  if (contract.hasFixedTermContract && contract.endDate) {
    return `${formatDate(contract.startDate)} ate ${formatDate(contract.endDate)}`;
  }

  return `Inicio em ${formatDate(contract.startDate)}`;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parsed);
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}
