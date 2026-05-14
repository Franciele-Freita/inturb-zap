"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DriverContractPublicSignatureSession, request } from "../../../../lib/api";

type PageState = "loading" | "ready" | "signed" | "expired" | "invalid" | "error";

export default function ContractSignaturePage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(() => {
    const raw = params?.token;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [params]);

  const [session, setSession] = useState<DriverContractPublicSignatureSession | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const companyName =
    process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
    "Inturb";

  useEffect(() => {
    if (!token) {
      setSession(null);
      setPageState("invalid");
      setFeedbackMessage("Link invalido ou nao encontrado.");
      return;
    }

    let isMounted = true;
    setSession(null);
    setAcceptedTerms(false);
    setFeedbackMessage("");
    setPageState("loading");

    void request<DriverContractPublicSignatureSession>(`/contracts/signature/${encodeURIComponent(token)}`)
      .then((loaded) => {
        if (!isMounted) {
          return;
        }

        setSession(loaded);

        if (loaded.canSign) {
          setPageState("ready");
          return;
        }

        if (loaded.signedAt) {
          setPageState("signed");
          return;
        }

        if (isExpiredSession(loaded)) {
          setPageState("expired");
          return;
        }

        setPageState("error");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Nao foi possivel abrir este contrato.";
        const normalized = normalizeText(message);

        setSession(null);
        if (normalized.includes("expir")) {
          setPageState("expired");
          setFeedbackMessage("Este link de assinatura expirou. Solicite um novo envio.");
        } else if (
          normalized.includes("inval") ||
          normalized.includes("nao encontrado") ||
          normalized.includes("not found")
        ) {
          setPageState("invalid");
          setFeedbackMessage("Link invalido ou nao encontrado.");
        } else {
          setPageState("error");
          setFeedbackMessage(message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  function handleConfirmSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !session?.canSign || !acceptedTerms) {
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage("");

    void request<DriverContractPublicSignatureSession>(`/contracts/signature/${encodeURIComponent(token)}/confirm`, {
      method: "POST",
      body: JSON.stringify({})
    })
      .then((updated) => {
        setSession(updated);
        setAcceptedTerms(false);
        setPageState(updated.signedAt ? "signed" : "error");
        setFeedbackMessage("Contrato assinado com sucesso. Uma copia foi enviada para seu email.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Falha ao assinar contrato.";
        const normalized = normalizeText(message);

        if (normalized.includes("expir")) {
          setPageState("expired");
          setFeedbackMessage("Este link de assinatura expirou. Solicite um novo envio.");
        } else if (normalized.includes("nao pode") || normalized.includes("ja assinado") || normalized.includes("assinado")) {
          setPageState("signed");
          setFeedbackMessage("Este contrato ja foi assinado.");
        } else {
          setFeedbackMessage(message);
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleDownloadContract() {
    if (!session?.content || typeof window === "undefined") {
      return;
    }

    const isHtml = looksLikeHtml(session.content);
    const mimeType = isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
    const fileExtension = isHtml ? "html" : "txt";
    const blob = new Blob([session.content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contrato-${session.documentCode}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="public-contract-signature-page">
      <section className="public-contract-signature-shell">
        <header className="public-contract-signature-header">
          <h1>Assinatura de contrato</h1>
          <p>{companyName}</p>
        </header>

        {pageState === "loading" ? <p className="public-contract-signature-muted">Carregando contrato...</p> : null}

        {pageState === "invalid" ? (
          <StatusCard
            title="Link invalido ou nao encontrado"
            description={feedbackMessage || "Verifique o link recebido por e-mail e tente novamente."}
          />
        ) : null}

        {pageState === "expired" ? (
          <StatusCard
            title="Este link de assinatura expirou"
            description="Solicite um novo envio"
          />
        ) : null}

        {pageState === "error" ? (
          <StatusCard
            title="Nao foi possivel concluir a assinatura"
            description={feedbackMessage || "Tente novamente em alguns instantes."}
          />
        ) : null}

        {session && (pageState === "ready" || pageState === "signed") ? (
          <>
            <article className="public-contract-signature-card">
              <strong>Identificacao do assinante</strong>
              <div className="public-contract-signature-id-grid">
                <p>
                  <span>Nome completo</span>
                  <strong>{session.driverName || "Nao informado"}</strong>
                </p>
                <p>
                  <span>E-mail</span>
                  <strong>{session.signerEmail || "Nao informado"}</strong>
                </p>
              </div>
              <small>Voce esta assinando um contrato de trabalho</small>
            </article>

            <article className="public-contract-signature-card">
              <div className="public-contract-signature-card-head">
                <strong>Contrato</strong>
                <button type="button" className="secondary" onClick={handleDownloadContract}>
                  Baixar contrato
                </button>
              </div>
              <div className="public-contract-signature-document" role="document" aria-label="Conteudo do contrato">
                {looksLikeHtml(session.content) ? (
                  <div dangerouslySetInnerHTML={{ __html: session.content }} />
                ) : (
                  <pre>{session.content}</pre>
                )}
              </div>
            </article>

            {pageState === "ready" ? (
              <form className="public-contract-signature-card" onSubmit={handleConfirmSignature}>
                <label className="public-contract-signature-checkbox">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                  />
                  <span>Declaro que li e concordo com os termos deste contrato</span>
                </label>

                {feedbackMessage ? <p className="public-contract-signature-feedback">{feedbackMessage}</p> : null}

                <div className="public-contract-signature-actions">
                  <button type="submit" disabled={!acceptedTerms || isSubmitting}>
                    {isSubmitting ? "Assinando..." : "Assinar contrato"}
                  </button>
                </div>
              </form>
            ) : null}

            {pageState === "signed" ? (
              <StatusCard
                title="Este contrato ja foi assinado"
                description={`Data/hora da assinatura: ${formatDateTime(session.signedAt)}`}
                success
              />
            ) : null}

            {feedbackMessage && pageState === "signed" ? (
              <p className="public-contract-signature-feedback success">{feedbackMessage}</p>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function StatusCard({
  title,
  description,
  success = false
}: {
  title: string;
  description: string;
  success?: boolean;
}) {
  return (
    <article className={`public-contract-signature-status${success ? " is-success" : ""}`}>
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
  );
}

function isExpiredSession(session: DriverContractPublicSignatureSession): boolean {
  if (session.status === "EXPIRED") {
    return true;
  }

  const message = normalizeText(session.message);
  if (message.includes("expir")) {
    return true;
  }

  if (!session.expiresAt) {
    return false;
  }

  const parsed = new Date(session.expiresAt);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "Nao informado";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function normalizeText(value?: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
