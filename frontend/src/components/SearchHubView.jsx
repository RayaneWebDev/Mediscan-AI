import { useContext, useEffect, useState } from "react";
import { LangContext } from "../context/lang-context";

function getFeatureTone(feature, tone) {
  const normalized = feature
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("semantic image comparison")) {
    return "search-hub-chip search-hub-chip-primary";
  }

  return tone === "primary"
    ? "search-hub-chip search-hub-chip-primary"
    : "search-hub-chip search-hub-chip-accent";
}

function isSemanticImageComparison(feature) {
  return feature
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("semantic image comparison");
}

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
          shell: "search-hub-card search-hub-card-primary",
          iconShell: "search-hub-card-icon search-hub-card-icon-primary",
          cta: "search-hub-cta search-hub-cta-primary",
        }
      : {
          shell: "search-hub-card search-hub-card-accent",
          iconShell: "search-hub-card-icon search-hub-card-icon-accent",
          cta: "search-hub-cta search-hub-cta-accent",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left ${toneClasses.shell}`}
      style={{
        opacity: ready ? 1 : 0,
        transform: ready ? "translateY(0) scale(1)" : "translateY(28px) scale(0.985)",
        transition:
          "opacity 520ms cubic-bezier(0.16, 1, 0.3, 1), transform 620ms cubic-bezier(0.16, 1, 0.3, 1), translate 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms ease, border-color 300ms ease",
        transitionDelay: `${delayMs}ms`,
        willChange: "opacity, transform, translate, border-color",
      }}
    >
      <div className="relative z-10">
        <div className={`mb-6 ${toneClasses.iconShell}`}>
          {icon}
        </div>

        <h2 className="search-hub-card-title mb-3 text-2xl font-bold">{title}</h2>
        <p className="mb-6 text-muted leading-relaxed">{description}</p>

        <div className="mb-8 flex flex-wrap gap-2">
          {features.map((feature) => (
            isSemanticImageComparison(feature) ? (
              <span key={feature} className="basis-full">
                <span
                    className={getFeatureTone(feature, tone)}
                >
                  {feature}
                </span>
              </span>
            ) : (
              <span
                key={feature}
                className={getFeatureTone(feature, tone)}
              >
                {feature}
              </span>
            )
          ))}
        </div>

        <span className={toneClasses.cta}>
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

export default function SearchHubView({ onChooseImage, onChooseText, useSharedSurface = false }) {
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
    <div className={`${useSharedSurface ? "bg-transparent" : "search-hub-surface"} relative box-border h-[calc(100dvh-4rem)] overflow-hidden px-6 py-8 md:h-[calc(100dvh-5rem)] md:py-12`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-6%] top-[20%] h-80 w-80 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1120px] flex-col items-center justify-start pt-10 md:pt-14">
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
          <h1 className="search-hub-card-title mb-4 text-4xl font-bold tracking-tight md:text-5xl">
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
