import { lazy, Suspense } from "react";
import SearchHubView from "./SearchHubView";

const ImageSearchView = lazy(() => import("./ImageSearchView"));
const TextSearchView = lazy(() => import("./TextSearchView"));

// Préchargement immédiat dès que SearchPage est chargé (lui-même préchargé
// depuis App.jsx). Cela garantit que les chunks sont disponibles avant le
// premier clic sur une carte, évitant ainsi le flash blanc du fallback Suspense.
import("./ImageSearchView");
import("./TextSearchView");

function SearchViewLoader() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-16">
      <div className="flex min-h-[45vh] items-center justify-center rounded-2xl border border-border bg-surface/70 px-6 py-12 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary/70" />
          <p className="text-sm text-muted">Chargement de l’interface…</p>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage({
  view = "hub",
  onSearchViewChange,
  onSearchToneChange,
}) {
  const views = {
    hub: (
      <SearchHubView
        onChooseImage={() => onSearchViewChange?.("image")}
        onChooseText={() => onSearchViewChange?.("text")}
        useSharedSurface
      />
    ),
    image: (
      <Suspense fallback={<SearchViewLoader />}>
        <ImageSearchView
          onBack={() => onSearchViewChange?.("hub")}
          onChromeToneChange={onSearchToneChange}
          useSharedSurface
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
    // -mt pulls the wrapper up behind the sticky nav; pt restores the inner space.
    // One shared background surface avoids a visible seam between the top strip
    // and the active search view during transitions.
    <div className="-mt-16 md:-mt-20 pt-16 md:pt-20 relative isolate overflow-x-hidden">
      <div className="relative z-10">{views[view] ?? views.hub}</div>
    </div>
  );
}
