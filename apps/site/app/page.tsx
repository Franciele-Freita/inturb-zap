import Link from "next/link";
import { BrandLogo } from "../components/brand-logo";
import { PillarCarousel } from "../components/pillar-carousel";

const passengerAppUrl = process.env.NEXT_PUBLIC_PASSENGER_APP_URL ?? "http://localhost:3002";
const adminPanelUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL ?? "http://localhost:3001";

const trustPillars = [
  {
    title: "Seguro em cada etapa",
    description:
      "Do agendamento ao desembarque, cada detalhe é pensado para que você se sinta seguro e bem informado durante toda a viagem."
  },
  {
    title: "Veículos limpos e confortáveis",
    description: "Carros organizados, bem cuidados e preparados para oferecer uma experiência mais agradável em cada trajeto."
  },
  {
    title: "Motoristas selecionados ",
    description: "Profissionais que valorizam o respeito, o bom atendimento e o compromisso com a sua experiência."
  },
  {
    title: "Atendimento atencioso",
    description: "Comunicação clara, atenção aos detalhes e um cuidado real com quem está a bordo."
  },
  {
    title: "Viagens com horário agendado",
    description: "Agende com antecedência e tenha mais previsibilidade, organização e tranquilidade no seu dia."
  },
  {
    title: "Experiência do início ao fim",
    description: "Uma jornada pensada para ser leve, confortável e confiável em todos os momentos."
  }
] as const;

const tripTypes = [
  {
    title: "Viagem padrão",
    description: "Para deslocamentos do dia a dia com conforto, organização e tranquilidade do início ao fim.",
    icon: "default"
  },
  {
    title: "Viagem com bagagem",
    description: "Ideal para quem precisa transportar malas com mais espaço e cuidado durante o trajeto.",
    icon: "luggage"
  },
  {
    title: "Viagem com pet",
    description: "Leve seu pet com segurança e conforto, em uma experiência preparada para receber seu companheiro.",
    icon: "pet"
  },
  {
    title: "Entregas",
    description: "Envie itens com praticidade e segurança, com o mesmo cuidado de uma viagem de passageiros.",
    icon: "delivery"
  },
  {
    title: "Viagem com bicicleta",
    description: "Transporte sua bicicleta com organização e espaço adequado para um trajeto mais seguro.",
    icon: "bike"
  },
  {
    title: "Viagem personalizada",
    description: "Informe suas preferências e necessidades para uma experiência ajustada ao seu perfil.",
    icon: "custom"
  }
] as const;

const insuranceHighlights = [
  {
    title: "Cobertura durante toda a viagem",
    description: "Proteção ativa do início ao fim do trajeto.",
    label: "Ativo"
  },
  {
    title: "Segurança para todos",
    description: "Mais tranquilidade para passageiros e motoristas em cada corrida.",
    label: "Cobertura"
  },
  {
    title: "Confiança em cada detalhe",
    description: "Um serviço pensado para oferecer mais cuidado e responsabilidade em toda a experiência.",
    label: "Cuidado"
  }
] as const;

const highlights = [
  "Segurança em cada etapa",
  "Veículos selecionados e confortáveis",
  "Atendimento atencioso e profissional",
  "Cuidado do início ao fim"
] as const;

