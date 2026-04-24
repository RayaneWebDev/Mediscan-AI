function SearchFilterCard({ children, className = "" }) {
  return (
    <div className={`search-filter-card rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5 ${className}`}>
      {children}
    </div>
  );
}

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

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
