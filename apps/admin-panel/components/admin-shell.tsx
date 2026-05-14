"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppNav } from "./app-nav";
import { BrandLogo } from "./brand-logo";
import { BellIcon, ChevronDownIcon, HeadsetIcon, LogoutIcon, SearchIcon, SettingsIcon } from "./icons/common-icons";
import { AdminAuthResponse, AdminProfile, NotificationItem, request } from "../lib/api";
import {
  ADMIN_SESSION_UPDATED_EVENT,
  clearAdminSession,
  getStoredAdminSession,
  storeAdminSession,
  type AdminSession
} from "../lib/admin-auth";

type AdminShellProps = {
  children: ReactNode;
};

type AuthMode = "login" | "register";

type LoginForm = {
  name: string;
  bootstrapKey: string;
  email: string;
  password: string;
};

const initialLoginForm: LoginForm = {
  name: "",
  bootstrapKey: "",
  email: "",
  password: ""
};

const pageMeta: Array<{ href: string; title: string; subtitle: string }> = [
  { href: "/", title: "Visao geral", subtitle: "Indicadores e atalhos rapidos da operacao." },
  { href: "/drivers/contracts", title: "Contratos", subtitle: "Gestao de contratos trabalhistas dos motoristas." },
  { href: "/contracts", title: "Contratos", subtitle: "Gestao de contratos de motoristas e veiculos." },
  { href: "/drivers", title: "Motoristas", subtitle: "Cadastro e acompanhamento dos perfis." },
  { href: "/documents/templates/variables", title: "Variaveis", subtitle: "Dicionario de variaveis disponiveis para templates de documentos." },
  { href: "/documents/templates", title: "Templates", subtitle: "Gestao de modelos reutilizaveis para contratos e termos operacionais." },
  { href: "/documents", title: "Templates", subtitle: "Gestao de modelos reutilizaveis para contratos e termos operacionais." },
  { href: "/settings/auxiliary-tables/cbo", title: "CBO", subtitle: "Tabela auxiliar da Classificacao Brasileira de Ocupacoes." },
  { href: "/settings/company", title: "Dados da empresa", subtitle: "Dados institucionais da empresa para contratos e operacao." },
  { href: "/settings", title: "Configuracoes", subtitle: "Central de ajustes da conta e da empresa no painel." },
  { href: "/fleet/veiculos", title: "Frota: Veiculos", subtitle: "Gestao de veiculos e listagem da base operacional." },
  { href: "/fleet/manutencao", title: "Manutencao", subtitle: "Ordens de servico, planos e vencimentos dos veiculos." },
  { href: "/fleet/checklists/realizados", title: "Checklist: Realizados", subtitle: "Acompanhamento das execucoes e pendencias de checklist dos veiculos." },
  { href: "/fleet/checklists", title: "Checklist", subtitle: "Rotinas e listas operacionais aplicadas aos veiculos." },
  { href: "/fleet", title: "Frota", subtitle: "Visao geral, veiculos, manutencao e checklists da frota." },
  { href: "/customers", title: "Clientes", subtitle: "Perfil, historico de corridas e registros de conversa." },
  { href: "/profile", title: "Meu perfil", subtitle: "Dados do operador logado e configuracoes locais da sessao." },
  { href: "/support", title: "Atendimento", subtitle: "Central de suporte para clientes e motoristas." },
  { href: "/trip-types", title: "Tipos de viagem", subtitle: "Categorias disponiveis para o passageiro solicitar." },
  { href: "/compensation", title: "Remuneracao", subtitle: "Templates reutilizaveis de configuracao do step 6 dos motoristas." },
  { href: "/administrative/cargo", title: "Cargo", subtitle: "Estruture os cargos da sua operação e padronize funções, equipes e contratos." },
  { href: "/administrative/work-profiles", title: "Perfis de trabalho", subtitle: "Crie e gerencie perfis de trabalho com jornada, remuneração e regras operacionais." },
  { href: "/administrative/benefits", title: "Beneficios", subtitle: "Crie e gerencie benefícios utilizados em perfis de trabalho e contratos." },
  { href: "/administrative/scales", title: "Jornadas de trabalho", subtitle: "Crie e gerencie jornadas de trabalho para padronizar turnos e escalas da operação." },
  { href: "/administrative/timekeeping/register", title: "Registrar ponto", subtitle: "Lancamento manual de batidas de ponto." },
  { href: "/administrative/timekeeping/mirror", title: "Espelho de ponto", subtitle: "Consulta de batidas, horas trabalhadas e pendencias." },
  { href: "/administrative/timekeeping/adjustments", title: "Ajustes", subtitle: "Solicitacao e gerenciamento de correcoes de ponto." },
  { href: "/administrative/timekeeping/approvals", title: "Aprovacoes", subtitle: "Validacao de solicitacoes de ajuste por gestores e RH." },
  { href: "/administrative/timekeeping", title: "Espelho de ponto", subtitle: "Consulta de batidas, horas trabalhadas e pendencias." },
  { href: "/administrative/payroll", title: "Folha de pagamento", subtitle: "Gestao da folha de RH com integracao financeira para contas a pagar." },
  { href: "/financial/accounts-payable", title: "Contas a pagar", subtitle: "Controle de despesas, vencimentos, pagamentos e comprovantes." },
  { href: "/financial/accounts-receivable", title: "Contas a receber", subtitle: "Gestao de receitas, cobrancas e recebimentos." },
  { href: "/financial/cash-flow", title: "Fluxo de caixa", subtitle: "Entradas, saidas e saldo acumulado por periodo e filtros operacionais." },
  { href: "/financial/entries", title: "Lancamentos financeiros", subtitle: "Visao unificada de receitas e despesas por origem e status." },
  { href: "/financial/categories", title: "Categorias financeiras", subtitle: "Classifique receitas e despesas para analise gerencial." },
  { href: "/financial/cost-centers", title: "Centros de custo", subtitle: "Agrupe receitas e despesas por area da operacao." },
  { href: "/financial/payment-methods", title: "Formas de pagamento", subtitle: "Padronize meios de pagamento e recebimento da operacao." },
  { href: "/financial/accounts", title: "Contas bancarias / caixas", subtitle: "Cadastro de contas financeiras para movimentacao e conciliacao." },
  { href: "/financial/reconciliation", title: "Conciliacao bancaria", subtitle: "Marque transacoes conciliadas e vincule aos lancamentos." },
  { href: "/financial/invoices", title: "Faturas e cobrancas", subtitle: "Gere e acompanhe cobrancas de contratos e viagens." },
  { href: "/financial/receipts", title: "Recibos e comprovantes", subtitle: "Central de documentos financeiros anexados no sistema." },
  { href: "/financial/reports", title: "Relatorios financeiros", subtitle: "Receitas, despesas, resultado e previsao de caixa." },
  { href: "/financial", title: "Dashboard financeiro", subtitle: "Resumo de caixa, receitas, despesas e saude financeira." },
  { href: "/administrative/overtime", title: "Politica de hora extra", subtitle: "Politicas de hora extra reutilizaveis na operacao." },
  { href: "/administrative/night-policies", title: "Regras de adicional noturno", subtitle: "Politicas de adicional noturno reutilizaveis por perfil de trabalho." },
  { href: "/administrative/holidays", title: "Feriados", subtitle: "Cadastre feriados nacionais, estaduais e municipais para padronizar regras por localidade." },
  { href: "/pricing", title: "Precificacao", subtitle: "Tarifa do passageiro, regras tarifarias e repasse dos motoristas." },
  { href: "/notifications", title: "Notificacoes", subtitle: "Alertas e eventos operacionais disparados pelo backend." },
  { href: "/rides", title: "Operacao de Corridas", subtitle: "Central operacional com fila, andamento e encerramento das corridas." },
  { href: "/passenger", title: "Passenger app", subtitle: "Atalho e contexto do app de atendimento do passageiro." }
];
const ROUTE_PROGRESS_START_VALUE = 12;
const ROUTE_PROGRESS_MAX_BEFORE_COMPLETE = 92;
const ROUTE_PROGRESS_START_DELAY_MS = 0;
const ROUTE_PROGRESS_MIN_VISIBLE_MS = 220;
const ROUTE_PROGRESS_MAX_VISIBLE_MS = 12000;
const ROUTE_PROGRESS_INCREMENT_INTERVAL_MS = 160;
const ROUTE_PROGRESS_COMPLETE_DELAY_MS = 120;
const SIDEBAR_EXPANDED_STORAGE_KEY = "admin.sidebar.expanded";

