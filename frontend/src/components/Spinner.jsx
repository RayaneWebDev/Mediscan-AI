/**
 * @fileoverview Documentation for components/Spinner.
 * @module components/Spinner
 */

/**
 * Documentation for components/Spinner.
 *
 * @component
 * @param {object} props
 * @param {string} [props.label]
 * @param {"primary"|"accent"} [props.tone="primary"]
 * @param {"sm"|"md"|"lg"} [props.size="md"]
 * @param {boolean} [props.inline=false]
 * @returns {JSX.Element}
 */
export default function Spinner({ label, tone = "primary", size = "md", inline = false }) {
  const sizeClass = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const colorClass =
    tone === "accent"
      ? "border-accent/20 border-t-accent/70"
      : "border-primary/20 border-t-primary/70";

  return (
    <div className={`flex ${inline ? "flex-row" : "flex-col"} items-center gap-3`}>
      <div className={`animate-spin rounded-full border-2 ${sizeClass} ${colorClass}`} />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
