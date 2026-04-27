/**
 * @fileoverview Search page router for hub, image search, and text search views.
 * @module components/SearchPage
 */

import { lazy, Suspense } from "react";
import SearchHubView from "./SearchHubView";
import Spinner from "./Spinner";

// Lazy-load to reduce the initial bundle
const ImageSearchView = lazy(() => import("./ImageSearchView"));
const TextSearchView = lazy(() => import("./TextSearchView"));


/**
 * Render the fallback shown while lazy search views are loading.
 *
 * @component
 * @returns {JSX.Element}
 */
function SearchViewLoader() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-16">
      <div className="flex min-h-[45vh] items-center justify-center rounded-2xl border border-border bg-surface/70 px-6 py-12 shadow-sm backdrop-blur-sm">
        <Spinner label="Chargement de l’interface…" />
      </div>
    </div>
  );
}

/**
 * Render the main CBIR search page container.
 *
 * Heavy image/text workflows are lazy-loaded after the hub so the first search
 * screen stays responsive while preserving one shared chrome/tone contract.
 *
 * @component
 * @param {object} props
 * @param {"hub"|"image"|"text"} [props.view="hub"]
 * @param {function(string): void} [props.onSearchViewChange]
 * @param {function(string): void} [props.onSearchToneChange]
 * @returns {JSX.Element}
 */
export default function SearchPage({
  view = "hub",
  onSearchViewChange,
  onSearchToneChange,
}) {
  const pageShellClass = view === "hub"
    ? "-mt-16 md:-mt-20 pt-16 md:pt-20"
    : "-mt-16 md:-mt-20";

  const views = {
    hub: (
      <SearchHubView
        onChooseImage={() => onSearchViewChange?.("image")}
        onChooseText={() => onSearchViewChange?.("text")}
      />
    ),
    image: (
      <Suspense fallback={<SearchViewLoader />}>
        <ImageSearchView
          onBack={() => onSearchViewChange?.("hub")}
          onChromeToneChange={onSearchToneChange}
        />
      </Suspense>
    ),
    text: (
      <Suspense fallback={<SearchViewLoader />}>
        <TextSearchView
          onBack={() => onSearchViewChange?.("hub")}
          onChromeToneChange={onSearchToneChange}
        />
      </Suspense>
    ),
  };

  return (
    <div className={`${pageShellClass} relative isolate overflow-x-hidden`}>
      <div className="relative z-10">{views[view] ?? views.hub}</div>
    </div>
  );
}
