/** 
 * @fileoverview Page de recherche principale avec gestion des vues (hub, image, texte).
 * @module components/SearchPage
 */

import { lazy, Suspense } from "react";
import SearchHubView from "./SearchHubView";
import Spinner from "./Spinner";

// Chargement paresseux pour réduire le bundle initial
const ImageSearchView = lazy(() => import("./ImageSearchView"));
const TextSearchView = lazy(() => import("./TextSearchView"));


/**
 * Fallback affiché pendant le chargement paresseux des vues de recherche.
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
 * Conteneur principal de la page de recherche CBIR.
 * Route entre trois vues : hub, image et texte.
 *
 * @component
 * @param {object} props
 * @param {"hub"|"image"|"text"} [props.view="hub"] - Vue active
 * @param {function(string): void} [props.onSearchViewChange] - Callback de changement de vue
 * @param {function(string): void} [props.onSearchToneChange] - Callback de changement de ton
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
