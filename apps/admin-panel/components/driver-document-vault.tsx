"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { DriverDocument, DriverDocumentCategory } from "../lib/api";

type DriverDocumentVaultProps = {
  documents: DriverDocument[];
  onDocumentsChange: (documents: DriverDocument[]) => void;
};

type VaultCategoryOption = {
  value: DriverDocumentCategory;
  label: string;
  mandatory: boolean;
};

const categoryOptions: VaultCategoryOption[] = [
  { value: "IDENTIFICATION", label: "Identificacao", mandatory: true },
  { value: "CRIMINAL_RECORD", label: "Antecedentes", mandatory: true },
  { value: "RESIDENCE_PROOF", label: "Comprovante de residencia", mandatory: false },
  { value: "TRAINING", label: "Treinamento", mandatory: false },
  { value: "OTHER", label: "Outros", mandatory: false }
];

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(`${expiresAt}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function resolveDocumentStatus(document: DriverDocument): DriverDocument["status"] {
  if (document.status === "PENDING_REVIEW") return "PENDING_REVIEW";
  return isExpired(document.expiresAt) ? "EXPIRED" : "VALID";
}

function resolveCategoryLabel(value: DriverDocumentCategory): string {
  return categoryOptions.find((option) => option.value === value)?.label ?? "Outros";
}

function resolveStatusLabel(value: DriverDocument["status"]): string {
  if (value === "EXPIRED") return "Vencido";
  if (value === "PENDING_REVIEW") return "Pendente de revisao";
  return "Valido";
}

function resolveStatusClassName(value: DriverDocument["status"]): string {
  if (value === "EXPIRED") return "status-pill rides-status-pill-danger";
  if (value === "PENDING_REVIEW") return "status-pill rides-status-pill-warning";
  return "status-pill status-pill-success";
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Nao foi possivel converter o arquivo."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

export function DriverDocumentVault({ documents, onDocumentsChange }: DriverDocumentVaultProps) {
  const [category, setCategory] = useState<DriverDocumentCategory>("IDENTIFICATION");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const normalizedDocuments = useMemo(
    () =>
      documents.map((item) => ({
        ...item,
        status: resolveDocumentStatus(item)
      })),
    [documents]
  );

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFeedback("Arquivo acima de 10MB. Selecione um documento menor.");
      return;
    }

    setIsUploading(true);
    setFeedback(null);
    try {
      const fileUrl = await toBase64(file);
      const nowIso = new Date().toISOString();
      const nextDocument: DriverDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        category,
        title: title.trim() || file.name,
        fileName: file.name,
        fileUrl,
        issuedAt: nowIso.slice(0, 10),
        expiresAt: expiresAt || undefined,
        status: expiresAt && isExpired(expiresAt) ? "EXPIRED" : "VALID"
      };

      const existingIndex = normalizedDocuments.findIndex((item) => item.category === category);
      const nextDocuments = [...normalizedDocuments];
      if (existingIndex >= 0) {
        nextDocuments[existingIndex] = nextDocument;
        setFeedback("Documento substituido com sucesso.");
      } else {
        nextDocuments.unshift(nextDocument);
        setFeedback("Documento adicionado ao Vault.");
      }

      onDocumentsChange(nextDocuments);
      setTitle("");
      setExpiresAt("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar documento.");
    } finally {
      setIsUploading(false);
    }
  }

  function removeDocument(documentId: string) {
    onDocumentsChange(normalizedDocuments.filter((item) => item.id !== documentId));
  }

  return (
    <article className="driver-editor-block">
      <div className="driver-editor-block-head">
        <strong>Document Vault</strong>
        <p className="helper-text">Central de documentos do motorista com validade e trilha de conformidade.</p>
      </div>

      <div className="form-grid">
        <label>
          Categoria
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value as DriverDocumentCategory)}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.mandatory ? " (obrigatorio)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Titulo do documento
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: CNH frente e verso"
          />
        </label>
        <label>
          Data de validade
          <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </label>
        <label>
          Upload
          <input type="file" onChange={(event) => void handleFileUpload(event)} disabled={isUploading} />
        </label>
      </div>

      {feedback ? <p className="driver-editor-status-message">{feedback}</p> : null}

      {normalizedDocuments.length === 0 ? (
        <div className="driver-editor-contract-inline-note">
          <strong>Nenhum documento no Vault</strong>
          <span>Adicione os documentos obrigatorios para liberar o motorista para operacao ativa.</span>
        </div>
      ) : (
        <div className="driver-editor-document-vault-grid">
          {normalizedDocuments.map((document) => (
            <article key={document.id} className="driver-editor-document-vault-item">
              <strong>{document.title}</strong>
              <small>{resolveCategoryLabel(document.category)}</small>
              <small>{document.fileName}</small>
              <small>Validade: {document.expiresAt ? new Date(document.expiresAt).toLocaleDateString("pt-BR") : "Nao informada"}</small>
              <span className={resolveStatusClassName(document.status)}>{resolveStatusLabel(document.status)}</span>
              <div className="driver-editor-summary-card-actions">
                <a href={document.fileUrl} target="_blank" rel="noreferrer" className="driver-editor-summary-link">
                  Visualizar
                </a>
                <button type="button" className="driver-editor-summary-link is-danger" onClick={() => removeDocument(document.id)}>
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}

