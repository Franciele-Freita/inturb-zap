"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterTemplateVariables,
  resolveScopeLabel,
  resolveTemplateVariableGroup,
  resolveTemplateVariableGroupLabel,
  TemplateScope,
  TemplateVariableEntry
} from "../../../../lib/document-templates";

type ScopeFilter = "ALL" | TemplateScope;

export default function TemplateVariablesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const rows = useMemo<TemplateVariableEntry[]>(
    () => filterTemplateVariables(scopeFilter, searchInput),
    [scopeFilter, searchInput]
  );

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1800);
    } catch {
      setCopiedToken(null);
    }
  }

  return (
    <main className="page-shell driver-contracts-shell">
      <section className="drivers-page-topbar driver-list-topbar">
        <div className="driver-list-topbar-copy">
          <div className="driver-list-topbar-header">
            <div className="driver-list-topbar-heading">
              <p className="eyebrow">Documentos - Templates</p>
              <h1>Consultar variaveis</h1>
              <p className="drivers-page-status">
                Dicionario de placeholders para usar nos modelos de contrato.
              </p>
            </div>
            <div className="drivers-page-head-actions">
              <Link href="/documents/templates" className="button-link secondary-link">
                Voltar para templates
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Variaveis disponiveis</h2>
              <span>{rows.length} resultado(s).</span>
            </div>
            <div className="drivers-table-tools driver-contracts-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por token, nome ou descricao..."
                />
              </label>
              <label>
                <span>Escopo</span>
                <select
                  className="select"
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
                >
                  <option value="ALL">Todos</option>
                  <option value="DRIVER_EMPLOYMENT">Motorista</option>
                  <option value="VEHICLE">Veiculo</option>
                  <option value="STAFF">Outros funcionarios</option>
                </select>
              </label>
            </div>
          </div>

          <div className="drivers-table-wrap">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Grupo</th>
                  <th>Escopo</th>
                  <th>Campo</th>
                  <th>Descricao</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={`${item.scope}-${item.token}`}>
                    <td>
                      <strong>{item.token}</strong>
                    </td>
                    <td>{resolveTemplateVariableGroupLabel(resolveTemplateVariableGroup(item))}</td>
                    <td>{resolveScopeLabel(item.scope)}</td>
                    <td>{item.label}</td>
                    <td>{item.description}</td>
                    <td>
                      <div className="driver-contract-actions">
                        <button type="button" className="secondary" onClick={() => void handleCopy(item.token)}>
                          {copiedToken === item.token ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="driver-contract-empty">Nenhuma variavel encontrada para esse filtro.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
