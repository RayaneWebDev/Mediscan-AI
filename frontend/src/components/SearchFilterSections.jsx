/**
 * @fileoverview Filter card components for the CBIR search page.
 * @module components/SearchFilterSections
 */

/**
 * Render the base card wrapper used around search filters.
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
 * Join CSS class names after filtering empty values.
 * @param {...string} classNames
 * @returns {string}
 */
function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

/**
 * Render the filter panel header with title, active count, and reset action.
 *
 * @component
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.titleClassName=""]
 * @param {string} props.infoLabel
 * @param {function(): void} props.onInfoClick
 * @param {string} [props.infoButtonClassName=""]
 * @param {number} [props.activeFilterCount=0]
 * @param {string} [props.activeCountClassName=""]
 * @param {string} props.hint
 * @param {string} [props.hintClassName=""]
 * @param {function(): void} props.onReset
 * @param {boolean} [props.resetDisabled=false]
 * @param {string} props.resetLabel
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
 * Render the caption text filter and curated quick-term chips.
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {string} props.value
 * @param {function(string): void} props.onChange
 * @param {string} props.placeholder
 * @param {string} [props.inputWrapperClassName="mt-1.5"]
 * @param {string} [props.inputClassName=""]
 * @param {React.ReactNode} [props.leadingIcon=null]
 * @param {Array<{id: string, label: string, count: number}>} [props.suggestedFilters=[]]
 * @param {string[]} [props.activeFilterIds=[]]
 * @param {function(string): void} props.onToggleFilter
 * @param {function(boolean): string} props.getToggleClassName
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
 * Render free-text CUI search plus type-specific CUI select controls.
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {string} props.value
 * @param {function(string): void} props.onChange
 * @param {string} props.placeholder
 * @param {string} [props.inputClassName=""]
 * @param {Array<{label: string, value: string, onChange: function, options: Array<{cui: string, label_fr: string, label_en: string}>}>} props.selectGroups
 * @param {string} [props.selectLabelClassName=""]
 * @param {string} [props.selectClassName=""]
 * @param {string} props.lang
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
 * Render the minimum-score filter as a percentage slider.
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {number} props.value
 * @param {function(number): void} props.onChange
 * @param {string} [props.sliderClassName=""]
 * @param {string} [props.scoreClassName=""]
 * @param {object} [props.scoreStyle]
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
 * Render the image/reference identifier text filter.
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
 * Render the result sort control as a segmented option group.
 *
 * @component
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.labelClassName=""]
 * @param {string} [props.shellClassName=""]
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} props.currentValue
 * @param {function(string): void} props.onChange
 * @param {function(string, boolean): string} props.getOptionClassName
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
