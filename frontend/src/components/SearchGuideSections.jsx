/** 
 * @fileoverview Composants de sections d'aide pour la page de recherche CBIR.
 * @module components/SearchGuideSections
 */
 
/**
 * En-tête de section guide avec eyebrow, titre et description.
 *
 * @component
 * @param {object} props
 * @param {string} props.eyebrowId - ID HTML pour l'eyebrow (accessibilité)
 * @param {string} props.eyebrow - Texte eyebrow au-dessus du titre
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.containerClassName="max-w-3xl"]
 * @param {string} [props.eyebrowClassName=""]
 * @param {string} [props.titleClassName=""]
 * @param {string} [props.descriptionClassName=""]
 * @returns {JSX.Element}
 */
export function SearchGuideSectionHeader({
  eyebrowId,
  eyebrow,
  title,
  description,
  containerClassName = "max-w-3xl",
  eyebrowClassName = "",
  titleClassName = "",
  descriptionClassName = "",
}) {
  return (
    <div className={containerClassName}>
      <p id={eyebrowId} className={eyebrowClassName}>
        {eyebrow}
      </p>
      <h2 className={titleClassName}>
        {title}
      </h2>
      <p className={descriptionClassName}>
        {description}
      </p>
    </div>
  );
}

/**
 * Carte d'aide individuelle avec icône, label, titre, description et note.
 *
 * @component
 * @param {object} props
 * @param {React.ReactNode} props.icon - Icône SVG ou composant
 * @param {string} props.label - Chip de catégorie
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.note] - Note complémentaire en bas de la carte
 * @param {string} [props.articleClassName="flex items-start gap-4"]
 * @param {string} [props.iconWrapperClassName=""]
 * @param {string} [props.contentClassName="min-w-0"]
 * @param {string} [props.headingClassName="flex flex-wrap items-center gap-2"]
 * @param {string} [props.chipClassName=""]
 * @param {string} [props.titleClassName=""]
 * @param {string} [props.descriptionClassName=""]
 * @param {string} [props.noteClassName=""]
 * @returns {JSX.Element}
 */
export function SearchGuideCard({
  icon,
  label,
  title,
  description,
  note,
  articleClassName = "flex items-start gap-4",
  iconWrapperClassName = "",
  contentClassName = "min-w-0",
  headingClassName = "flex flex-wrap items-center gap-2",
  chipClassName = "",
  titleClassName = "",
  descriptionClassName = "",
  noteClassName = "",
}) {
  return (
    <article className={articleClassName}>
      <div className={iconWrapperClassName}>
        {icon}
      </div>
      <div className={contentClassName}>
        <div className={headingClassName}>
          <span className={chipClassName}>
            {label}
          </span>
          <h3 className={titleClassName}>
            {title}
          </h3>
        </div>
        <p className={descriptionClassName}>
          {description}
        </p>
        <p className={noteClassName}>
          {note}
        </p>
      </div>
    </article>
  );
}
