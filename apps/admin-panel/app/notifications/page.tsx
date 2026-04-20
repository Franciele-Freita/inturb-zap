"use client";

import { useEffect, useMemo, useState } from "react";
import { NotificationItem, formatDateTime, request } from "../../lib/api";
import { CalendarIcon, ChevronDownIcon, FilterIcon, OpenIcon, SearchIcon } from "../../components/icons/common-icons";

const mockNotifications: NotificationItem[] = [
  {
    id: "mock_notification_1",
    type: "NEW_PREBOOKED_RIDE",
    rideId: "ride_prebook_001",
    title: "Nova corrida aguardando aceite",
    body:
      "Franciele solicitou um pre-agendamento para hoje às 19:30 com embarque em Jardim Camburi e destino em Praia do Canto. A corrida já entrou na fila de decisão dos motoristas.",
    createdAt: "2026-03-17T09:12:00-03:00"
  },
  {
    id: "mock_notification_2",
    type: "RIDE_ACCEPTED",
    rideId: "ride_accept_014",
    driverId: "driver_clovis_01",
    title: "Corrida aceita pelo motorista",
    body:
      "Clovis Ricardo Dias Junior aceitou a corrida de Franciele para 11:00. O sistema já pode seguir para confirmação operacional e acompanhar o fluxo da agenda.",
    createdAt: "2026-03-16T10:04:00-03:00",
    readAt: "2026-03-17T10:10:00-03:00"
  },
  {
    id: "mock_notification_3",
    type: "RIDE_REJECTED",
    rideId: "ride_reject_007",
    driverId: "driver_maria_04",
    title: "Corrida recusada",
    body:
      "O motorista recusou a corrida das 14:00 por conflito de agenda. Vale revisar a margem entre corridas ou sugerir um horário alternativo ao passageiro.",
    createdAt: "2026-03-15T11:25:00-03:00"
  }
];

