import { Mail, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/lang-context";

export default function ContactPage() {
  const { t } = useContext(LangContext);
  const content = t.contact;
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(form.subject.trim());
    const body = encodeURIComponent(
      [
        `${content.formName}: ${form.name.trim()}`,
        `${content.formEmail}: ${form.email.trim()}`,
        "",
        form.message.trim(),
      ].join("\n")
    );
    window.location.href = `mailto:${content.supportAddr}?subject=${subject}&body=${body}`;
    setSent(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  const inputClass = (name) =>
    `w-full px-4 py-3 rounded-xl border text-text text-sm placeholder:text-muted/40 bg-bg focus:outline-none transition-all duration-200 ${
      focused === name
        ? "border-text/30 ring-2 ring-text/8 shadow-sm"
        : "border-border hover:border-text/20"
    }`;

  return (
    <div className="-mt-16 md:-mt-20">
      <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-12 pt-28 md:pt-32 pb-20">

        {/* Header */}
        <div className="mb-8 md:mb-10 mt-6 md:mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-title tracking-tight mb-3 leading-tight">
            {content.headline}
          </h1>
          <p className="text-base md:text-lg text-muted max-w-md leading-relaxed">
            {content.description}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 items-start">

          {/* Left — info cards */}
          <div className={`lg:col-span-2 flex flex-col gap-4 ${ready ? "by-image-panel-enter-left" : "opacity-0"}`}>

            {/* Email card */}
            <div className="p-6 rounded-2xl border border-border bg-bg hover:border-text/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-text/6 flex items-center justify-center mb-4">
                <Mail className="w-4.5 h-4.5 text-text" strokeWidth={1.8} />
              </div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                {content.supportLabel}
              </p>
              <p className="text-sm text-muted leading-relaxed mb-4">
                {content.supportDesc}
              </p>
              <a
                href={`mailto:${content.supportAddr}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-text hover:gap-2.5 transition-all duration-200"
              >
                {content.supportAddr}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </a>
            </div>

            {/* Response time card */}
            <div className="p-6 rounded-2xl border border-border bg-bg hover:border-text/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-text/6 flex items-center justify-center mb-4">
                <Clock className="w-4.5 h-4.5 text-text" strokeWidth={1.8} />
              </div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                {content.responseLabel}
              </p>
              <p className="text-sm text-muted leading-relaxed">
                {content.responseDesc}
              </p>
            </div>

          </div>

          {/* Right — form */}
          <div className={`lg:col-span-3 ${ready ? "by-image-panel-enter-right" : "opacity-0"}`}>
            {sent ? (
              <div className="p-10 rounded-2xl border border-border bg-bg flex flex-col items-center justify-center gap-5 text-center min-h-[440px]">
                <div className="w-14 h-14 rounded-full bg-text/8 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-text" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-title mb-2">{content.sentTitle}</h3>
                  <p className="text-muted text-sm max-w-xs leading-relaxed">{content.sentDesc}</p>
                </div>
                <button
                  onClick={() => setSent(false)}
                  className="mt-2 px-5 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-text hover:border-text/30 transition-all duration-200"
                >
                  {content.sentAnother}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-7 md:p-9 rounded-2xl border border-border bg-bg space-y-5"
              >
                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-text mb-2">
                      {content.formName}
                      <span className="text-muted ml-1">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                      required
                      className={inputClass("name")}
                      placeholder={content.formPlaceholder1}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-text mb-2">
                      {content.formEmail}
                      <span className="text-muted ml-1">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      required
                      className={inputClass("email")}
                      placeholder={content.formPlaceholder2}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-text mb-2">
                    {content.formSubject}
                    <span className="text-muted ml-1">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    onFocus={() => setFocused("subject")}
                    onBlur={() => setFocused(null)}
                    required
                    className={inputClass("subject")}
                    placeholder={content.formSubjectPlaceholder}
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-text mb-2">
                    {content.formMessage}
                    <span className="text-muted ml-1">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    onFocus={() => setFocused("message")}
                    onBlur={() => setFocused(null)}
                    required
                    rows={5}
                    className={inputClass("message")}
                    placeholder={content.formPlaceholder4}
                  />
                </div>

                {/* Submit */}
                <div className="pt-1">
                  <button
                    type="submit"
                    className="home-hero-button-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 group"
                  >
                    {content.formSubmit}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                  </button>
                  <p className="text-xs text-muted/50 text-center mt-4">{content.formPrivacy}</p>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
