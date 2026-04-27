/**
 * @fileoverview Page de contact avec formulaire.
 * @module components/ContactPage
 */

import { Mail, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/LangContextValue";
import { sendContactMessage } from "../api";


/**
 * Page de contact avec formulaire (nom, email, sujet, message).
 * Documentation for components/ContactPage.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function ContactPage() {

  const { t } = useContext(LangContext);
  const content = t.contact;

  /** Contact form state. */
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  /** Indicate whether the message was sent successfully. */
  const [sent, setSent] = useState(false);
  /** Indicate whether submission is in progress. */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Submission error message. */
  const [error, setError] = useState("");
  /** Nom du champ actuellement focus. */
  const [focused, setFocused] = useState(null);
  /** Trigger entry animations after the first frame. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /**
   * Documentation for components/ContactPage.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e
  */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Soumet le formulaire de contact.
   * Documentation for components/ContactPage.
  */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        website: form.website.trim(),
      });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
    } catch (err) {
      setError(err.message || content.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Documentation for components/ContactPage.
   * @param {string} name
   * @returns {string}
  */
  const inputClass = (name) =>
    `w-full px-4 py-3 rounded-xl border text-text text-sm placeholder:text-muted/40 bg-bg focus:outline-none transition-all duration-200 ${
      focused === name
        ? "border-text/30 ring-2 ring-text/8 shadow-sm"
        : "border-border hover:border-text/20"
    }`;

  return (
    <div className="home-page contact-page-surface -mt-16 md:-mt-20">
      <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-12 pt-28 md:pt-32 pb-20">

        {/* Header */}
        <div className="mb-8 md:mb-10 mt-6 md:mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-title tracking-tight mb-3 leading-tight">
            {content.headline}
          </h1>
          <div className="w-10 h-0.5 bg-semantic mb-5 rounded" />
          <p className="text-base md:text-lg text-muted max-w-md leading-relaxed">
            {content.description}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 items-start">

          {/* Left — info cards */}
          <div className={`lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-4 ${ready ? "by-image-panel-enter-left" : "opacity-0"}`}>

            <div className="p-4 md:p-6 rounded-2xl border border-border bg-bg hover:border-text/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-text/6 flex items-center justify-center mb-3">
                <Mail className="w-4.5 h-4.5 text-text" strokeWidth={1.8} />
              </div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                {content.supportLabel}
              </p>
              <p className="text-sm text-muted leading-relaxed mb-3 hidden md:block">
                {content.supportDesc}
              </p>

                <a href={`mailto:${content.supportAddr}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-text hover:gap-2.5 transition-all duration-200"
              >
                <span className="hidden md:inline">{content.supportAddr}</span>
                <span className="md:hidden">Email</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </a>
            </div>

            <div className="p-4 md:p-6 rounded-2xl border border-border bg-bg hover:border-text/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-text/6 flex items-center justify-center mb-3">
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
                  onClick={() => {
                    setSent(false);
                    setError("");
                  }}
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
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="hidden"
                />
                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-text mb-2">
                      {content.formName}
                      <span className="text-red-500 font-medium ml-1">*</span>
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
                      <span className="text-red-500 font-medium ml-1">*</span>
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
                    <span className="text-red-500 font-medium ml-1">*</span>
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
                    <span className="text-red-500 font-medium ml-1">*</span>
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
                  {error ? (
                    <p className="mb-3 rounded-xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
                      {error}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="home-hero-button-primary home-hero-button-scan w-full text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? content.formSending : content.formSubmit}
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
