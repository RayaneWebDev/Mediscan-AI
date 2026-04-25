/** 
 * @fileoverview Composants de cartes de filtres pour la page de recherche CBIR.
 * @module components/SearchFilterSections
 */
 
/**
 * Carte de base enveloppant les filtres de recherche.
 * @component
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className=""]
 * @returns {JSX.Element}
 */
function SearchFilterCard({ children, className = "" }) {
  return (
    <div className={`search-filter-card rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Joint des noms de classes CSS en filtrant les valeurs vides.
 * @param {...string} classNames
 * @returns {string}
 */
function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

/**
 * En-tête du panneau de filtres avec titre, compteur de filtres actifs et bouton reset.
 *
 * @component
 * @param {object} props
 * @param {string} props.title - Titre du panneau
 * @param {string} [props.titleClassName=""]
 * @param {string} props.infoLabel - Label aria du bouton info
 * @param {function(): void} props.onInfoClick - Callback du bouton info
 * @param {string} [props.infoButtonClassName=""]
 * @param {number} [props.activeFilterCount=0] - Nombre de filtres actifs
 * @param {string} [props.activeCountClassName=""]
 * @param {string} props.hint - Texte d'aide sous le titre
 * @param {string} [props.hintClassName=""]
 * @param {function(): void} props.onReset - Callback du bouton reset
 * @param {boolean} [props.resetDisabled=false]
 * @param {string} props.resetLabel - Label du bouton reset
 * @param {string} [props.resetButtonClassName=""]
 * @returns {JSX.Element}
 */
export function SearchFilterPanelHeader({
  title,
  titleClassName = "",
  infoLabel,
  onInfoClick,
  infoButtonClassName = "",
  hint,
  hintClassName = "",
  onReset,
  resetDisabled = false,
  resetLabel,
  resetButtonClassName = "",
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className={titleClassName}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onInfoClick}
            className={infoButtonClassName}
            aria-label={infoLabel}
            title={infoLabel}
          >
            <span aria-hidden="true" className="text-sm font-medium leading-none">i</span>
          </button>
        </div>
        <p className={hintClassName}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={resetDisabled}
        className={resetButtonClassName}
      >
        {resetLabel}
      </button>
    </div>
  );
}


/**
 * Carte de filtre par caption textuelle avec suggestions de termes rapides.
 *
 * @component
 * @param {object} props
 * @param {string} props.label - Label du champ
 * @param {string} [props.labelClassName=""]
 * @param {string} props.value - Valeur courante du champ texte
 * @param {function(string): void} props.onChange - Callback de changement
 * @param {string} props.placeholder
 * @param {string} [props.inputWrapperClassName="mt-1.5"]
 * @param {string} [props.inputClassName=""]
 * @param {React.ReactNode} [props.leadingIcon=null] - Icône à gauche du champ
 * @param {Array<{id: string, label: string, count: number}>} [props.suggestedFilters=[]] - Filtres suggérés
 * @param {string[]} [props.activeFilterIds=[]] - IDs des filtres actifs
 * @param {function(string): void} props.onToggleFilter - Callback de toggle d'un filtre
 * @param {function(boolean): string} props.getToggleClassName - Retourne la classe CSS d'un bouton toggle
 * @param {string} props.quickTermsLabel
 * @param {string} [props.quickTermsLabelClassName=""]
 * @param {string} props.quickTermsHint
 * @param {string} [props.quickTermsHintClassName=""]
 * @param {string} [props.quickTermsListClassName="mt-1.5 flex flex-wrap gap-2"]
 * @returns {JSX.Element}
 */
export function SearchCaptionFilterCard({
  label,
  labelClassName = "",
  value,
  onChange,
  placeholder,
  inputWrapperClassName = "mt-1.5",
  inputClassName = "",
  leadingIcon = null,
  suggestedFilters = [],
  activeFilterIds = [],
  onToggleFilter,
  getToggleClassName,
  quickTermsLabel,
  quickTermsLabelClassName = "",
  quickTermsHint,
  quickTermsHintClassName = "",
  quickTermsListClassName = "mt-1.5 flex flex-wrap gap-2",
}) {
  const wrapperClassName = leadingIcon
    ? `relative ${inputWrapperClassName}`.trim()
    : inputWrapperClassName;

  return (
    <SearchFilterCard>
      <label className={joinClassNames("search-filter-card-label", labelClassName)}>
        {label}
      </label>
      <div className={wrapperClassName}>
        {leadingIcon}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>

      {suggestedFilters.length > 0 && (
        <div className="mt-2.5">
          {quickTermsHint ? (
            <div className="flex items-center justify-between gap-3">
              <p className={quickTermsLabelClassName}>{quickTermsLabel}</p>
              <span className={quickTermsHintClassName}>{quickTermsHint}</span>
            </div>
          ) : (
            <p className={quickTermsLabelClassName}>{quickTermsLabel}</p>
          )}
          <div className={quickTermsListClassName}>
            {suggestedFilters.map((entry) => {
              const isActive = activeFilterIds.includes(entry.id);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onToggleFilter(entry.id)}
                  className={getToggleClassName(isActive)}
                >
                  <span>{entry.label}</span>
                  <span className="opacity-70">{entry.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </SearchFilterCard>
  );
}

/**
 * Carte de filtre par CUI (identifiant de concept médical) avec selects par type.
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {string} props.value - Valeur courante du champ texte CUI
 * @param {function(string): void} props.onChange
 * @param {string} props.placeholder
 * @param {string} [props.inputClassName=""]
 * @param {Array<{label: string, value: string, onChange: function, options: Array<{cui: string, label_fr: string, label_en: string}>}>} props.selectGroups - Groupes de selects par type CUI
 * @param {string} [props.selectLabelClassName=""]
 * @param {string} [props.selectClassName=""]
 * @param {string} props.lang - Langue active ("fr" ou "en")
 * @returns {JSX.Element}
 */
export function SearchCuiFilterCard({
  label,
  labelClassName = "",
  value,
  onChange,
  placeholder,
  inputClassName = "",
  selectGroups,
  selectLabelClassName = "",
  selectClassName = "",
  lang,
}) {
  return (
    <SearchFilterCard>
      <div>
        <label className={joinClassNames("search-filter-card-label", labelClassName)}>
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {selectGroups.map(({ label: groupLabel, value: groupValue, onChange: onGroupChange, options }) => (
          <div key={groupLabel}>
            <label className={joinClassNames("search-filter-card-sublabel", selectLabelClassName)}>
              {groupLabel}
            </label>
            <div className="relative mt-1">
              <select
                value={groupValue}
                onChange={(event) => onGroupChange(event.target.value)}
                disabled={options.length === 0}
                className={selectClassName}
              >
                <option value="">—</option>
                {options.map(({ cui, label_fr, label_en }) => (
                  <option key={cui} value={cui}>
                    {lang === "fr" ? label_fr : label_en}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </SearchFilterCard>
  );
}

/**
 * Carte de filtre par score minimum (slider 0–100%).
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {number} props.value - Score minimum entre 0 et 1
 * @param {function(number): void} props.onChange
 * @param {string} [props.sliderClassName=""]
 * @param {string} [props.scoreClassName=""]
 * @param {object} [props.scoreStyle] - Style inline sur la valeur affichée
 * @param {string} [props.scaleClassName=""]
 * @returns {JSX.Element}
 */
export function SearchScoreFilterCard({
  label,
  labelClassName = "",
  value,
  onChange,
  sliderClassName = "",
  scoreClassName = "",
  scoreStyle,
  scaleClassName = "",
}) {
  return (
    <SearchFilterCard>
      <label className={joinClassNames("search-filter-card-label", labelClassName)}>
        {label}
      </label>
      <div className="mt-2.5 flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={sliderClassName}
        />
        <span className={scoreClassName} style={scoreStyle}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className={scaleClassName}>
        <span>0%</span>
        <span>100%</span>
      </div>
    </SearchFilterCard>
  );
}

/**
 * Carte de filtre par référence image (champ texte libre).
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {string} props.value
 * @param {function(string): void} props.onChange
 * @param {string} props.placeholder
 * @param {string} [props.inputClassName=""]
 * @returns {JSX.Element}
 */
export function SearchReferenceFilterCard({
  label,
  labelClassName = "",
  value,
  onChange,
  placeholder,
  inputClassName = "",
}) {
  return (
    <SearchFilterCard>
      <label className={joinClassNames("search-filter-card-label", labelClassName)}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </SearchFilterCard>
  );
}

/**
 * Carte de filtre de tri avec boutons de sélection d'option.
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {string} [props.shellClassName=""]
 * @param {Array<{value: string, label: string}>} props.options - Options de tri disponibles
 * @param {string} props.currentValue - Option active
 * @param {function(string): void} props.onChange
 * @param {function(string, boolean): string} props.getOptionClassName - Retourne la classe CSS d'une option
 * @returns {JSX.Element}
 */
export function SearchSortFilterCard({
  label,
  labelClassName = "",
  shellClassName = "",
  options,
  currentValue,
  onChange,
  getOptionClassName,
}) {
  return (
    <SearchFilterCard>
      <label className={joinClassNames("search-filter-card-label", labelClassName)}>
        {label}
      </label>
      <div className={shellClassName}>
        {options.map(({ value, label: optionLabel }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={getOptionClassName(value, currentValue === value)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </SearchFilterCard>
  );
}
