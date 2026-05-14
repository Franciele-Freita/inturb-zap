"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { ChevronDownIcon } from "./icons/common-icons";

type NavChildConfig = {
  href?: string;
  label: string;
  icon?: ReactNode;
  children?: NavChildConfig[];
  isActive?: (pathname: string) => boolean;
};

type NavLinkConfig = {
  key: string;
  href?: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  isActive?: (pathname: string) => boolean;
  children?: NavChildConfig[];
};

function isDriversCadastroPath(pathname: string): boolean {
  return pathname.startsWith("/drivers") && !pathname.startsWith("/drivers/contracts");
}

function isDriversContractsPath(pathname: string): boolean {
  return pathname === "/drivers/contracts" || pathname.startsWith("/drivers/contracts/");
}

function isVehicleContractsPath(pathname: string): boolean {
  return pathname === "/contracts/vehicles" || pathname.startsWith("/contracts/vehicles/");
}

function isDocumentTemplateVariablesPath(pathname: string): boolean {
  return pathname === "/documents/templates/variables" || pathname.startsWith("/documents/templates/variables/");
}

function isDocumentTemplatesPath(pathname: string): boolean {
  return (pathname === "/documents/templates" || pathname.startsWith("/documents/templates/")) && !isDocumentTemplateVariablesPath(pathname);
}

function isTripTypesPath(pathname: string): boolean {
  return pathname === "/trip-types" || pathname.startsWith("/trip-types/");
}

function isPricingPath(pathname: string): boolean {
  return pathname === "/pricing" || pathname.startsWith("/pricing/");
}

function isRidesPath(pathname: string): boolean {
  return pathname === "/rides" || pathname.startsWith("/rides/");
}

function isAdministrativeBenefitsPath(pathname: string): boolean {
  return pathname === "/administrative/benefits" || pathname.startsWith("/administrative/benefits/");
}

function isAdministrativeCargoPath(pathname: string): boolean {
  return pathname === "/administrative/cargo" || pathname.startsWith("/administrative/cargo/");
}

function isAdministrativeWorkProfilesPath(pathname: string): boolean {
  return pathname === "/administrative/work-profiles" || pathname.startsWith("/administrative/work-profiles/");
}

function isAdministrativeScalesPath(pathname: string): boolean {
  return pathname === "/administrative/scales" || pathname.startsWith("/administrative/scales/");
}

function isAdministrativeOvertimePath(pathname: string): boolean {
  return pathname === "/administrative/overtime" || pathname.startsWith("/administrative/overtime/");
}

function isAdministrativeNightPoliciesPath(pathname: string): boolean {
  return pathname === "/administrative/night-policies" || pathname.startsWith("/administrative/night-policies/");
}

function isAdministrativeHolidaysPath(pathname: string): boolean {
  return pathname === "/administrative/holidays" || pathname.startsWith("/administrative/holidays/");
}

function isAdministrativeTimekeepingPath(pathname: string): boolean {
  return pathname === "/administrative/timekeeping" || pathname.startsWith("/administrative/timekeeping/");
}

function isAdministrativeTimekeepingRegisterPath(pathname: string): boolean {
  return pathname === "/administrative/timekeeping/register" || pathname.startsWith("/administrative/timekeeping/register/");
}

function isAdministrativeTimekeepingMirrorPath(pathname: string): boolean {
  return pathname === "/administrative/timekeeping/mirror" || pathname.startsWith("/administrative/timekeeping/mirror/");
}

function isAdministrativeTimekeepingAdjustmentsPath(pathname: string): boolean {
  return pathname === "/administrative/timekeeping/adjustments" || pathname.startsWith("/administrative/timekeeping/adjustments/");
}

function isAdministrativeTimekeepingApprovalsPath(pathname: string): boolean {
  return pathname === "/administrative/timekeeping/approvals" || pathname.startsWith("/administrative/timekeeping/approvals/");
}

function isAdministrativePayrollPath(pathname: string): boolean {
  return pathname === "/administrative/payroll" || pathname.startsWith("/administrative/payroll/");
}

function isFinancialPath(pathname: string): boolean {
  return pathname === "/financial" || pathname.startsWith("/financial/");
}

function isFinancialOverviewPath(pathname: string): boolean {
  return pathname === "/financial" || pathname === "/financial/dashboard" || pathname.startsWith("/financial/dashboard/");
}

function isFinancialAccountsPayablePath(pathname: string): boolean {
  return pathname === "/financial/accounts-payable" || pathname.startsWith("/financial/accounts-payable/");
}

