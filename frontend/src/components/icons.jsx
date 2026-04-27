/**
 * @fileoverview Documentation for components/icons.
 * @module components/icons
 */


/**
 * Documentation for components/icons.
 *
 * @component
 * @param {object} props
 * @param {string} [props.className="h-4 w-4"]
 * @returns {JSX.Element}
 */
export function VisualModeIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Documentation for components/icons.
 *
 * @component
 * @param {object} props
 * @param {string} [props.className="h-4 w-4"]
 * @returns {JSX.Element}
 */
export function InterpretiveModeIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
