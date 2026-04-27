/**
 * @fileoverview Documentation for components/StatusBar.
 * @module components/StatusBar
 */

/**
 * Documentation for components/StatusBar.
 *
 * @component
 * @param {object} props
 * @param {{type: "loading"|"error", message: string}|null} props.status
 * @param {"primary"|"accent"} [props.tone="primary"]
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {boolean} [props.enableToneTransition=false]
 * @returns {JSX.Element|null}
 */
export default function StatusBar({
  status,
  tone = "primary",
  useHomeVisualTone = false,
  enableToneTransition = false,
}) {
  if (!status) return null;

  const isError = status.type === "error";
  const isLoading = status.type === "loading";

  const isAccent = tone === "accent";
  const useHomePrimaryTone = useHomeVisualTone && !isAccent;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`${enableToneTransition ? "search-tone-transition " : ""}search-status flex items-center gap-3 py-3 px-4 my-5 rounded-xl text-sm font-medium border
        ${isError ? "bg-red-500/10 text-red-400 border-red-500/25" : ""}
        ${isLoading && !isAccent ? useHomePrimaryTone ? "mediscan-primary-surface mediscan-primary-text" : "bg-primary-pale text-primary border-primary/20" : ""}
        ${isLoading && isAccent ? "mediscan-accent-surface mediscan-accent-text" : ""}
      `}
    >
      {isLoading && (
        <span className={`inline-block w-4 h-4 border-2 rounded-full animate-spin shrink-0
          ${!isAccent ? "search-status-spinner-primary" : ""}
          ${isAccent ? "border-accent/30 border-t-accent" : "border-primary/30 border-t-primary"}`}
        />
      )}
      {isError && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {status.message}
    </div>
  );
}
