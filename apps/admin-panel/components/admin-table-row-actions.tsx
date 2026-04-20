"use client";

import Link from "next/link";
import { useRef } from "react";

type AdminTableRowAction = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type AdminTableRowActionsProps = {
  primary: AdminTableRowAction;
  items: AdminTableRowAction[];
  menuLabel?: string;
};

export function AdminTableRowActions({
  primary,
  items,
  menuLabel = "Mais acoes"
}: AdminTableRowActionsProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  function closeMenu() {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
  }

  function runAction(action: AdminTableRowAction) {
    if (action.disabled) return;
    action.onClick?.();
    closeMenu();
  }

  return (
    <div className="table-actions">
      {primary.href ? (
        <Link href={primary.href} className="button-link secondary-link table-action-primary">
          {primary.label}
        </Link>
      ) : (
        <button
          type="button"
          className="button-link secondary-link table-action-primary"
          onClick={() => runAction(primary)}
          disabled={primary.disabled}
        >
          {primary.label}
        </button>
      )}

      {items.length > 0 ? (
        <details className="table-actions-menu" ref={detailsRef}>
          <summary aria-label={menuLabel}>
            <span aria-hidden="true">•••</span>
          </summary>
          <div className="table-actions-menu-list">
            {items.map((item) =>
              item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className={item.danger ? "table-actions-menu-item is-danger" : "table-actions-menu-item"}
                  onClick={() => closeMenu()}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className={item.danger ? "table-actions-menu-item is-danger" : "table-actions-menu-item"}
                  onClick={() => runAction(item)}
                  disabled={item.disabled}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