function isFinancialAccountsReceivablePath(pathname: string): boolean {
  return pathname === "/financial/accounts-receivable" || pathname.startsWith("/financial/accounts-receivable/");
}

function isFinancialEntriesPath(pathname: string): boolean {
  return pathname === "/financial/entries" || pathname.startsWith("/financial/entries/");
}

function isFinancialCashFlowPath(pathname: string): boolean {
  return pathname === "/financial/cash-flow" || pathname.startsWith("/financial/cash-flow/");
}

function isFinancialCategoriesPath(pathname: string): boolean {
  return pathname === "/financial/categories" || pathname.startsWith("/financial/categories/");
}

function isFinancialCostCentersPath(pathname: string): boolean {
  return pathname === "/financial/cost-centers" || pathname.startsWith("/financial/cost-centers/");
}

function isFinancialPaymentMethodsPath(pathname: string): boolean {
  return pathname === "/financial/payment-methods" || pathname.startsWith("/financial/payment-methods/");
}

function isFinancialAccountsPath(pathname: string): boolean {
  return pathname === "/financial/accounts" || pathname.startsWith("/financial/accounts/");
}

function isFinancialReconciliationPath(pathname: string): boolean {
  return pathname === "/financial/reconciliation" || pathname.startsWith("/financial/reconciliation/");
}

function isFinancialInvoicesPath(pathname: string): boolean {
  return pathname === "/financial/invoices" || pathname.startsWith("/financial/invoices/");
}

function isFinancialReceiptsPath(pathname: string): boolean {
  return pathname === "/financial/receipts" || pathname.startsWith("/financial/receipts/");
}

function isFinancialReportsPath(pathname: string): boolean {
  return pathname === "/financial/reports" || pathname.startsWith("/financial/reports/");
}

function isFleetChecklistRealizadosPath(pathname: string): boolean {
  return pathname === "/fleet/checklists/realizados" || pathname.startsWith("/fleet/checklists/realizados/");
}

function isFleetChecklistTemplatePath(pathname: string): boolean {
  return pathname.startsWith("/fleet/checklists") && !isFleetChecklistRealizadosPath(pathname);
}

