"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "./icons/common-icons";

export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function buildPaginationTokens(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1
  ]);

  const orderedPages = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const tokens: Array<number | "ellipsis"> = [];
  for (let index = 0; index < orderedPages.length; index += 1) {
    const page = orderedPages[index];
    const previous = orderedPages[index - 1];
    if (typeof previous === "number" && page - previous > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(page);
  }

  return tokens;
}

type AdministrativeListPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  isLoading?: boolean;
  label: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function AdministrativeListPagination({
  page,
  pageSize,
  totalItems,
  isLoading = false,
  label,
  onPageChange,
  onPageSizeChange
}: AdministrativeListPaginationProps) {
  if (totalItems <= 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const tokens = buildPaginationTokens(currentPage, totalPages);
  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  return (
    <div className="cbo-pagination-bar">
      <label className="cbo-pagination-size">
        <span>Show</span>
        <select
          className="select"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          disabled={isLoading}
        >
          {ADMIN_LIST_PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="cbo-pagination-nav" role="navigation" aria-label={label}>
        <button
          type="button"
          className="cbo-pagination-button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={!canGoPrevious}
          aria-label="Pagina anterior"
        >
          <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        {tokens.map((token, index) =>
          token === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="cbo-pagination-ellipsis" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={token}
              type="button"
              className={token === currentPage ? "cbo-pagination-button is-active" : "cbo-pagination-button"}
              onClick={() => onPageChange(token)}
              disabled={isLoading}
              aria-current={token === currentPage ? "page" : undefined}
            >
              {token}
            </button>
          )
        )}

        <button
          type="button"
          className="cbo-pagination-button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={!canGoNext}
          aria-label="Proxima pagina"
        >
          <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
