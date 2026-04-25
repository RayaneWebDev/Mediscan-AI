/** 
 * @fileoverview Composant de chargement animé.
 * @module components/Spinner
 */

/**
 * Spinner de chargement animé.
 *
 * @component
 * @param {object} props
 * @param {string} [props.label] - Texte affiché sous le spinner
 * @param {"primary"|"accent"} [props.tone="primary"] - Palette de couleur
 * @param {"sm"|"md"|"lg"} [props.size="md"] - Taille du spinner
 * @param {boolean} [props.inline=false] - Affiche le spinner et le label côte à côte
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
