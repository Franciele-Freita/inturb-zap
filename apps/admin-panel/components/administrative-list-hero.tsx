"use client";

import { ReactNode } from "react";

type AdministrativeListHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  statusMessage?: string;
  actions?: ReactNode;
};

export function AdministrativeListHero({
  eyebrow = "Administrativo",
  title,
  description,
  statusMessage,
  actions
}: AdministrativeListHeroProps) {
  return (
    <section className="drivers-page-topbar driver-list-topbar">
      <div className="driver-list-topbar-copy">
        <div className="driver-list-topbar-header">
          <div className="driver-list-topbar-heading">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="drivers-page-status">
              {description}
              {statusMessage ? ` ${statusMessage}` : ""}
            </p>
          </div>

          {actions ? <div className="drivers-page-head-actions">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
