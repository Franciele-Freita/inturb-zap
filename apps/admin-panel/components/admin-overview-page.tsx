import Link from "next/link";

const passengerAppUrl = process.env.NEXT_PUBLIC_PASSENGER_APP_URL ?? "http://localhost:3002";
const driverAppUrl = process.env.NEXT_PUBLIC_DRIVER_APP_URL ?? "http://localhost:3003";

const stats = [
  { label: "Motoristas ativos", value: "24", meta: "6 online agora", tone: "purple" },
  { label: "Clientes na base", value: "128", meta: "18 novos esta semana", tone: "sky" },
  { label: "Corridas pendentes", value: "09", meta: "3 aguardando aceite", tone: "peach" }
] as const;

const quickActions = [
  {
    href: "/drivers",
    eyebrow: "Operacao",
    title: "Motoristas",
    description: "Cadastre perfis, acompanhe frota e atualize status da operacao."
  },
  {
    href: "/customers",
    eyebrow: "CRM",
    title: "Clientes",
    description: "Veja historico, favoritos, funil de atendimento e registros de conversa."
  },
  {
    href: "/trip-types",
    eyebrow: "Catalogo",
    title: "Tipos de viagem",
    description: "Gerencie categorias ativas, acrescimos e regras da experiencia do passageiro."
  },
  {
    href: "/compensation",
    eyebrow: "Administracao",
    title: "Remuneracao",
    description: "Monte templates de remuneracao para reduzir erros no cadastro de motoristas."
  },
  {
    href: "/pricing",
    eyebrow: "Financeiro",
    title: "Precificacao",
    description: "Ajuste tarifa base, valor por km e minuto sem alterar codigo."
  },
  {
    href: "/notifications",
    eyebrow: "Monitoramento",
    title: "Notificacoes",
    description: "Acompanhe alertas internos e eventos operacionais do backend."
  },
  {
    href: "/rides",
    eyebrow: "Agenda",
    title: "Corridas pendentes",
    description: "Monitore pre-agendamentos, aceite de motoristas e conflitos de encaixe."
  }
];

const experiences = [
  {
    href: passengerAppUrl,
    title: "Passenger app",
    description: "Simule o fluxo de atendimento conversacional antes do WhatsApp real."
  },
  {
    href: driverAppUrl,
    title: "Driver app",
    description: "Valide agenda, aceite, detalhe da corrida e fluxo operacional do motorista."
  }
];

const timeline = [
  { time: "Agora", title: "3 corridas aguardando aceite", meta: "Fila de corridas pendentes" },
  { time: "Hoje", title: "2 tipos de viagem ativos com acrescimo", meta: "Catalogo operacional" },
  { time: "Meta", title: "WhatsApp real ainda em homologacao", meta: "Fluxo em simulador web" }
];

export function AdminOverviewPage() {
  return (
    <main className="page-shell admin-dashboard-shell">
      <section className="admin-dashboard-grid">
        <div className="admin-dashboard-main">
          <section className="dashboard-hero-card">
            <div className="dashboard-hero-copy">
              <p className="eyebrow">Inturb Control</p>
              <h1>Monitore a operacao e valide os fluxos antes do WhatsApp real.</h1>
              <p className="hero-text">
                Painel pensado para cadastro, monitoramento e ajustes operacionais sem misturar a experiencia do
                passageiro com a interface administrativa.
              </p>
              <div className="dashboard-hero-actions">
                <Link href="/rides" className="button-link">
                  Ver corridas pendentes
                </Link>
                <Link href="/customers" className="button-link secondary-link">
                  Abrir clientes
                </Link>
              </div>
            </div>

            <div className="dashboard-hero-orb" aria-hidden="true">
              <div className="dashboard-hero-orb-core" />
              <div className="dashboard-hero-orb-ring dashboard-hero-orb-ring-a" />
              <div className="dashboard-hero-orb-ring dashboard-hero-orb-ring-b" />
              <div className="dashboard-hero-badge dashboard-hero-badge-top">Painel local</div>
              <div className="dashboard-hero-badge dashboard-hero-badge-bottom">Operacao separada do passageiro</div>
            </div>
          </section>

          <section className="dashboard-stat-grid">
            {stats.map((stat) => (
              <article key={stat.label} className={`dashboard-stat-card dashboard-stat-card-${stat.tone}`}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.meta}</p>
              </article>
            ))}
          </section>

          <section className="dashboard-section">
            <div className="panel-head dashboard-section-head">
              <div>
                <h2>Atalhos da operacao</h2>
                <span>Rotas principais para administrar a base e ajustar o comportamento do produto.</span>
              </div>
            </div>

            <div className="dashboard-action-grid">
              {quickActions.map((entry) => (
                <Link key={entry.href} href={entry.href} className="dashboard-action-card">
                  <span className="overview-label">{entry.eyebrow}</span>
                  <strong>{entry.title}</strong>
                  <p>{entry.description}</p>
                  <span className="dashboard-action-link">Abrir</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="panel-head dashboard-section-head">
              <div>
                <h2>Apps conectados</h2>
                <span>Entradas rapidas para as experiencias web usadas na validacao do fluxo.</span>
              </div>
            </div>

            <div className="dashboard-experience-grid">
              {experiences.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dashboard-experience-card"
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="dashboard-experience-top">
                    <span className="dashboard-experience-icon" aria-hidden="true">
                      Open
                    </span>
                    <strong>{item.title}</strong>
                  </div>
                  <p>{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="admin-dashboard-side">
          <section className="dashboard-side-card dashboard-side-card-spotlight">
            <span className="overview-label">Resumo</span>
            <strong>Operacao em ambiente local</strong>
            <p>
              Use esta area para validar cadastros, corridas, regras de precificacao e o comportamento do ecossistema
              sem depender do WhatsApp em producao.
            </p>
          </section>

          <section className="dashboard-side-card">
            <div className="dashboard-side-chart-head">
              <div>
                <span className="overview-label">Saude da operacao</span>
                <strong>Distribuicao visual</strong>
              </div>
              <span className="dashboard-side-percent">82%</span>
            </div>

            <div className="dashboard-mini-chart" aria-hidden="true">
              <span style={{ height: "46%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "54%" }} />
              <span style={{ height: "84%" }} />
            </div>

            <div className="dashboard-mini-chart-labels">
              <span>Cadastros</span>
              <span>Corridas</span>
              <span>Alertas</span>
              <span>Fluxos</span>
            </div>
          </section>

          <section className="dashboard-side-card">
            <div className="panel-head">
              <div>
                <h2>Radar operacional</h2>
                <span>Leitura rapida do que merece atencao agora.</span>
              </div>
            </div>

            <div className="dashboard-timeline">
              {timeline.map((item) => (
                <article key={`${item.time}-${item.title}`} className="dashboard-timeline-item">
                  <span className="dashboard-timeline-time">{item.time}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