const journeySteps = [
  {
    step: "01",
    title: "Personalize sua viagem do seu jeito",
    description: "Defina horário, preferências e detalhes importantes para que sua experiência seja exatamente como você precisa."
  },
  {
    step: "02",
    title: "Confirmação com atenção",
    description: "O motorista avalia sua solicitação antes de aceitar, garantindo mais preparo e qualidade no atendimento."
  },
  {
    step: "03",
    title: "Viaje com mais tranquilidade",
    description: "Com tudo alinhado com antecedência, sua viagem acontece com mais conforto, organização e previsibilidade."
  }
] as const;

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  return (
    <main className="marketing-page">
      <section className="marketing-hero">
        <div className="marketing-hero-nav">
          <Link href="/" className="marketing-brand" aria-label="Inturb">
            <span className="marketing-brand-mark">
              <BrandLogo />
            </span>
            <span className="marketing-brand-copy">Inteligencia em Transporte Urbano</span>
          </Link>

          <div className="marketing-nav-actions">
            <Link href="#diferenciais" className="marketing-nav-link">
              Diferenciais
            </Link>
            <Link href="#como-funciona" className="marketing-nav-link">
              Como funciona
            </Link>
            <Link href={adminPanelUrl} className="marketing-nav-cta" target="_blank" rel="noreferrer">
              Agendar minha viagem
            </Link>
          </div>
        </div>

        <div className="marketing-hero-grid">
          <div className="marketing-hero-copy">
            <span className="marketing-kicker">UMA NOVA EXPERIÊNCIA EM TRANSPORTE</span>
            <h1>Uma experiência premium em transporte.</h1>
            <p>
              Na Inturb, cada viagem é planejada com atenção aos detalhes para oferecer mais conforto, organização e confiança em toda a
              jornada.
            </p>

            <div className="marketing-hero-actions">
              <Link href={passengerAppUrl} className="marketing-primary-cta" target="_blank" rel="noreferrer">
                Agendar uma viagem
              </Link>
              <Link href="#diferenciais" className="marketing-secondary-cta">
                Ver como funciona
              </Link>
            </div>

            <div className="marketing-highlight-list" aria-label="Pontos principais">
              {highlights.map((item) => (
                <span key={item} className="marketing-highlight-item">
                  <span className="marketing-highlight-icon-wrap" aria-hidden="true">
                    <img src="/check.svg" alt="" className="marketing-highlight-icon" />
                  </span>
                  <span className="marketing-highlight-text">{item}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="marketing-hero-visual" aria-hidden="true">
            <div className="marketing-hero-stage">
              <div className="marketing-hero-stage-grid" />
              <div className="marketing-hero-stage-glow" />

              <div className="marketing-hero-route-card marketing-hero-route-card-top">
                <span>Agendamento</span>
                <strong>Viagem organizada com antecedência</strong>
              </div>

              <div className="marketing-hero-stage-core">
                <span className="marketing-hero-stage-label">Experiência Inturb</span>
                <strong>Sua viagem mais previsível, confortável e bem acompanhada.</strong>
                <p>Do pedido ao desembarque, tudo é pensado para transmitir cuidado e clareza no trajeto.</p>

                <div className="marketing-hero-route-line">
                  <span className="marketing-hero-route-stop marketing-hero-route-stop-start">Origem</span>
                  <span className="marketing-hero-route-stop marketing-hero-route-stop-middle">Confirmação</span>
                  <span className="marketing-hero-route-stop marketing-hero-route-stop-end">Destino</span>
                </div>
              </div>

              <div className="marketing-hero-route-card marketing-hero-route-card-bottom">
                <span>Atendimento humano</span>
                <strong>Mais confiança durante toda a jornada</strong>
              </div>

              <div className="marketing-hero-stat marketing-hero-stat-left">
                <span>Cuidado</span>
                <strong>em cada etapa</strong>
              </div>

              <div className="marketing-hero-stat marketing-hero-stat-right">
                <span>Conforto</span>
                <strong>no ambiente</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section" id="diferenciais">
        <div className="marketing-section-heading">
          <span className="marketing-kicker">Por que isso importa</span>
          <h2>Uma experiência pensada para te deixar tranquilo desde o início.</h2>
          <p>
            O foco aqui e apresentar o projeto com uma linguagem que conversa com passageiros, reforcando percepcao de cuidado,
            credibilidade e conforto.
          </p>
        </div>

        <PillarCarousel items={trustPillars} />
      </section>

      <section className="marketing-section marketing-section-trip-types" id="tipos-de-viagem">
        <div className="marketing-section-heading marketing-trip-types-heading">
          <span className="marketing-kicker">EXPERIÊNCIAS DE VIAGEM</span>
          <h2>Uma viagem para cada necessidade</h2>
          <p>Escolha o tipo de viagem ideal e personalize sua experiência com mais conforto, organização e cuidado.</p>
        </div>

        <div className="marketing-trip-types-grid">
          {tripTypes.map((item) => (
            <article key={item.title} className="marketing-trip-type-card">
              <span className={`marketing-trip-type-icon marketing-trip-type-icon-${item.icon}`} aria-hidden="true" />
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-section-insurance" id="seguro">
        <div className="marketing-insurance-panel">
          <div className="marketing-insurance-layout">
            <div className="marketing-insurance-copy">
              <span className="marketing-kicker">SEGURANÇA EM CADA VIAGEM</span>
              <h2>Seguro em todas as viagens, mais tranquilidade para você.</h2>
              <p>
                Cada corrida realizada pela Inturb conta com cobertura para imprevistos, reforçando o cuidado e a confiança em toda a
                jornada.
              </p>
            </div>

            <div className="marketing-insurance-visual">
              <div className="marketing-insurance-frame">
                <div className="marketing-insurance-screen">
                  <div className="marketing-insurance-screen-top">
                    <span>Proteção em toda a jornada</span>
                    <span>Cobertura ativa</span>
                  </div>

                  <div className="marketing-insurance-screen-list">
                    {insuranceHighlights.map((item, index) => (
                      <article key={item.title} className="marketing-insurance-row">
                        <div className="marketing-insurance-row-copy">
                          <span className="marketing-insurance-row-step">0{index + 1}</span>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </div>

                        <span className="marketing-insurance-row-tag">{item.label}</span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <div className="marketing-insurance-floating marketing-insurance-floating-top">
                <span>Viagens protegidas</span>
                <strong>do início ao fim</strong>
              </div>

              <div className="marketing-insurance-floating marketing-insurance-floating-bottom">
                <span>Mais confiança</span>
                <strong>para quem embarca</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section-contrast" id="como-funciona">
        <div className="marketing-section-heading">
          <span className="marketing-kicker">Jornada</span>
          <h2>Uma experiência planejada nos detalhes, para você viajar com tranquilidade.</h2>
        </div>

        <div className="marketing-journey-grid">
          {journeySteps.map((item) => (
            <article key={item.step} className="marketing-journey-card">
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-cta-panel">
          <div>
            <span className="marketing-kicker">Pronto para uma nova experiência em transporte?</span>
            <h2>Mais do que uma corrida, uma experiência planejada.</h2>
            <p>
              Agende sua viagem com mais conforto, organização e tranquilidade. Na Inturb, cada detalhe é pensado para oferecer uma
              experiência mais confiável do início ao fim.
            </p>
          </div>

          <div className="marketing-cta-actions">
            <Link href={passengerAppUrl} className="marketing-primary-cta" target="_blank" rel="noreferrer">
              Agendar minha viagem
            </Link>
            {/* <Link href={adminPanelUrl} className="marketing-secondary-cta" target="_blank" rel="noreferrer">
              Acessar painel interno
            </Link> */}
          </div>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-footer-brand">
          <Link href="/" className="marketing-brand" aria-label="Inturb">
            <span className="marketing-brand-mark">
              <BrandLogo />
            </span>
            <span className="marketing-brand-copy">Inteligencia em Transporte Urbano</span>
          </Link>
          <p>Transporte com mais conforto, organização e cuidado em cada experiência de viagem.</p>
        </div>

        <div className="marketing-footer-links">
          <Link href="#diferenciais">Diferenciais</Link>
          <Link href="#tipos-de-viagem">Tipos de viagem</Link>
          <Link href="#seguro">Segurança</Link>
          <Link href="#como-funciona">Como funciona</Link>
          <Link href={passengerAppUrl} target="_blank" rel="noreferrer">
            Agendar viagem
          </Link>
        </div>

        <div className="marketing-footer-meta">
          <span>© {currentYear} Inturb</span>
          <span>Experiência planejada do início ao fim.</span>
        </div>
      </footer>
    </main>
  );
}
