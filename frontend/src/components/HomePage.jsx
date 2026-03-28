import {
  BetweenHorizontalStart,
  Blocks,
  Brain,
  HardDrive,
  Hospital,
  Microscope,
  Route,
  Search,
  Stethoscope,
  UserKey,

} from "lucide-react";
import { useContext } from "react";
import { LangContext } from "../context/lang-context";

const benefitIcons = {
  route: Route,
  "between-horizontal-start": BetweenHorizontalStart,
  brain: Brain,
  "user-key": UserKey,
  "hard-drive": HardDrive,
  blocks: Blocks,
};

const useCaseIcons = {
  stethoscope: Stethoscope,
  microscope: Microscope,
  hospital: Hospital,
  search: Search,
};


function BenefitCard({ icon, title, description }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="w-10 h-10 rounded-xl bg-primary-pale text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-text mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function UseCaseCard({ title, description, icon }) {
  return (
    <div className="bg-gradient-to-br from-primary-pale to-surface border border-primary/20 rounded-2xl p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="font-bold text-text mb-2">{title}</h4>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}

export default function HomePage({ onPageChange }) {
  const { t } = useContext(LangContext);
  const content = t.home;

  return (
    <div className="bg-bg transition-colors duration-300 -mt-16 md:-mt-20">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary-pale via-bg-soft to-bg min-h-[88vh] flex items-center">
        {/* Left content */}
        <div className="relative z-10 w-full md:w-[50%] px-8 md:px-20 py-8">
          <div className="flex flex-col gap-6">

            <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-extrabold text-text leading-[1.1] tracking-tight">
              {content.headline1}<br/>
              {content.headline2}
            </h1>

            <p className="text-sm md:text-base text-muted leading-relaxed max-w-[400px]">
              {content.description}
            </p>

            <div className="flex gap-3 flex-wrap pt-1">
              <button onClick={() => onPageChange("search")} className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm cursor-pointer">
                {content.cta1}
              </button>
              <button onClick={() => onPageChange("features")} className="px-8 py-3 rounded-xl border-2 border-primary/40 text-primary font-semibold hover:bg-primary-pale hover:border-primary transition-all text-sm cursor-pointer">
                {content.cta2}
              </button>
            </div>

          </div>
        </div>

        {/* Right - Visual */}
        <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-[54%] items-center justify-center px-6 lg:px-12">
          <div className="absolute inset-y-0 left-0 w-32 lg:w-48 bg-gradient-to-r from-bg-soft to-transparent z-10" />
          <div className="hero-frame relative z-0 w-full max-w-[760px]">
            <img
              src="/HomePres.jpg"
              alt="MEDISCAN AI interface preview"
              className="hero-preview w-full max-h-[72vh] object-contain object-center select-none"
              draggable="false"
            />
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden w-full px-6 pb-12">
          <div className="hero-frame">
            <img
              src="/HomePres.jpg"
              alt="MEDISCAN AI interface preview"
              className="hero-preview w-full object-contain select-none"
              draggable="false"
            />
          </div>
        </div>

      </section>

      {/* Trust Metrics */}
      <section className="max-w-[100%] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { number: content.stats.value1, label: content.stats.title1 },
          { number: content.stats.value2, label: content.stats.title2 },
          { number: content.stats.value3, label: content.stats.title3 },
          { number: content.stats.value4, label: content.stats.title4 },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-primary">{stat.number}</p>
            <p className="text-xs text-muted mt-2">{stat.label}</p>
          </div>
        ))}
      </section>


      {/* Key Benefits */}
      <section className="max-w-[1400px] mx-auto px-22 py-25">
                    
          <div className="text-center mb-14">
          
          <h2 className="text-4xl font-bold text-text mb-3">{content.whyChoose.headline}</h2>
          <p className="text-muted max-w-2xl mx-auto">
            {content.whyChoose.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.whyChoose.features.map((feature, i) => {
            const BenefitIcon = benefitIcons[feature.icon];

            return (
              <BenefitCard
                key={i}
                icon={BenefitIcon ? <BenefitIcon className="w-5 h-5" strokeWidth={1.8} /> : null}
                title={feature.title}
                description={feature.desc}
              />
            );
          })}
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-22 pb-24">        

        <h2 className="text-4xl font-bold text-text text-center mb-14">{content.useCases.headline}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {content.useCases.roles.map((role, i) => {
            const UseCaseIcon = useCaseIcons[role.icon];

            return (
              <UseCaseCard
                key={i}
                icon={UseCaseIcon ? <UseCaseIcon className="w-8 h-8 text-primary" strokeWidth={1.8} /> : null}
                title={role.title}
                description={role.desc}
              />
            );
          })}
        </div>
      </section>

      {/* Two Search Modes */}
      <section className="bg-bg-soft py-25 px-6 md:px-22 transition-colors duration-300">        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-4xl font-bold text-text text-center mb-3">{content.modes.headline}</h2>
          <p className="text-muted text-center mb-14 max-w-2xl mx-auto">
            {content.modes.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                name: content.modes.visual.title,
                desc: content.modes.visual.desc,
                use: content.modes.visual.use,
                color: "primary",
              },
              {
                name: content.modes.semantic.title,
                desc: content.modes.semantic.desc,
                use: content.modes.semantic.use,
                color: "accent",
              },
            ].map((mode) => {
              const isBg = mode.color === "primary" ? "from-primary-pale to-surface border-primary/20" : "from-accent-pale to-surface border-accent/20";
              const badge = mode.color === "primary" ? "bg-primary text-white" : "bg-accent text-white";
              return (
                <div key={mode.name} className={`bg-gradient-to-br ${isBg} border rounded-2xl p-8`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${badge} inline-block px-3 py-1 rounded-full mb-4`}>
                    {mode.name}
                  </p>
                  <h3 className="text-2xl font-bold text-text mb-2">{mode.name}</h3>
                  <p className="text-sm text-muted mb-4">{mode.desc}</p>
                  <p className="text-xs font-semibold text-muted mb-4">{mode.use}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