const links: NavLinkConfig[] = [
  { key: "overview", href: "/", label: "Visao geral", shortLabel: "Inicio", icon: <IconGrid /> },
  {
    key: "drivers",
    href: "/drivers",
    label: "Motoristas",
    shortLabel: "Motoristas",
    icon: <IconUsers />,
    isActive: isDriversCadastroPath
  },
  {
    key: "contracts",
    label: "Contratos",
    shortLabel: "Contratos",
    icon: <IconFileText />,
    children: [
      { href: "/drivers/contracts", label: "Motorista", icon: <IconUsers />, isActive: isDriversContractsPath },
      { href: "/contracts/vehicles", label: "Veiculos", icon: <IconCar />, isActive: isVehicleContractsPath }
    ]
  },
  {
    key: "fleet",
    href: "/fleet",
    label: "Frota",
    shortLabel: "Frota",
    icon: <IconCar />,
    children: [
      { href: "/fleet/veiculos", label: "Veiculos", icon: <IconCar /> },
      { href: "/fleet/manutencao", label: "Manutencao", icon: <IconSettings /> },
      { label: "Limpeza", icon: <IconSparkles /> },
      {
        label: "Checklist",
        icon: <IconChecklist />,
        children: [
          { href: "/fleet/checklists", label: "Template", icon: <IconFileText />, isActive: isFleetChecklistTemplatePath },
          { href: "/fleet/checklists/realizados", label: "Realizados", icon: <IconGrid />, isActive: isFleetChecklistRealizadosPath }
        ]
      },
      { label: "Multas", icon: <IconWarning /> }
    ]
  },
  { key: "customers", href: "/customers", label: "Clientes", shortLabel: "Clientes", icon: <IconUser /> },
  {
    key: "travel",
    label: "Viagens",
    shortLabel: "Viagens",
    icon: <IconRoute />,
    children: [
      { href: "/rides", label: "Corridas", icon: <IconRoute />, isActive: isRidesPath },
      { href: "/trip-types", label: "Catalogo", icon: <IconGrid />, isActive: isTripTypesPath },
      { href: "/pricing", label: "Regras de preco", icon: <IconWallet />, isActive: isPricingPath }
    ]
  },
  {
    key: "administrative",
    label: "RH",
    shortLabel: "RH",
    icon: <IconLayers />,
    children: [
      { href: "/administrative/work-profiles", label: "Perfis de trabalho", icon: <IconUsers />, isActive: isAdministrativeWorkProfilesPath },
      {
        label: "Parametros de trabalho",
        icon: <IconSettings />,
        children: [
          { href: "/administrative/cargo", label: "Cargo", icon: <IconLayers />, isActive: isAdministrativeCargoPath },
          { href: "/administrative/benefits", label: "Beneficios", icon: <IconWallet />, isActive: isAdministrativeBenefitsPath },
          { href: "/administrative/scales", label: "Jornadas de trabalho", icon: <IconRoute />, isActive: isAdministrativeScalesPath },
          { href: "/administrative/overtime", label: "Politica de hora extra", icon: <IconClock />, isActive: isAdministrativeOvertimePath },
          { href: "/administrative/night-policies", label: "Adicional noturno", icon: <IconMoon />, isActive: isAdministrativeNightPoliciesPath },
          { href: "/administrative/holidays", label: "Feriados", icon: <IconHoliday />, isActive: isAdministrativeHolidaysPath }
        ]
      },
      {
        label: "Controle de ponto",
        icon: <IconClock />,
        isActive: isAdministrativeTimekeepingPath,
        children: [
          { href: "/administrative/timekeeping/register", label: "Registrar ponto", icon: <IconClock />, isActive: isAdministrativeTimekeepingRegisterPath },
          { href: "/administrative/timekeeping/mirror", label: "Espelho de ponto", icon: <IconGrid />, isActive: isAdministrativeTimekeepingMirrorPath },
          { href: "/administrative/timekeeping/adjustments", label: "Ajustes", icon: <IconSettings />, isActive: isAdministrativeTimekeepingAdjustmentsPath },
          { href: "/administrative/timekeeping/approvals", label: "Aprovacoes", icon: <IconUsers />, isActive: isAdministrativeTimekeepingApprovalsPath }
        ]
      },
      { href: "/administrative/payroll", label: "Folha de pagamento", icon: <IconWallet />, isActive: isAdministrativePayrollPath },
      {
        label: "Modelos de documentos",
        icon: <IconFileText />,
        children: [
          { href: "/documents/templates", label: "Templates", icon: <IconFileText />, isActive: isDocumentTemplatesPath },
          { href: "/documents/templates/variables", label: "Variaveis", icon: <IconGrid />, isActive: isDocumentTemplateVariablesPath }
        ]
      }
    ]
  },
  {
    key: "financial",
    label: "Financeiro",
    shortLabel: "Financeiro",
    icon: <IconWallet />,
    isActive: isFinancialPath,
    children: [
      {
        label: "Visao geral",
        icon: <IconGrid />,
        children: [
          { href: "/financial", label: "Dashboard financeiro", icon: <IconGrid />, isActive: isFinancialOverviewPath },
          { href: "/financial/cash-flow", label: "Fluxo de caixa", icon: <IconRoute />, isActive: isFinancialCashFlowPath }
        ]
      },
      {
        label: "Movimentacoes",
        icon: <IconFileText />,
        children: [
          { href: "/financial/accounts-payable", label: "Contas a pagar", icon: <IconWallet />, isActive: isFinancialAccountsPayablePath },
          { href: "/financial/accounts-receivable", label: "Contas a receber", icon: <IconWallet />, isActive: isFinancialAccountsReceivablePath },
          { href: "/financial/entries", label: "Lancamentos", icon: <IconFileText />, isActive: isFinancialEntriesPath }
        ]
      },
      {
        label: "Cobrancas",
        icon: <IconFileText />,
        children: [
          { href: "/financial/invoices", label: "Faturas / cobrancas", icon: <IconFileText />, isActive: isFinancialInvoicesPath },
          { href: "/financial/receipts", label: "Recibos e comprovantes", icon: <IconFileText />, isActive: isFinancialReceiptsPath }
        ]
      },
      {
        label: "Estrutura financeira",
        icon: <IconLayers />,
        children: [
          { href: "/financial/accounts", label: "Contas bancarias / caixas", icon: <IconWallet />, isActive: isFinancialAccountsPath },
          { href: "/financial/payment-methods", label: "Formas de pagamento", icon: <IconWallet />, isActive: isFinancialPaymentMethodsPath },
          { href: "/financial/categories", label: "Categorias financeiras", icon: <IconLayers />, isActive: isFinancialCategoriesPath },
          { href: "/financial/cost-centers", label: "Centros de custo", icon: <IconLayers />, isActive: isFinancialCostCentersPath }
        ]
      },
      { href: "/financial/reconciliation", label: "Conciliacao bancaria", icon: <IconSettings />, isActive: isFinancialReconciliationPath },
      { href: "/financial/reports", label: "Relatorios", icon: <IconGrid />, isActive: isFinancialReportsPath }
    ]
  }
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isLinkActive(pathname: string, link: NavLinkConfig): boolean {
  if (link.isActive) {
    return link.isActive(pathname);
  }
  if (!link.href) {
    return false;
  }
  return isActive(pathname, link.href);
}

export function AppNav() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSubgroups, setExpandedSubgroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = { ...current };
      let changed = false;

      links.forEach((link) => {
        if (!link.children) return;
        const groupActive = isGroupActive(pathname, link);
        if (groupActive && !current[link.key]) {
          next[link.key] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });

    setExpandedSubgroups((current) => {
      const next = { ...current };
      let changed = false;

      links.forEach((link) => {
        if (!link.children) return;

        link.children.forEach((child, index) => {
          if (!child.children) return;
          const subgroupKey = getSubgroupKey(link.key, child.label, index);
          const subgroupActive = isChildActive(pathname, child);
          if (subgroupActive && !current[subgroupKey]) {
            next[subgroupKey] = true;
            changed = true;
          }
        });
      });

      return changed ? next : current;
    });
  }, [pathname]);

  return (
    <>
      <nav className="sidebar-nav" aria-label="Principal">
        {links.map((link) => (
          link.children ? (
            <div
              key={link.key}
              className={isGroupActive(pathname, link) ? "nav-group is-active" : "nav-group"}
            >
              <button
                type="button"
                className={isGroupActive(pathname, link) ? "nav-link nav-group-trigger is-active-group" : "nav-link nav-group-trigger"}
                aria-expanded={Boolean(expandedGroups[link.key])}
                onClick={() =>
                  setExpandedGroups((current) => ({ ...current, [link.key]: !current[link.key] }))
                }
              >
                <span className="nav-group-main">
                  <span className="nav-icon" aria-hidden="true">
                    {link.icon}
                  </span>
                  <span className="nav-copy">
                    <span>{link.label}</span>
                  </span>
                </span>
                <span
                  className={expandedGroups[link.key] ? "nav-group-chevron is-expanded" : "nav-group-chevron"}
                  aria-hidden="true"
                >
                  <ChevronDownIcon strokeWidth={1.8} />
                </span>
              </button>

              {expandedGroups[link.key] ? (
                <div className="nav-submenu" aria-label={`Submenu de ${link.label}`}>
                  {link.children.map((child, index) => {
                    const childKey = `${link.key}-${child.label}-${index}`;

                    if (child.children) {
                      const subgroupKey = getSubgroupKey(link.key, child.label, index);
                      const subgroupExpanded = Boolean(expandedSubgroups[subgroupKey]);
                      const subgroupClassName = [
                        "nav-subitem",
                        "nav-subitem-trigger",
                        subgroupExpanded ? "is-expanded" : ""
                      ].filter(Boolean).join(" ");

                      return (
                        <div key={childKey} className="nav-subgroup">
                          <button
                            type="button"
                            className={subgroupClassName}
                            aria-expanded={subgroupExpanded}
                            onClick={() =>
                              setExpandedSubgroups((current) => ({ ...current, [subgroupKey]: !current[subgroupKey] }))
                            }
                          >
                            <span className="nav-subitem-main">
                              <span className="nav-subitem-icon" aria-hidden="true">
                                {child.icon ?? <IconSubitemFallback />}
                              </span>
                              <span className="nav-subitem-label">{child.label}</span>
                            </span>
                            <span
                              className={subgroupExpanded ? "nav-subitem-chevron is-expanded" : "nav-subitem-chevron"}
                              aria-hidden="true"
                            >
                              <ChevronDownIcon strokeWidth={1.8} />
                            </span>
                          </button>

                          {subgroupExpanded ? (
                            <div className="nav-submenu-nested" aria-label={`Submenu de ${child.label}`}>
                              {child.children.map((nestedChild, nestedIndex) => {
                                const nestedClassName = [
                                  "nav-subitem",
                                  isChildActive(pathname, nestedChild) ? "is-active" : "",
                                  !nestedChild.href ? "is-disabled" : ""
                                ].filter(Boolean).join(" ");

                                return nestedChild.href ? (
                                  <Link
                                    key={`${childKey}-nested-${nestedChild.label}-${nestedIndex}`}
                                    href={nestedChild.href}
                                    className={nestedClassName}
                                  >
                                    <span className="nav-subitem-icon" aria-hidden="true">
                                      {nestedChild.icon ?? <IconSubitemFallback />}
                                    </span>
                                    <span className="nav-subitem-label">{nestedChild.label}</span>
                                  </Link>
                                ) : (
                                  <span
                                    key={`${childKey}-nested-${nestedChild.label}-${nestedIndex}`}
                                    className={nestedClassName}
                                    aria-disabled="true"
                                  >
                                    <span className="nav-subitem-icon" aria-hidden="true">
                                      {nestedChild.icon ?? <IconSubitemFallback />}
                                    </span>
                                    <span className="nav-subitem-label">{nestedChild.label}</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    const childClassName = [
                      "nav-subitem",
                      isChildActive(pathname, child) ? "is-active" : "",
                      !child.href ? "is-disabled" : ""
                    ].filter(Boolean).join(" ");

                    if (child.href) {
                      return (
                        <Link key={childKey} href={child.href} className={childClassName}>
                          <span className="nav-subitem-icon" aria-hidden="true">
                            {child.icon ?? <IconSubitemFallback />}
                          </span>
                          <span className="nav-subitem-label">{child.label}</span>
                        </Link>
                      );
                    }

                    return (
                      <span key={childKey} className={childClassName} aria-disabled="true">
                        <span className="nav-subitem-icon" aria-hidden="true">
                          {child.icon ?? <IconSubitemFallback />}
                        </span>
                        <span className="nav-subitem-label">{child.label}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : link.href ? (
            <Link
              key={link.key}
              href={link.href}
              className={isLinkActive(pathname, link) ? "nav-link active" : "nav-link"}
            >
              <span className="nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="nav-copy">
                <span>{link.label}</span>
              </span>
            </Link>
          ) : null
        ))}
      </nav>

      <nav className="mobile-nav" aria-label="Atalhos">
        {links.map((link) => {
          const mobileHref = link.href ?? (link.children ? findFirstChildHref(link.children) : undefined);
          if (!mobileHref) {
            return null;
          }

          return (
            <Link
              key={`mobile-${link.key}`}
              href={mobileHref}
              className={isGroupActive(pathname, link) ? "mobile-link active" : "mobile-link"}
            >
              {link.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function isChildActive(pathname: string, child: NavChildConfig): boolean {
  if (child.children && child.children.some((nestedChild) => isChildActive(pathname, nestedChild))) {
    return true;
  }
  if (child.isActive) {
    return child.isActive(pathname);
  }
  if (!child.href) {
    return false;
  }
  return isActive(pathname, child.href);
}

function isGroupActive(pathname: string, link: NavLinkConfig): boolean {
  if (link.children && link.children.some((child) => isChildActive(pathname, child))) {
    return true;
  }
  return isLinkActive(pathname, link);
}

function getSubgroupKey(groupKey: string, childLabel: string, childIndex: number): string {
  return `${groupKey}-${childLabel}-${childIndex}`;
}

function findFirstChildHref(children: NavChildConfig[]): string | undefined {
  for (const child of children) {
    if (child.href) {
      return child.href;
    }
    if (child.children) {
      const nestedHref = findFirstChildHref(child.children);
      if (nestedHref) {
        return nestedHref;
      }
    }
  }
  return undefined;
}

function IconGrid() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid-icon lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
  );
}

function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-icon lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>
  );
}

function IconUser() {
  return (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
}

function IconLayers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layers-icon lucide-layers"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>
  );
}

function IconWallet() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wallet-icon lucide-wallet"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
  );
}

function IconRoute() {
  return (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-route-icon lucide-route"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
  );
}

function IconCar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-van-icon lucide-van"><path d="M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3"/><path d="M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  );
}

function IconFileText() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
  );
}

function IconSettings() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
  );
}

function IconChecklist() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-checks-icon lucide-list-checks"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/></svg>
  );
}

function IconWarning() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  );
}

function IconSparkles() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles-icon lucide-sparkles"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock-fading-icon lucide-clock-fading"><path d="M12 2a10 10 0 0 1 7.38 16.75"/><path d="M12 6v6l4 2"/><path d="M2.5 8.875a10 10 0 0 0-.5 3"/><path d="M2.83 16a10 10 0 0 0 2.43 3.4"/><path d="M4.636 5.235a10 10 0 0 1 .891-.857"/><path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/></svg>
  );
}

function IconMoon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon-icon lucide-moon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>
  );
}

function IconHoliday() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun-medium-icon lucide-sun-medium"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
  );
}

function IconSubitemFallback() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}
