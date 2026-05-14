"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  FinancePageHeader,
  FinanceSectionCard,
  formatDate
} from "../components/finance-shared";
import { financeService } from "../services/finance-service";
import type { FinancialDocument } from "../types/finance";

type DocumentForm = {
  entryId: string;
  recordType: FinancialDocument["recordType"];
  documentType: FinancialDocument["documentType"];
  fileName: string;
  notes: string;
};

const defaultForm: DocumentForm = {
  entryId: "",
  recordType: "ENTRY",
  documentType: "PROOF",
  fileName: "",
  notes: ""
};

export function ReceiptsPage() {
  return <ReceiptsScreen mode="list" />;
}

export function ReceiptsCreatePage() {
  return <ReceiptsScreen mode="create" />;
}

function ReceiptsScreen({ mode }: { mode: "list" | "create" }) {
  const [rows, setRows] = useState<FinancialDocument[]>([]);
  const [form, setForm] = useState<DocumentForm>(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    const data = await financeService.listDocuments();
    setRows(data);
  }

  async function handleAttach() {
    if (!form.fileName.trim()) {
      setFeedback("Informe o nome do arquivo para anexar.");
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await financeService.attachDocument({
        entryId: form.entryId.trim() || undefined,
        recordType: form.recordType,
        documentType: form.documentType,
        fileName: form.fileName.trim(),
        notes: form.notes.trim() || undefined
      });
      setForm(defaultForm);
      await loadRows();
      setFeedback("Documento anexado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao anexar documento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <FinancePageHeader
        title="Recibos e comprovantes"
        subtitle="Central de documentos financeiros anexados no sistema."
        actions={
          mode === "list" ? (
            <Link href="/financial/receipts/new" className="button-link">
              + Anexar documento
            </Link>
          ) : (
            <Link href="/financial/receipts" className="button-link secondary-link">
              Voltar para listagem
            </Link>
          )
        }
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single finance-layout-stack">
        {mode === "create" ? (
        <FinanceSectionCard title="Anexar documento" subtitle="Registre recibos, comprovantes, notas e boletos.">
          <div className="finance-form-grid finance-form-grid-4">
            <label>
              <span>Lancamento relacionado (opcional)</span>
              <input value={form.entryId} onChange={(event) => setForm((current) => ({ ...current, entryId: event.target.value }))} placeholder="ID do lancamento/fatura" />
            </label>
            <label>
              <span>Tipo de registro</span>
              <select className="select" value={form.recordType} onChange={(event) => setForm((current) => ({ ...current, recordType: event.target.value as FinancialDocument["recordType"] }))}>
                <option value="PAYABLE">Conta a pagar</option>
                <option value="RECEIVABLE">Conta a receber</option>
                <option value="ENTRY">Lancamento</option>
                <option value="INVOICE">Fatura</option>
              </select>
            </label>
            <label>
              <span>Tipo de documento</span>
              <select className="select" value={form.documentType} onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value as FinancialDocument["documentType"] }))}>
                <option value="RECEIPT">Recibo</option>
                <option value="PROOF">Comprovante</option>
                <option value="INVOICE">Nota fiscal</option>
                <option value="BOLETO">Boleto</option>
                <option value="CONTRACT">Contrato</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label>
              <span>Arquivo</span>
              <input value={form.fileName} onChange={(event) => setForm((current) => ({ ...current, fileName: event.target.value }))} placeholder="arquivo.pdf" />
            </label>
          </div>

          <div className="finance-form-grid finance-form-grid-1">
            <label>
              <span>Observacoes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
            </label>
          </div>

          <div className="timekeeping-adjustments-actions-row">
            <button type="button" className="button-link" onClick={() => void handleAttach()} disabled={isSaving}>
              {isSaving ? "Anexando..." : "Anexar documento"}
            </button>
          </div>
        </FinanceSectionCard>
        ) : null}

        {mode === "list" ? (
        <FinanceSectionCard title="Documentos anexados" subtitle={`${rows.length} arquivo(s) registrado(s).`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Nenhum documento financeiro anexado"
              description="Use o formulario acima para registrar recibos e comprovantes."
            />
          ) : (
            <div className="drivers-table-wrap">
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Tipo</th>
                    <th>Registro</th>
                    <th>Lancamento</th>
                    <th>Data de anexo</th>
                    <th>Observacoes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.fileName}</td>
                      <td>{row.documentType}</td>
                      <td>{row.recordType}</td>
                      <td>{row.entryId || "-"}</td>
                      <td>{formatDate(row.uploadedAt.slice(0, 10))}</td>
                      <td>{row.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FinanceSectionCard>
        ) : null}
      </section>
    </main>
  );
}
