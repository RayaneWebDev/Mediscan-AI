// src/components/AboutPage.jsx
import { useContext, useEffect, useState } from "react";
import { LangContext } from "../context/lang-context";

function TeamAvatar({ member }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = member.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  if (!member.photo || imageFailed) {
    return (
      <div
        aria-label={member.name}
        className="w-24 h-24 rounded-full mb-4 bg-primary-pale text-primary flex items-center justify-center font-semibold"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={member.photo}
      alt={member.name}
      className="w-24 h-24 rounded-full mb-4 object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function AboutPage() {
  const { t } = useContext(LangContext);
  const content = t.about;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="bg-transparent py-16">

      {/* Hero / Header */}
      <section
        className={`page-container text-center mb-16 ${ready ? "by-image-panel-enter-up" : "opacity-0"}`}
        style={{ animationDelay: "0ms" }}
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-title mb-4">
          {content.headline}
        </h1>
        <p className="text-muted max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
          {content.description}
        </p>
      </section>

      {/* Mission / Vision */}
      <section className="page-container grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div
          className={ready ? "by-image-panel-enter-left" : "opacity-0"}
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="text-3xl font-bold text-title mb-4">{content.mission.title}</h2>
          <p className="text-muted leading-relaxed">{content.mission.text}</p>
        </div>
        <div
          className={ready ? "by-image-panel-enter-right" : "opacity-0"}
          style={{ animationDelay: "160ms" }}
        >
          <h2 className="text-3xl font-bold text-title mb-4">{content.vision.title}</h2>
          <p className="text-muted leading-relaxed">{content.vision.text}</p>
        </div>
      </section>

      {/* Team Members */}
      <section className="page-container mb-16">
        <h2
          className={`text-3xl font-bold text-title text-center mb-12 ${ready ? "by-image-panel-enter-up" : "opacity-0"}`}
          style={{ animationDelay: "200ms" }}
        >
          {content.team.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {content.team.members.map((member, idx) => (
            <div
              key={idx}
              className={`bg-surface rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-all ${ready ? "by-image-panel-enter-up" : "opacity-0"}`}
              style={{ animationDelay: `${260 + idx * 60}ms` }}
            >
              <TeamAvatar member={member} />
              <h3 className="font-bold text-title mb-1">{member.name}</h3>
              <p className="text-sm text-muted">{member.role}</p>
            </div>
          ))}
        </div>
      </section>


    </div>
  );
}