type ReadFilter = "ALL" | "UNREAD" | "READ";
type CategoryFilter = "ALL" | NotificationItem["type"];
type IssuerFilter = "ALL" | "SYSTEM" | "DRIVER" | "USER";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [statusMessage, setStatusMessage] = useState("Fila de alertas internos do backend.");
  const [searchTerm, setSearchTerm] = useState("");
  const [openNotificationId, setOpenNotificationId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [issuerFilter, setIssuerFilter] = useState<IssuerFilter>("ALL");

  async function loadNotifications(): Promise<void> {
    const data = await request<NotificationItem[]>("/admin/notifications");
    setNotifications(data);
    setStatusMessage(`${data.length} notificacao(oes) carregada(s).`);
  }

  useEffect(() => {
    void loadNotifications().catch((error: Error) => setStatusMessage(error.message));
    const intervalId = window.setInterval(() => {
      void loadNotifications().catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  const notificationSource = notifications.length > 0 ? notifications : mockNotifications;
  const isUsingMockNotifications = notifications.length === 0;

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...notificationSource]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .filter((notification) => {
        const issuerKey = resolveNotificationIssuerKey(notification);
        const matchesRead =
          readFilter === "ALL" ||
          (readFilter === "UNREAD" && !notification.readAt) ||
          (readFilter === "READ" && !!notification.readAt);
        const matchesCategory = categoryFilter === "ALL" || notification.type === categoryFilter;
        const matchesIssuer = issuerFilter === "ALL" || issuerKey === issuerFilter;

        if (!matchesRead || !matchesCategory || !matchesIssuer) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const category = resolveNotificationCategory(notification.type);
        const issuer = resolveNotificationIssuer(notification);

        return [notification.title, notification.body, notification.rideId, category, issuer]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [notificationSource, searchTerm, readFilter, categoryFilter, issuerFilter]);

  const groupedNotifications = useMemo(() => groupNotificationsByDay(filteredNotifications), [filteredNotifications]);

  const unreadCount = useMemo(
    () => notificationSource.filter((notification) => !notification.readAt).length,
    [notificationSource]
  );
  const systemCount = useMemo(
    () => notificationSource.filter((notification) => resolveNotificationIssuerKey(notification) === "SYSTEM").length,
    [notificationSource]
  );
  const userCount = notificationSource.length - systemCount;
  const hasActiveFilters = readFilter !== "ALL" || categoryFilter !== "ALL" || issuerFilter !== "ALL";

  async function handleToggleNotification(notification: NotificationItem): Promise<void> {
    const isAlreadyOpen = openNotificationId === notification.id;
    setOpenNotificationId(isAlreadyOpen ? null : notification.id);

    if (isAlreadyOpen || notification.readAt || isUsingMockNotifications) {
      return;
    }

    try {
      const updated = await request<NotificationItem>(`/admin/notifications/${notification.id}/read`, {
        method: "POST"
      });

      setNotifications((current) =>
        current.map((entry) => (entry.id === updated.id ? { ...entry, readAt: updated.readAt } : entry))
      );
    } catch {
      // Mantem a experiencia local sem interromper a abertura do card.
    }
  }

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">
          {isUsingMockNotifications ? "Mostrando notificacoes mockadas para validar o layout." : statusMessage}
        </p>
      </section>

      <section className="drivers-overview-strip notifications-overview-strip">
        <article className="drivers-overview-item">
          <span>Total</span>
          <strong>{notificationSource.length}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Nao lidas</span>
          <strong>{unreadCount}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Sistema</span>
          <strong>{systemCount}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Usuario</span>
          <strong>{userCount}</strong>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Notificacoes recentes</h2>
              <span>{filteredNotifications.length} registro(s) visiveis na listagem.</span>
            </div>

            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by date, name or id..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <button
                type="button"
                className={
                  hasActiveFilters || filtersOpen
                    ? "drivers-filter-toggle admin-header-icon-button is-active"
                    : "drivers-filter-toggle admin-header-icon-button"
                }
                onClick={() => setFiltersOpen((current) => !current)}
                aria-label="Abrir filtros"
                aria-expanded={filtersOpen}
                title="Filtros"
              >
                <FilterIcon />
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="drivers-table-filters notifications-table-filters">
              <div className="filter-field">
                <span>Leitura</span>
                <select className="select" value={readFilter} onChange={(event) => setReadFilter(event.target.value as ReadFilter)}>
                  <option value="ALL">Todas</option>
                  <option value="UNREAD">Nao lidas</option>
                  <option value="READ">Lidas</option>
                </select>
              </div>

              <div className="filter-field">
                <span>Categoria</span>
                <select
                  className="select"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                >
                  <option value="ALL">Todas</option>
                  <option value="NEW_PREBOOKED_RIDE">Pre-agendamento</option>
                  <option value="RIDE_ACCEPTED">Aceite</option>
                  <option value="RIDE_REJECTED">Recusa</option>
                </select>
              </div>

              <div className="filter-field">
                <span>Emissor</span>
                <select
                  className="select"
                  value={issuerFilter}
                  onChange={(event) => setIssuerFilter(event.target.value as IssuerFilter)}
                >
                  <option value="ALL">Todos</option>
                  <option value="SYSTEM">Sistema</option>
                  <option value="DRIVER">Motorista</option>
                  <option value="USER">Usuario</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="notifications-feed">
            {groupedNotifications.map((group) => (
              <section key={group.label} className="notifications-group">
                <div className="notifications-group-head">
                  <div className="notifications-group-title">
                    <span className="notifications-group-title-icon" aria-hidden="true">
                      <CalendarIcon />
                    </span>
                    <strong>{group.label}</strong>
                  </div>
                  <span>{group.items.length} notificacao(oes)</span>
                </div>

                <div className="notifications-group-list">
                  {group.items.map((notification) => {
                    const isOpen = openNotificationId === notification.id;
                    const category = resolveNotificationCategory(notification.type);
                    const issuer = resolveNotificationIssuer(notification);
                    const isUnread = !notification.readAt;
                    const previewText = buildNotificationPreviewText(notification);

                    return (
                      <article
                        key={notification.id}
                        className={buildNotificationCardClassName(notification.type, isOpen, isUnread)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        onClick={() => void handleToggleNotification(notification)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleToggleNotification(notification);
                          }
                        }}
                      >
                        <div className="notification-card-head">
                          <div className="notification-card-meta">
                            <span className="status-pill">{category}</span>
                            <span className="notification-card-issuer">{issuer}</span>
                          </div>

                          <span className="notification-card-state">
                            {isUnread ? (
                              <>
                                <span className="notification-unread-dot" aria-hidden="true" />
                                <span>Nao lida</span>
                              </>
                            ) : (
                              <span>Lida</span>
                            )}
                          </span>
                        </div>

                        <div className="notification-card-copy">
                          <strong>{notification.title}</strong>
                          <p className={isOpen ? "notification-card-body is-expanded" : "notification-card-body"}>
                            {previewText}
                          </p>
                        </div>

                        {isOpen ? (
                          <div className="notification-card-details">
                            <div className="notification-card-detail">
                              <span className="info-label">Ride</span>
                              <strong>{notification.rideId}</strong>
                            </div>
                            <div className="notification-card-detail">
                              <span className="info-label">Tipo</span>
                              <strong>{notification.type}</strong>
                            </div>
                            <div className="notification-card-detail notification-card-detail-full">
                              <span className="info-label">Descricao completa</span>
                              <strong>{notification.body}</strong>
                            </div>
                          </div>
                        ) : null}

                        <div className="notification-card-footer">
                          <span>Recebida em {formatDateTime(notification.createdAt)}</span>
                          <span
                            className="notification-card-toggle"
                            aria-label={isOpen ? "Recolher notificacao" : "Abrir notificacao"}
                            title={isOpen ? "Recolher" : "Abrir"}
                          >
                            {isOpen ? <ChevronDownIcon /> : <OpenIcon />}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            {filteredNotifications.length === 0 ? (
              <div className="empty-state notifications-empty-state">
                <strong>Nenhuma notificacao encontrada.</strong>
                <p>Quando novos eventos operacionais forem emitidos, eles aparecem aqui.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

function groupNotificationsByDay(notifications: NotificationItem[]) {
  const groups = new Map<string, NotificationItem[]>();

  for (const notification of notifications) {
    const label = resolveNotificationDayLabel(notification.createdAt);
    const current = groups.get(label) ?? [];
    current.push(notification);
    groups.set(label, current);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function resolveNotificationDayLabel(value: string): string {
  const today = new Date();
  const target = new Date(value);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const targetKey = buildDayKey(target);
  if (targetKey === buildDayKey(today)) {
    return "Hoje";
  }

  if (targetKey === buildDayKey(yesterday)) {
    return "Ontem";
  }

  return "Anteriores";
}

function buildDayKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
}

function resolveNotificationIssuerKey(notification: NotificationItem): IssuerFilter {
  if (notification.type === "NEW_PREBOOKED_RIDE") {
    return "SYSTEM";
  }

  if (notification.driverId) {
    return "DRIVER";
  }

  return "USER";
}

function resolveNotificationCategory(type: NotificationItem["type"]): string {
  switch (type) {
    case "NEW_PREBOOKED_RIDE":
      return "Pre-agendamento";
    case "RIDE_ACCEPTED":
      return "Aceite";
    case "RIDE_REJECTED":
      return "Recusa";
    default:
      return "Operacao";
  }
}

function resolveNotificationIssuer(notification: NotificationItem): string {
  const issuerKey = resolveNotificationIssuerKey(notification);

  if (issuerKey === "SYSTEM") {
    return "Sistema";
  }

  if (issuerKey === "DRIVER") {
    return "Motorista";
  }

  return "Usuario";
}

function buildNotificationPreviewText(notification: NotificationItem): string {
  if (notification.type === "NEW_PREBOOKED_RIDE") {
    const match = notification.body.match(
      /^(.*?) solicitou um pr[eé]-agendamento para hoje às (\d{1,2}:\d{2}) com embarque em (.*?) e destino em (.*?)(?:\.|$)/i
    );

    if (match) {
      return `${match[1].trim()} solicitou uma corrida para ${match[2].trim()} com saída em ${match[3].trim()}.`;
    }
  }

  if (notification.type === "RIDE_ACCEPTED") {
    const match = notification.body.match(/^(.*?) aceitou a corrida de (.*?) para (\d{1,2}:\d{2})(?:\.|$)/i);

    if (match) {
      return `${match[1].trim()} aceitou a corrida de ${match[2].trim()} para ${match[3].trim()}.`;
    }
  }

  if (notification.type === "RIDE_REJECTED") {
    const match = notification.body.match(/^O motorista recusou a corrida das (\d{1,2}:\d{2}) por (.*?)(?:\.|$)/i);

    if (match) {
      return `A corrida das ${match[1].trim()} foi recusada por ${match[2].trim()}.`;
    }
  }

  return notification.body;
}

function buildNotificationCardClassName(
  type: NotificationItem["type"],
  isOpen: boolean,
  isUnread: boolean
): string {
  const classes = ["notification-card"];

  if (type === "NEW_PREBOOKED_RIDE") {
    classes.push("notification-card-prebook");
  }

  if (type === "RIDE_ACCEPTED") {
    classes.push("notification-card-accepted");
  }

  if (type === "RIDE_REJECTED") {
    classes.push("notification-card-rejected");
  }

  if (isOpen) {
    classes.push("is-open");
  }

  if (isUnread) {
    classes.push("is-unread");
  }

  return classes.join(" ");
}
