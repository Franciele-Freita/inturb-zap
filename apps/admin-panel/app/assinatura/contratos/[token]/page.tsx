"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DriverContractPublicSignatureSession, request } from "../../../../lib/api";

export default function ContractSignaturePage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(() => {
    const raw = params?.token;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [params]);
  const [session, setSession] = useState<DriverContractPublicSignatureSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage("Token de assinatura invalido.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    void request<DriverContractPublicSignatureSession>(`/contracts/signature/${encodeURIComponent(token)}`)
      .then((loaded) => {
        if (!isMounted) {
          return;
        }
        setSession(loaded);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setSession(null);
        setErrorMessage(error instanceof Error ? error.message : "Falha ao abrir contrato para assinatura.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  function handleConfirmSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !session?.canSign) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    void request<DriverContractPublicSignatureSession>(`/contracts/signature/${encodeURIComponent(token)}/confirm`, {
      method: "POST",
      body: JSON.stringify({
        signerName: signerName.trim() || undefined,
        signerDocument: signerDocument.trim() || undefined
      })
    })
      .then((updated) => {
        setSession(updated);
        setSuccessMessage("Assinatura registrada com sucesso.");
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Falha ao confirmar assinatura.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handlePrintClick() {
    if (!session || typeof window === "undefined") {
      return;
    }
    window.print();
  }

  return (
    <main className="contract-signature-page">
      <section className="contract-signature-shell">
        <header className="contract-signature-header">
          <div>
            <h1>Assinatura digital de contrato</h1>
            <p>Revise o documento e confirme a assinatura do vinculo.</p>
          </div>
          <button type="button" className="secondary" onClick={handlePrintClick}>
            Imprimir
          </button>
        </header>

        {isLoading ? <p className="helper-text">Carregando contrato...</p> : null}
        {errorMessage ? <p className="helper-text contract-signature-error">{errorMessage}</p> : null}
        {successMessage ? <p className="helper-text contract-signature-success">{successMessage}</p> : null}

        {session ? (
          <>
            <article className="contract-signature-summary panel">
              <div>
                <strong>{session.title}</strong>
                <small>
                  {resolveStatusLabel(session.status)} - {formatDateTime(session.generatedAt)}
                </small>
                <small>
                  {session.templateName || "Modelo"} ({session.templateVersion})
                </small>
                <small>Codigo do documento: {session.documentCode}</small>
                <small>Hash SHA-256: {session.contentHash}</small>
              </div>
              <span className={`driver-editor-contracts-status-chip is-${resolveStatusTone(session.status)}`}>
                {resolveStatusLabel(session.status)}
              </span>
            </article>

            {session.message ? <p className="helper-text">{session.message}</p> : null}
            {session.signedAt ? (
              <article className="panel contract-signature-proof">
                <strong>Assinatura digital registrada</strong>
                <small>Data/hora: {formatDateTime(session.signedAt)}</small>
                <small>Assinante: {session.signerName || "Nao informado"}</small>
                <small>Documento: {session.signerDocument || "Nao informado"}</small>
                <small>E-mail: {session.signerEmail || "Nao informado"}</small>
              </article>
            ) : null}

            <article className="contract-signature-paper">
              {looksLikeHtml(session.content) ? (
                <div
                  className="contract-signature-content"
                  dangerouslySetInnerHTML={{ __html: session.content }}
                />
              ) : (
                <pre className="contract-signature-content contract-signature-content-pre">{session.content}</pre>
              )}
            </article>

            <article className="panel contract-signature-log">
              <strong>Log do documento</strong>
              {(session.auditLogs?.length ?? 0) === 0 ? (
                <small>Nenhum evento de assinatura registrado.</small>
              ) : (
                <ul>
                  {(session.auditLogs ?? []).map((entry, index) => (
                    <li key={`${entry.createdAt}-${entry.event}-${index}`}>
                      <span>{formatDateTime(entry.createdAt)}</span>
                      <p>{entry.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <footer className="contract-signature-print-footer" aria-hidden="true">
              <span>Documento {session.documentCode}</span>
              <span>Hash {session.contentHash}</span>
              <span>Assinatura digital interna</span>
            </footer>

            {session.canSign ? (
              <form className="panel contract-signature-form" onSubmit={handleConfirmSignature}>
                <strong>Confirmacao</strong>
                <small>Assinante: {session.signerEmail || "e-mail nao informado"}</small>
                <div className="form-grid">
                  <label>
                    Nome do assinante (opcional)
                    <input
                      value={signerName}
                      onChange={(event) => setSignerName(event.target.value)}
                      placeholder="Nome completo"
                    />
                  </label>
                  <label>
                    Documento (opcional)
                    <input
                      value={signerDocument}
                      onChange={(event) => setSignerDocument(event.target.value)}
                      placeholder="CPF/CNPJ"
                    />
                  </label>
                </div>
                <div className="action-row">
                  <button type="submit" disabled={!session.canSign || isSubmitting}>
                    {isSubmitting ? "Assinando..." : "Assinar contrato"}
                  </button>
                </div>
              </form>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function resolveStatusLabel(status: DriverContractPublicSignatureSession["status"]): string {
  if (status === "DRAFT") return "Rascunho";
  if (status === "PENDING_SIGNATURE") return "Pendente assinatura";
  if (status === "ACTIVE") return "Ativo";
  if (status === "EXPIRING_SOON") return "Expirando";
  if (status === "EXPIRED") return "Expirado";
  return "Encerrado";
}

function resolveStatusTone(status: DriverContractPublicSignatureSession["status"]): string {
  if (status === "DRAFT") return "draft";
  if (status === "PENDING_SIGNATURE") return "generated";
  if (status === "ACTIVE") return "signed";
  if (status === "EXPIRING_SOON") return "sent";
  return "cancelled";
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
