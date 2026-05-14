import type { ReactNode } from "react";

type FinancialDataTableProps = {
  headers: ReactNode;
  loading: boolean;
  loadingLabel?: string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  columnCount: number;
  skeletonRows?: number;
  children: ReactNode;
};

export function FinancialDataTable({
  headers,
  loading,
  loadingLabel = "Carregando dados...",
  isEmpty,
  emptyTitle,
  emptyDescription,
  columnCount,
  skeletonRows = 6,
  children
}: FinancialDataTableProps) {
  return (
    <div className="drivers-table-wrap">
      <table className="drivers-table finance-data-table" aria-busy={loading}>
        <thead>{headers}</thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, index) => (
                <tr key={`skeleton-row-${index}`} className="finance-table-skeleton-row">
                  {Array.from({ length: columnCount }).map((__, cellIndex) => (
                    <td key={`skeleton-cell-${index}-${cellIndex}`}>
                      <span className="finance-table-skeleton-block" />
                    </td>
                  ))}
                </tr>
              ))
            : isEmpty ? (
                <tr>
                  <td colSpan={columnCount}>
                    <div className="finance-empty-state finance-empty-state-table">
                      <strong>{emptyTitle}</strong>
                      <p>{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                children
              )}
        </tbody>
      </table>
      {loading ? <p className="helper-text">{loadingLabel}</p> : null}
    </div>
  );
}