function resolvePageMeta(pathname: string) {
  return pageMeta.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? pageMeta[0];
}

function RouteProgressBar({ routeKey }: { routeKey: string }) {
  const [isRouteNavigating, setIsRouteNavigating] = useState(false);
  const [routeProgressValue, setRouteProgressValue] = useState(0);
  const isRouteNavigatingRef = useRef(false);
  const routeProgressStartedAtRef = useRef<number | null>(null);
  const routeProgressStartTimeoutIdRef = useRef<number | null>(null);
  const routeProgressHideTimeoutIdRef = useRef<number | null>(null);
  const routeProgressFinalizeTimeoutIdRef = useRef<number | null>(null);
  const routeProgressMaxTimeoutIdRef = useRef<number | null>(null);
  const routeProgressAdvanceIntervalIdRef = useRef<number | null>(null);

  function clearRouteProgressTimers() {
    if (routeProgressStartTimeoutIdRef.current !== null) {
      window.clearTimeout(routeProgressStartTimeoutIdRef.current);
      routeProgressStartTimeoutIdRef.current = null;
    }

    if (routeProgressHideTimeoutIdRef.current !== null) {
      window.clearTimeout(routeProgressHideTimeoutIdRef.current);
      routeProgressHideTimeoutIdRef.current = null;
    }

    if (routeProgressFinalizeTimeoutIdRef.current !== null) {
      window.clearTimeout(routeProgressFinalizeTimeoutIdRef.current);
      routeProgressFinalizeTimeoutIdRef.current = null;
    }

    if (routeProgressMaxTimeoutIdRef.current !== null) {
      window.clearTimeout(routeProgressMaxTimeoutIdRef.current);
      routeProgressMaxTimeoutIdRef.current = null;
    }

    if (routeProgressAdvanceIntervalIdRef.current !== null) {
      window.clearInterval(routeProgressAdvanceIntervalIdRef.current);
      routeProgressAdvanceIntervalIdRef.current = null;
    }
  }

  function hideRouteProgressBar() {
    clearRouteProgressTimers();
    isRouteNavigatingRef.current = false;
    routeProgressStartedAtRef.current = null;
    setIsRouteNavigating(false);
    setRouteProgressValue(0);
  }

  function advanceRouteProgress() {
    setRouteProgressValue((current) => {
      if (current >= ROUTE_PROGRESS_MAX_BEFORE_COMPLETE) {
        return current;
      }

      const remaining = ROUTE_PROGRESS_MAX_BEFORE_COMPLETE - current;
      const increment = Math.max(1, Math.round(remaining * 0.14));
      return Math.min(ROUTE_PROGRESS_MAX_BEFORE_COMPLETE, current + increment);
    });
  }

  function startRouteProgress() {
    if (isRouteNavigatingRef.current || routeProgressStartTimeoutIdRef.current !== null) {
      return;
    }

    routeProgressStartTimeoutIdRef.current = window.setTimeout(() => {
      routeProgressStartTimeoutIdRef.current = null;
      if (isRouteNavigatingRef.current) {
        return;
      }

      isRouteNavigatingRef.current = true;
      routeProgressStartedAtRef.current = Date.now();
      setRouteProgressValue(ROUTE_PROGRESS_START_VALUE);
      setIsRouteNavigating(true);

      routeProgressAdvanceIntervalIdRef.current = window.setInterval(() => {
        advanceRouteProgress();
      }, ROUTE_PROGRESS_INCREMENT_INTERVAL_MS);

      routeProgressMaxTimeoutIdRef.current = window.setTimeout(() => {
        hideRouteProgressBar();
      }, ROUTE_PROGRESS_MAX_VISIBLE_MS);
    }, ROUTE_PROGRESS_START_DELAY_MS);
  }

  function completeRouteProgress() {
    if (!isRouteNavigatingRef.current) {
      if (routeProgressStartTimeoutIdRef.current !== null) {
        window.clearTimeout(routeProgressStartTimeoutIdRef.current);
        routeProgressStartTimeoutIdRef.current = null;
      }
      return;
    }

    const startedAt = routeProgressStartedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, ROUTE_PROGRESS_MIN_VISIBLE_MS - elapsed);

    if (routeProgressAdvanceIntervalIdRef.current !== null) {
      window.clearInterval(routeProgressAdvanceIntervalIdRef.current);
      routeProgressAdvanceIntervalIdRef.current = null;
    }

    if (routeProgressMaxTimeoutIdRef.current !== null) {
      window.clearTimeout(routeProgressMaxTimeoutIdRef.current);
      routeProgressMaxTimeoutIdRef.current = null;
    }

    if (routeProgressHideTimeoutIdRef.current !== null) {
      window.clearTimeout(routeProgressHideTimeoutIdRef.current);
    }

    routeProgressHideTimeoutIdRef.current = window.setTimeout(() => {
      setRouteProgressValue(100);
      routeProgressFinalizeTimeoutIdRef.current = window.setTimeout(() => {
        routeProgressFinalizeTimeoutIdRef.current = null;
        hideRouteProgressBar();
      }, ROUTE_PROGRESS_COMPLETE_DELAY_MS);
    }, remaining);
  }

  useEffect(() => {
    completeRouteProgress();
  }, [routeKey]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, currentUrl.href);
      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
        return;
      }

      startRouteProgress();
    }

    function handlePopState() {
      startRouteProgress();
    }

    function shouldStartForHistoryUrl(nextUrlValue: string | URL | null | undefined): boolean {
      if (!nextUrlValue) {
        return false;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(String(nextUrlValue), currentUrl.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return false;
      }

      return nextUrl.pathname !== currentUrl.pathname || nextUrl.search !== currentUrl.search;
    }

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
      if (shouldStartForHistoryUrl(args[2])) {
        startRouteProgress();
      }
      return originalPushState(...args);
    }) as History["pushState"];

    window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
      if (shouldStartForHistoryUrl(args[2])) {
        startRouteProgress();
      }
      return originalReplaceState(...args);
    }) as History["replaceState"];

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      clearRouteProgressTimers();
    };
  }, []);

  return (
    <div className={isRouteNavigating ? "route-progress is-visible" : "route-progress"} aria-hidden={!isRouteNavigating}>
      <span className="route-progress-bar" style={{ width: `${routeProgressValue}%` }} />
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublicSignaturePage = pathname.startsWith("/assinatura/contratos/");
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<LoginForm>(initialLoginForm);
  const [loginError, setLoginError] = useState("");
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [hasLoadedSidebarPreference, setHasLoadedSidebarPreference] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const currentPage = useMemo(() => resolvePageMeta(pathname), [pathname]);
  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
      setIsSidebarExpanded(storedValue === "1");
    } catch {
      setIsSidebarExpanded(false);
    } finally {
      setHasLoadedSidebarPreference(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarPreference) {
      return;
    }

    try {
      window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, isSidebarExpanded ? "1" : "0");
    } catch {
      // Ignore local storage write failures.
    }
  }, [hasLoadedSidebarPreference, isSidebarExpanded]);

  useEffect(() => {
    let isMounted = true;

    function syncSessionFromMemory() {
      setSession(getStoredAdminSession());
    }

    function handleSessionUpdated() {
      syncSessionFromMemory();
    }

    syncSessionFromMemory();
    window.addEventListener(ADMIN_SESSION_UPDATED_EVENT, handleSessionUpdated);
    void request<AdminProfile>("/auth/admin/profile")
      .then((profile) => {
        if (!isMounted) {
          return;
        }

        const currentSession = getStoredAdminSession();
        const nextSession: AdminSession = {
          expiresAt: currentSession?.expiresAt,
          user: profile
        };

        storeAdminSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSession(getStoredAdminSession());
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_SESSION_UPDATED_EVENT, handleSessionUpdated);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setHasUnreadNotifications(false);
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      try {
        const items = await request<NotificationItem[]>("/admin/notifications");
        if (!isMounted) {
          return;
        }

        setHasUnreadNotifications(items.some((item) => !item.readAt));
      } catch {
        if (isMounted) {
          setHasUnreadNotifications(false);
        }
      }
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [session]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    const normalizedName = form.name.trim();
    const normalizedBootstrapKey = form.bootstrapKey.trim();
    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedPassword = form.password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setLoginError("Preencha email e senha para entrar no painel.");
      return;
    }

    if (authMode === "register" && (!normalizedName || !normalizedBootstrapKey)) {
      setLoginError("Para o primeiro acesso, informe nome e chave bootstrap.");
      return;
    }

    void request<AdminAuthResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({
        name: authMode === "register" ? normalizedName : undefined,
        bootstrapKey: authMode === "register" ? normalizedBootstrapKey : undefined,
        email: normalizedEmail,
        password: normalizedPassword
      })
    })
      .then((response) => {
        const nextSession: AdminSession = {
          expiresAt: response.expiresAt,
          user: response.user
        };

        storeAdminSession(nextSession);
        setSession(nextSession);
        setForm(initialLoginForm);
      })
      .catch((error: Error) => setLoginError(error.message));
  }

  function handleLogout() {
    void request("/auth/admin/logout", { method: "POST" }).catch(() => undefined);
    clearAdminSession();
    setSession(null);
    setForm(initialLoginForm);
  }

  const routeProgressBar = <RouteProgressBar routeKey={routeKey} />;

  if (isPublicSignaturePage) {
    return <>{children}</>;
  }

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return (
      <>
        {routeProgressBar}
        <div className="admin-auth-shell">
          <div className="admin-auth-layout">
          <section className="admin-auth-panel">
            <div className="admin-auth-panel-inner">
              <div className="admin-auth-brand">
                <div className="admin-auth-brand-mark">
                  <BrandLogo />
                </div>
                <span className="admin-auth-brand-caption">Painel administrativo</span>
              </div>

              <div className="admin-auth-copy">
                <p className="eyebrow">{authMode === "register" ? "Primeiro acesso" : "Login"}</p>
                <h1>{authMode === "register" ? "Criar conta administrativa" : "Entrar no painel"}</h1>
                <p className="helper-text">
                  {authMode === "register"
                    ? "Cadastre o primeiro administrador da operacao com a chave inicial do ambiente. Depois disso, os proximos acessos usam apenas e-mail e senha."
                    : "Acesse sua conta para acompanhar corridas, cadastros, atendimento e configuracoes da operacao."}
                </p>
              </div>

              <div className="admin-auth-form-surface">
                <div className="admin-auth-switch" role="tablist" aria-label="Fluxos de autenticacao">
                  <button
                    type="button"
                    className={authMode === "login" ? "admin-auth-switch-item is-active" : "admin-auth-switch-item"}
                    onClick={() => {
                      setAuthMode("login");
                      setLoginError("");
                    }}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className={authMode === "register" ? "admin-auth-switch-item is-active" : "admin-auth-switch-item"}
                    onClick={() => {
                      setAuthMode("register");
                      setLoginError("");
                    }}
                  >
                    Primeiro acesso
                  </button>
                </div>

                <form className="stack admin-auth-form" onSubmit={handleLogin}>
                  {authMode === "register" ? (
                    <div className="form-grid admin-auth-grid">
                      <label>
                        Nome
                        <input
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Seu nome completo"
                        />
                      </label>

                      <label>
                        Chave bootstrap
                        <input
                          value={form.bootstrapKey}
                          onChange={(event) => setForm((current) => ({ ...current, bootstrapKey: event.target.value }))}
                          placeholder="Chave inicial do ambiente"
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="form-grid admin-auth-grid">
                    <label>
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="operacao@inturb.local"
                      />
                    </label>

                    <label>
                      Senha
                      <input
                        type="password"
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder={authMode === "register" ? "Defina uma senha forte" : "Digite sua senha"}
                      />
                    </label>
                  </div>

                  {loginError ? <p className="admin-auth-error">{loginError}</p> : null}

                  <div className="admin-auth-footer">
                    <button type="submit">{authMode === "register" ? "Registrar conta" : "Entrar"}</button>
                    <div className="admin-auth-footnote">
                      <span className="chip chip-soft">
                        {authMode === "register" ? "Ativacao inicial do ambiente" : "Acesso administrativo seguro"}
                      </span>
                      <p>
                        {authMode === "register"
                          ? "Somente o primeiro administrador usa a chave bootstrap para liberar o acesso do painel."
                          : "Depois da ativacao inicial, a entrada segue com e-mail e senha da conta administrativa."}
                      </p>
                    </div>
                  </div>
                </form>
              </div>

              <div className="admin-auth-support">
                <span>Acesso restrito a perfis autorizados.</span>
                <span>Em caso de bloqueio, procure o responsavel pela administracao da operacao.</span>
              </div>
            </div>
          </section>

          <aside className="admin-auth-showcase" aria-hidden="true">
            <div className="admin-auth-showcase-top">
              <span className="admin-auth-orb admin-auth-orb-mint" />
              <span className="admin-auth-orb admin-auth-orb-amber" />
            </div>

            <div className="admin-auth-visual-frame">
              <div className="admin-auth-visual-window">
                <div className="admin-auth-visual-window-bar" />
                <div className="admin-auth-visual-window-body">
                  <div className="admin-auth-visual-avatar" />
                  <div className="admin-auth-visual-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-auth-showcase-copy">
              <span className="admin-auth-kicker">Operacao Inturb</span>
              <h2>Corridas, cadastros e atendimento em uma unica operacao.</h2>
              <p>
                Acompanhe a rotina da operacao, gerencie motoristas e clientes e mantenha os controles administrativos centralizados no mesmo painel.
              </p>
            </div>

            <div className="admin-auth-showcase-card">
              <span className="admin-auth-showcase-card-eyebrow">Acesso</span>
              <strong>{authMode === "register" ? "Primeira ativacao do painel" : "Entrada da operacao"}</strong>
              <p>
                {authMode === "register"
                  ? "A chave bootstrap e usada uma unica vez para habilitar o primeiro administrador do ambiente."
                  : "Operadores autorizados entram com e-mail e senha para seguir a rotina do painel."}
              </p>
            </div>

            <div className="admin-auth-showcase-metrics">
              <div>
                <strong>01</strong>
                <span>Ativacao inicial</span>
              </div>
              <div>
                <strong>02</strong>
                <span>Acesso da equipe</span>
              </div>
              <div>
                <strong>03</strong>
                <span>Sessao protegida</span>
              </div>
            </div>
          </aside>
          </div>
        </div>
      </>
    );
  }

  const userInitial = session.user.name.trim().charAt(0).toUpperCase() || "A";
  const userRoleLabel = session.user.role === "ADMIN" ? "Administrador" : "Operacao";

  return (
    <div className="app-frame">
      {routeProgressBar}
      <div className="app-noise" />
      <div className="app-glow app-glow-primary" />
      <div className="app-glow app-glow-secondary" />
      <div className={isSidebarExpanded ? "app-shell is-sidebar-expanded" : "app-shell"}>
        <aside className="sidebar">
          <div className="sidebar-surface">
            <div className="brand brand-sidebar">
              <div className="brand-sidebar-mark">
                <BrandLogo />
              </div>
              <span className="brand-sidebar-caption">Painel administrativo</span>
            </div>

            <div className="sidebar-nav-region">
              <div className="sidebar-nav-head">
                <span className="sidebar-section-label">Navegacao</span>
                <button
                  type="button"
                  className={isSidebarExpanded ? "sidebar-nav-toggle is-expanded" : "sidebar-nav-toggle"}
                  onClick={() => setIsSidebarExpanded((current) => !current)}
                  aria-label={isSidebarExpanded ? "Reduzir largura da barra lateral" : "Expandir largura da barra lateral"}
                  aria-pressed={isSidebarExpanded}
                >
                  <span className="sidebar-nav-toggle-label">{isSidebarExpanded ? "Reduzir" : "Expandir"}</span>
                  <span className="sidebar-nav-toggle-icon" aria-hidden="true">
                    <ChevronDownIcon strokeWidth={1.9} />
                  </span>
                </button>
              </div>
              <AppNav />
            </div>

           {/*  <div className="sidebar-footer-card">
              <span className="sidebar-footer-emoji">ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â</span>
              <strong>Workspace ativo</strong>
              <p>Gestao centralizada de cadastro, operacao e configuracoes da plataforma.</p>
            </div> */}
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-header">
            <label className="admin-header-search" aria-label="Buscar">
              <input type="search" placeholder="Buscar por data, nome ou ID..." />
              <span className="admin-header-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
            </label>

            <div className="admin-header-meta">
              <Link
                href="/settings"
                className={pathname.startsWith("/settings") ? "admin-header-icon-button is-active" : "admin-header-icon-button"}
                aria-label="Configuracoes"
                title="Configuracoes"
              >
                <SettingsIcon />
              </Link>

              <Link
                href="/support"
                className={pathname.startsWith("/support") ? "admin-header-icon-button is-active" : "admin-header-icon-button"}
                aria-label="Atendimento"
                title="Atendimento"
              >
                <HeadsetIcon />
              </Link>

              <Link
                href="/notifications"
                className={pathname.startsWith("/notifications") ? "admin-header-icon-button is-active" : "admin-header-icon-button"}
                aria-label="Notificacoes"
                title="Notificacoes"
              >
                {hasUnreadNotifications ? <span className="admin-header-icon-badge" aria-hidden="true" /> : null}
                <BellIcon />
              </Link>

              <div className="admin-header-profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className={isProfileMenuOpen ? "admin-header-profile-trigger is-open" : "admin-header-profile-trigger"}
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                  aria-expanded={isProfileMenuOpen}
                  aria-controls="admin-header-profile-dropdown"
                  aria-label="Abrir menu do perfil"
                >
                  <span className="admin-header-avatar" aria-hidden="true">
                    {userInitial}
                  </span>
                </button>

                {isProfileMenuOpen ? (
                  <div className="admin-header-profile-dropdown" id="admin-header-profile-dropdown" role="menu">
                    <div className="admin-header-profile-dropdown-head">
                      <span className="admin-header-avatar is-menu" aria-hidden="true">
                        {userInitial}
                      </span>
                      <strong>{session.user.name}</strong>
                      <span>{userRoleLabel}</span>
                    </div>

                    <div className="admin-header-profile-dropdown-actions">
                      <Link href="/profile" className="admin-header-profile-dropdown-item" role="menuitem">
                        Perfil
                      </Link>
                      <Link href="/settings/company" className="admin-header-profile-dropdown-item" role="menuitem">
                        Dados da empresa
                      </Link>
                      <button
                        type="button"
                        className="admin-header-profile-dropdown-item is-danger"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogoutIcon />
                        <span>Sair</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="content-shell">
            {pathname === "/" ? null : (
              <div className="admin-page-intro">
                <p className="eyebrow">Painel administrativo</p>
                <strong>{currentPage.title}</strong>
                <span>{currentPage.subtitle}</span>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
