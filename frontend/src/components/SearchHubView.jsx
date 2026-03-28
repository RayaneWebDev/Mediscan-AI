import { useContext, useEffect, useState } from "react";
import { LangContext } from "../context/lang-context";

function SearchChoiceCard({
  onClick,
  title,
  description,
  features,
  cta,
  tone,
  ready,
  delayMs,
  icon,
}) {
  const toneClasses =
    tone === "primary"
      ? {
          shell: "from-primary-pale/95 via-surface to-surface border-primary/18",
          glow: "bg-primary/10",
          iconShell: "bg-primary/10 text-primary group-hover:bg-primary/18",
          chip: "bg-primary/10 text-primary",
          cta: "text-primary",
          accent: "from-primary/70 via-primary-light/45 to-transparent",
        }
      : {
          shell: "from-accent-pale/95 via-surface to-surface border-accent/18",
          glow: "bg-accent/10",
          iconShell: "bg-accent/10 text-accent group-hover:bg-accent/18",
          chip: "bg-accent/10 text-accent",
          cta: "text-accent",
          accent: "from-accent/70 via-accent-light/45 to-transparent",
        };

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden text-left bg-gradient-to-br ${toneClasses.shell} border rounded-[28px] p-10 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]`}
      style={{
        opacity: ready ? 1 : 0,
        transform: ready ? "translateY(0) scale(1)" : "translateY(28px) scale(0.985)",
        transition:
          "opacity 520ms cubic-bezier(0.16, 1, 0.3, 1), transform 620ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease, border-color 300ms ease",
        transitionDelay: `${delayMs}ms`,
        willChange: "opacity, transform",
      }}
    >
      <div className={`pointer-events-none absolute inset-0 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${toneClasses.glow}`} />
      <div className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r ${toneClasses.accent}`} />

      <div className="relative z-10">
        <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${toneClasses.iconShell}`}>
          {icon}
        </div>

        <h2 className="mb-3 text-2xl font-bold text-text">{title}</h2>
        <p className="mb-6 text-muted leading-relaxed">{description}</p>

        <div className="mb-8 flex flex-wrap gap-2">
          {features.map((feature) => (
            <span
              key={feature}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses.chip}`}
            >
              {feature}
            </span>
          ))}
        </div>

        <span className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3 ${toneClasses.cta}`}>
          {cta}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </button>
  );
}

export default function SearchHubView({ onChooseImage, onChooseText }) {
  const { t } = useContext(LangContext);
  const hub = t.search.hub;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative box-border h-[100dvh] overflow-hidden bg-bg px-6 py-10 md:py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-6%] top-[20%] h-80 w-80 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1120px] flex-col items-center justify-center">
        <section
          className="mb-14 w-full max-w-[760px] text-center"
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 520ms cubic-bezier(0.16, 1, 0.3, 1), transform 620ms cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "opacity, transform",
          }}
        >
          <div className="mx-auto mb-5 h-px w-28 bg-gradient-to-r from-transparent via-border to-transparent" />
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-text md:text-5xl">
            {hub.headline}
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted">
            {hub.description}
          </p>
        </section>

        <div className="grid w-full max-w-[980px] grid-cols-1 gap-10 md:grid-cols-2">
          <SearchChoiceCard
            onClick={onChooseImage}
            title={hub.imageCard.title}
            description={hub.imageCard.desc}
            features={hub.imageCard.features}
            cta={hub.imageCard.cta}
            tone="primary"
            ready={ready}
            delayMs={80}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            }
          />

          <SearchChoiceCard
            onClick={onChooseText}
            title={hub.textCard.title}
            description={hub.textCard.desc}
            features={hub.textCard.features}
            cta={hub.textCard.cta}
            tone="accent"
            ready={ready}
            delayMs={160}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="15" y2="10" />
                <line x1="9" y1="14" x2="13" y2="14" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
