# Guide Palette MEDISCAN AI

Ce guide explique comment tester et modifier tres facilement les couleurs principales du site sans casser le design actuel.

Le systeme de palette est centralise ici :

- `frontend/src/theme/palettes.js`
- `frontend/src/context/ThemeContext.jsx`
- `frontend/src/index.css`

Le preset actuel qui reproduit le design de base est `classic`.

## 1. Tester une palette tres vite

Quand le site tourne avec `./run.sh`, ajoute simplement `?palette=...` a l'URL du frontend.

Exemples :

```txt
http://localhost:5173/?palette=classic
http://localhost:5173/?palette=mineral
http://localhost:5173/?palette=slate
```

Si ton URL contient deja des parametres, utilise `&palette=...` au lieu de `?palette=...`.

Ordre de priorite actuel :

1. la palette dans l'URL
2. la palette stockee en local dans `localStorage`
3. la palette par defaut dans le code

## 2. Les presets deja disponibles

Dans `frontend/src/theme/palettes.js`, tu as actuellement :

- `classic`
- `mineral`
- `slate`

Chaque preset contient :

- une version `light`
- une version `dark`

## 3. Les couleurs les plus importantes a modifier

Dans chaque preset, tu peux changer ces tokens :

- `title`
  Effet : titres principaux, gros headings, certains labels importants
- `text`
  Effet : texte principal du site
- `muted`
  Effet : texte secondaire, descriptions, labels faibles
- `visual`
  Effet : mode visuel, boutons/accents bleus, elements primaires
- `visual-light`
  Effet : version plus claire du mode visuel
- `visual-pale`
  Effet : fonds pales relies au mode visuel
- `semantic`
  Effet : mode semantique, accents turquoise/verts
- `semantic-light`
  Effet : version plus claire du mode semantique
- `semantic-pale`
  Effet : fonds pales relies au mode semantique
- `surface`
  Effet : cartes, panneaux, surfaces translucides
- `bg`
  Effet : fond principal
- `bg-soft`
  Effet : fond secondaire / fond doux
- `border`
  Effet : bordures globales
- `footer`
  Effet : fond du footer
- `footer-muted`
  Effet : texte secondaire du footer
- `danger`
  Effet : suppressions / hover rouge
- `on-strong`
  Effet : texte sur boutons ou fonds forts

## 4. Exemple concret : changer tout d'un coup

Si tu veux tester une palette plus chaude ou plus douce, duplique un preset existant dans `frontend/src/theme/palettes.js`.

Exemple :

```js
sunset: {
  label: "Sunset",
  light: {
    title: "#2b2230",
    text: "#342a3a",
    muted: "#7a687f",
    visual: "#c2410c",
    "visual-light": "#ea580c",
    "visual-pale": "#fff1eb",
    semantic: "#0f766e",
    "semantic-light": "#14b8a6",
    "semantic-pale": "#ecfeff",
    surface: "rgba(255, 255, 255, 0.9)",
    bg: "#fff8f5",
    "bg-soft": "#fff1eb",
    border: "#ecd8d2",
    footer: "#20161f",
    "footer-muted": "#b39cab",
    danger: "#dc2626",
    "on-strong": "#ffffff",
  },
  dark: {
    title: "#f3eaf2",
    text: "#eadfea",
    muted: "#bcaec0",
    visual: "#fb923c",
    "visual-light": "#fdba74",
    "visual-pale": "#3b1f17",
    semantic: "#2dd4bf",
    "semantic-light": "#5eead4",
    "semantic-pale": "#0d2b2b",
    surface: "rgba(25, 18, 27, 0.84)",
    bg: "#120d14",
    "bg-soft": "#1b1320",
    border: "#34243a",
    footer: "#09070b",
    "footer-muted": "#9f8ea0",
    danger: "#f87171",
    "on-strong": "#fff8fb",
  },
},
```

Ensuite tu testes avec :

```txt
?palette=sunset
```

## 5. Rendre une palette par defaut

Si tu veux qu'une palette soit chargee automatiquement au demarrage, change cette ligne :

Dans `frontend/src/theme/palettes.js`

```js
export const DEFAULT_PALETTE_ID = "classic";
```

Exemple :

```js
export const DEFAULT_PALETTE_ID = "sunset";
```

## 6. Revenir a zero

Si une palette reste memorisee et que tu veux repartir proprement :

Dans la console navigateur :

```js
localStorage.removeItem("mediscan-palette");
```

Puis recharge la page.

## 7. Ce que le systeme pilote deja tres bien

La palette centralisee pilote deja tres bien :

- couleur des titres
- couleur du texte principal
- couleur des accents visuels
- couleur des accents semantiques
- fonds principaux
- surfaces
- bordures
- footer
- contraste des boutons forts
- couleur de danger

## 8. Limite actuelle importante

Quelques couleurs decoratives tres specifiques de la home restent encore plus "artisanales" dans le CSS avancé, surtout certains grands gradients ou effets de structure.

Donc :

- pour tester rapidement des palettes globales, le systeme actuel est deja tres utile
- pour rendre absolument 100% des nuances de la home elles aussi pilotables depuis la palette, il faudra une deuxieme passe de centralisation

## 9. Workflow conseille

Le plus efficace pour tester :

1. duplique `classic`
2. renomme le preset
3. change seulement `title`, `text`, `visual`, `semantic`
4. teste dans le navigateur avec `?palette=nom-du-preset`
5. ajuste ensuite `bg`, `surface`, `border`
6. puis seulement en dernier `footer`, `danger`, `on-strong`

C'est la facon la plus rapide de comparer plusieurs identites sans perdre le design actuel.
