# MEDISCAN-CBIR — Référence complète développeur

Système CBIR médical académique. Dataset : ROCOv2 (~60 k images radio).
Stack : Python 3.11 · FastAPI :8000 · FAISS · Vite/React :5173.

---

## 1. Commandes essentielles

```bash
# Démarrage
./run.sh                          # backend + frontend ensemble
make run-backend                  # FastAPI :8000 seul
make run-frontend                 # Vite :5173 (Makefile force --port 5173 — vite.config.js dit 3000, ignorer)
make test                         # pytest -q avec PYTHONPATH=src:.

# Règle absolue : toujours PYTHONPATH=src:. et .venv311/bin/python
PYTHONPATH=src:. .venv311/bin/python -m pytest tests/ -v
PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode semantic
PYTHONPATH=src:. .venv311/bin/python scripts/evaluation/evaluate_cui.py --mode visual --k 10

# Recherche textuelle — CLI
PYTHONPATH=src:. .venv311/bin/python scripts/query_text.py --query "chest X-ray pneumonia" --k 5

# Visualisation grille top-k (génère data/test/text_search_<slug>_k<k>.jpg)
PYTHONPATH=src:. .venv311/bin/python scripts/visualization/demo_text_search_grid.py \
    --query "chest X-ray pneumonia" --k 5

# Via API (backend démarré)
curl -s -X POST http://localhost:8000/api/search-text \
  -H "Content-Type: application/json" \
  -d '{"text": "pneumonia chest radiograph", "k": 5}' | python3 -m json.tool
```

---

## 2. Structure du projet

```
mediscan-cbir/
├── src/mediscan/              — librairie core Python
│   ├── search.py              — pipeline retrieval (image + texte)
│   ├── runtime.py             — config centralisée, chemins, FAISS utils
│   ├── dataset.py             — lecture metadata.csv
│   ├── process.py             — configure_cpu_environment()
│   └── embedders/
│       ├── base.py            — ABC Embedder
│       ├── dinov2_base.py     — DINOv2BaseEmbedder (visuel, dim=768)
│       ├── biomedclip.py      — BioMedCLIPEmbedder (sémantique, dim=512) + encode_text()
│       ├── factory.py         — EMBEDDER_REGISTRY + get_embedder()
│       └── utils.py           — normalize_embedding(), configure_torch_cpu_threads()
├── backend/app/
│   ├── main.py                — FastAPI app, lifespan, CORS, router mount
│   ├── config.py              — ALLOWED_CONTENT_TYPES, ALLOWED_MODES, MAX_K
│   ├── api/routes.py          — 4 endpoints HTTP
│   ├── services/search_service.py — SearchService, SearchUnavailableError
│   └── models/schema.py       — SearchResult, SearchResponse, TextSearchResponse
├── frontend/src/              — React 18 + Vite + Tailwind v4
│   ├── App.jsx                — routing SPA (7 pages par state)
│   ├── api.js                 — searchImage(), imageUrl()
│   ├── components/            — SearchPage, ResultsGrid, UploadZone, Controls, Navigation, pages…
│   ├── context/               — LangContext.jsx + lang-context.js, ThemeContext.jsx + theme-context.js
│   └── i18n/en.js, fr.js      — traductions (keys: nav, home, search, features, contact, about, howItWorks, faq)
├── scripts/
│   ├── build_index.py         — construit index FAISS depuis metadata.csv
│   ├── query.py               — CLI image-to-image one-shot
│   ├── query_text.py          — CLI text-to-image one-shot
│   ├── rebuild_stable_indexes.py
│   ├── evaluation/evaluate_cui.py, evaluate_typed.py, benchmark.py
│   └── visualization/
│       ├── demo_dual_mode_grid.py   — grille visuel+sémantique image query
│       └── demo_text_search_grid.py — grille top-k text query → data/test/
├── artifacts/                 — index FAISS + ids JSON (Git LFS)
├── data/roco_train_full/      — images/ + metadata.csv
├── tests/                     — pytest, un fichier par module
│   ├── test_text_search_unit.py     — 15 tests text search (sans httpx)
│   ├── test_text_search.py          — tests endpoint HTTP (nécessite httpx)
│   └── test_backend_api.py, test_search.py, …
└── .venv311/                  — venv Python 3.11
```

---

## 3. API endpoints

| Endpoint | Méthode | Input | Retour | Codes |
|---|---|---|---|---|
| `/api/health` | GET | — | `{"status": "ok"}` | 200 |
| `/api/search` | POST multipart | `image` (file), `mode` (str, défaut `"visual"`), `k` (int, défaut 5) | `SearchResponse` | 200/400/500/503 |
| `/api/search-text` | POST JSON | `{"text": str, "k": int}` | `TextSearchResponse` | 200/400/503 |
| `/api/images/{image_id}` | GET | path param | `FileResponse` PNG/JPG | 200/400/404 |

`/api/search-text` force toujours `mode="semantic"` (BioMedCLIP). Anglais uniquement. Max 500 chars.
`/api/images/{image_id}` : cherche dans `data/roco_train_full/images/{id}.{png,jpg,jpeg}`. Sanitize : `[a-zA-Z0-9_-]` seulement.

---

## 4. Schémas de données complets

```python
# backend/app/models/schema.py
class SearchResult(BaseModel):
    rank: int; image_id: str; score: float; path: str; caption: str; cui: str

class SearchResponse(BaseModel):       # image-to-image
    mode: str; embedder: str; query_image: str; results: list[SearchResult]

class TextSearchResponse(BaseModel):   # text-to-image
    mode: str; embedder: str; query_text: str; results: list[SearchResult]

# backend/app/api/routes.py
class TextSearchRequest(BaseModel):
    text: str; k: int = 5

# src/mediscan/search.py
@dataclass
class SearchResources:
    embedder: Embedder
    index: faiss.Index
    rows: list[dict[str, str]]   # [{image_id, path, caption, cui}, ...]

# src/mediscan/runtime.py
@dataclass(frozen=True)
class ModeConfig:
    mode: str; embedder: str; index_path: Path; ids_path: Path; manifest_path: Path

# src/mediscan/dataset.py
@dataclass(frozen=True)
class MetadataRecord:
    image_id: str; path: str; caption: str; cui: str
    def to_dict(self) -> dict[str, str]: ...
```

---

## 5. Pipeline image-to-image (flux complet)

```
POST /api/search (multipart)
  routes.py:search_image()
    → SearchService.search(image_bytes, filename, content_type, mode, k)
        _normalize_mode()          # lowercase + check ALLOWED_MODES
        _validate_k()              # 0 < k <= 50
        _validate_content_type()   # {"image/jpeg", "image/png"}
        _validate_image_bytes()    # non vide
        NamedTemporaryFile → écrit bytes → _verify_image() (PIL.open.verify())
        _get_resources(mode)       # double-check locking + cache dict[str, SearchResources]
          → load_resources(mode=mode)   [search.py:36-68]
              default_config_for_mode() → (embedder_name, index_path, ids_path)
              ensure_artifacts_exist()  → vérifie que les 2 fichiers existent
              load_indexed_rows()       → list[dict] depuis ids*.json
              faiss.read_index()        → faiss.Index
              build_embedder(name)      → Embedder instance
              vérifie embedder.dim == index.d
              → SearchResources(embedder, index, rows)
        query(resources, temp_path, k)   [search.py:71-125]
          PIL.open(image) → embedder.encode_pil(pil) → np.ndarray(dim,) float32 L2-norm
          faiss.normalize_L2(query_vec)
          compute_search_k(k, ntotal)
          index.search(vec, search_k) → (scores, indices)
          rows[idx] → {rank, score, image_id, path, caption, cui}
      → {"mode", "embedder", "query_image", "results": list[dict]}
    SearchResponse(**payload)   ← Pydantic validation
```

**Scores** : cosine similarity (IndexFlatIP + vecteurs L2-norm). Range [0, 1].
**Lazy load** : premier appel par mode lent (~10-30s pour charger le modèle HF). Ensuite cache.

---

## 6. Pipeline text-to-image (flux complet)

```
POST /api/search-text (JSON body)
  routes.py:search_text(TextSearchRequest)
    → SearchService.search_text(text, k)
        text.strip(), vérif non vide, len <= 500
        _validate_k()
        _get_resources("semantic")   # force semantic, même mécanique lazy
        query_text(resources, text, k)   [search.py:128-175]
          resources.embedder.encode_text(text)   [biomedclip.py:58-68]
            tokenizer([text]) → tokens tensor (1, 77), troncature auto
            model.encode_text(tokens) → features tensor
            normalize_embedding(features.squeeze(0).float().cpu().numpy(), 512)
            → np.ndarray(512,) float32 L2-norm
          faiss.normalize_L2(query_vec)
          compute_search_k(k, ntotal)
          index.search(vec, search_k) → (scores, indices)
          rows[idx] → {rank, score, image_id, path, caption, cui}
      → {"mode": "semantic", "embedder": "biomedclip", "query_text", "results"}
    TextSearchResponse(**payload)
```

**Même index FAISS** que le mode sémantique image — aucun rebuild nécessaire.
BioMedCLIP aligne image ET texte dans le même espace 512-dim (CLIP contrastif entraîné sur PubMed).

---

## 7. Signatures — toutes les fonctions clés

```python
# ── src/mediscan/search.py ──────────────────────────────────────────────────

MAX_K = 50

def load_resources(
    *, mode: str,
    embedder: str | None = None,       # override nom embedder
    model_name: str | None = None,     # override nom modèle HF
    index_path: str | Path | None = None,
    ids_path: str | Path | None = None,
) -> SearchResources: ...

def query(
    *, resources: SearchResources,
    image: str | Path,                 # chemin image (temporaire ou disque)
    k: int,
    exclude_self: bool = False,        # filtre résultat identique (évaluation)
) -> list[dict]: ...                   # [{rank, score, image_id, path, caption, cui}]

def query_text(
    *, resources: SearchResources,
    text: str,                         # requête médicale anglais, max 77 tokens
    k: int,
) -> list[dict]: ...                   # même format que query()

def search_image(
    *, mode: str, image: str | Path, k: int,
    embedder: str | None = None, model_name: str | None = None,
    index_path: str | Path | None = None, ids_path: str | Path | None = None,
    exclude_self: bool = False,
) -> tuple[str, str, list[dict]]: ...  # (embedder_name, resolved_img_path, results)

# ── src/mediscan/runtime.py ─────────────────────────────────────────────────

PROJECT_ROOT: Path                     # racine repo (parents[2] de runtime.py)

STABLE_MODE_CONFIGS = {
    "visual":   ModeConfig(mode="visual",   embedder="dinov2_base",
                           index_path=.../artifacts/index.faiss,
                           ids_path=.../artifacts/ids.json, ...),
    "semantic": ModeConfig(mode="semantic", embedder="biomedclip",
                           index_path=.../artifacts/index_semantic.faiss,
                           ids_path=.../artifacts/ids_semantic.json, ...),
}
SUPPORTED_MODES = frozenset({"visual", "semantic"})

def resolve_path(raw_path: str | Path, base_dir: Path | None = None) -> Path: ...
    # absolu → retourné tel quel ; relatif → PROJECT_ROOT / path
def get_mode_config(mode: str) -> ModeConfig: ...     # ValueError si inconnu
def default_config_for_mode(mode: str) -> tuple[str, Path, Path]: ...  # (embedder, index, ids)
def build_embedder(name: str, model_name: str | None = None) -> Embedder: ...
def load_indexed_rows(ids_path: str | Path) -> list[dict[str, str]]: ...
def ensure_artifacts_exist(index_path, ids_path) -> tuple[Path, Path]: ...
def compute_search_k(k: int, ntotal: int, *, exclude_self: bool = False) -> int: ...
    # → min(ntotal, k + (1 if exclude_self else 0))
def set_faiss_threads(faiss_module, count: int = 1) -> None: ...

# ── src/mediscan/embedders/base.py ──────────────────────────────────────────

class Embedder(ABC):
    name: str   # clé dans EMBEDDER_REGISTRY
    dim: int    # dimension sortie
    @abstractmethod
    def encode_pil(self, image: PIL.Image.Image) -> np.ndarray: ...
    # Contrat strict : shape (dim,), dtype float32, L2-normalisé

# ── src/mediscan/embedders/biomedclip.py ────────────────────────────────────

class BioMedCLIPEmbedder(Embedder):
    name = "biomedclip"; dim = 512  # dim override depuis model.visual.output_dim
    # __init__ charge : model, preprocess, tokenizer via open_clip
    def encode_pil(self, image: PIL.Image.Image) -> np.ndarray: ...
    def encode_text(self, text: str) -> np.ndarray: ...
    # tokenizer([text]) → tokens(1,77) → model.encode_text() → normalize → (512,) float32

# ── src/mediscan/embedders/factory.py ───────────────────────────────────────

EMBEDDER_REGISTRY = {"dinov2_base": DINOv2BaseEmbedder, "biomedclip": BioMedCLIPEmbedder}
def get_embedder(name: str, **kwargs) -> Embedder: ...

# ── src/mediscan/embedders/utils.py ─────────────────────────────────────────

def normalize_embedding(vector: np.ndarray, dim: int) -> np.ndarray: ...
    # Valide shape (dim,) + float32, applique v /= ||v||_2
def configure_torch_cpu_threads(env_var="MEDISCAN_TORCH_THREADS", default=1): ...

# ── src/mediscan/dataset.py ──────────────────────────────────────────────────

class RocoDataset:
    def __init__(self, metadata_csv: str | Path = "data/roco_train_full/metadata.csv"): ...
    def __len__(self) -> int: ...
    def __iter__(self) -> Iterator[MetadataRecord]: ...
    @property
    def records(self) -> list[MetadataRecord]: ...

# ── backend/app/services/search_service.py ──────────────────────────────────

class SearchUnavailableError(RuntimeError): ...   # → HTTP 503

class SearchService:
    def __init__(self, resources: dict[str, SearchResources]) -> None: ...
    # _resources: dict[mode → SearchResources], _resources_lock: threading.Lock

    def search(
        *, image_bytes: bytes, filename: str, content_type: str | None,
        mode: str = "visual", k: int = 5,
    ) -> dict: ...   # {mode, embedder, query_image, results: list[dict]}

    def search_text(*, text: str, k: int) -> dict: ...
    # {mode: "semantic", embedder: "biomedclip", query_text, results}

    # Méthodes privées utiles à connaître :
    # _normalize_mode(mode) → str lowercase, vérifie ALLOWED_MODES
    # _validate_k(k)        → ValueError si k hors [1, MAX_K]
    # _get_resources(mode)  → SearchResources (double-check locking + lazy load)
```

---

## 8. Embedders — tableau de référence

| Classe | `name` | `dim` | Modèle HF | encode_text ? |
|---|---|---|---|---|
| `DINOv2BaseEmbedder` | `"dinov2_base"` | 768 | `facebook/dinov2-base` | Non |
| `BioMedCLIPEmbedder` | `"biomedclip"` | 512 | `hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224` | **Oui** |

---

## 9. Artifacts FAISS

```
artifacts/
├── index.faiss              — visuel DINOv2 (IndexFlatIP, dim=768, ~60k vecteurs)
├── ids.json                 — liste JSON [{image_id, path, caption, cui}, ...] alignée
├── index_semantic.faiss     — sémantique BioMedCLIP (IndexFlatIP, dim=512)
├── ids_semantic.json        — même format, aligné sur index_semantic.faiss
└── manifests/visual_stable.json, semantic_stable.json
```

Versionnés Git LFS. Absents → `FileNotFoundError` dans `ensure_artifacts_exist()` → `SearchUnavailableError` → HTTP 503.

Rebuild :
```bash
PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode visual
PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode semantic
# ou les deux :
PYTHONPATH=src:. .venv311/bin/python scripts/rebuild_stable_indexes.py
```

---

## 10. Tests

```bash
PYTHONPATH=src:. .venv311/bin/python -m pytest tests/ -v
PYTHONPATH=src:. .venv311/bin/python -m pytest tests/test_text_search_unit.py -v   # 15 tests, rapide
```

**Note `httpx`** : `test_backend_api.py` et `test_text_search.py` nécessitent `httpx` (absent du venv).
`pip install httpx` puis relancer pour les tests endpoint HTTP.

**Pattern mock** (cf. `test_search.py`, `test_text_search_unit.py`) :
```python
class FakeEmbedder:
    name = "biomedclip"; dim = 512
    def encode_pil(self, img): return np.ones((512,), dtype=np.float32)
    def encode_text(self, text): v = np.ones((512,), dtype=np.float32); return v / np.linalg.norm(v)

class FakeIndex:
    ntotal = 3; d = 512
    def search(self, vec, k): return np.array([[0.9, 0.8]]), np.array([[0, 1]])

resources = SearchResources(embedder=FakeEmbedder(), index=FakeIndex(), rows=[...])
```

**Fichiers de test existants :**
- `test_text_search_unit.py` — 15 tests : encode_text(), query_text(), SearchService.search_text()
- `test_text_search.py` — tests endpoint POST /api/search-text (nécessite httpx)
- `test_backend_api.py` — tests endpoints image search (nécessite httpx)
- `test_search.py` — tests pipeline image retrieval core
- `test_runtime.py`, `test_factory.py`, `test_build_index.py`, `test_biomedclip.py`, `test_dinov2_base.py`

---

## 11. Scripts de référence

| Script | Usage |
|---|---|
| `scripts/build_index.py` | `--mode visual\|semantic [--checkpoint]` |
| `scripts/query.py` | `--image path --mode visual --k 5` (image-to-image CLI) |
| `scripts/query_text.py` | `--query "text" --k 5` (text-to-image CLI) |
| `scripts/rebuild_stable_indexes.py` | rebuild visual + semantic en une commande |
| `scripts/evaluation/evaluate_cui.py` | `--mode visual\|semantic --k 10 --n-queries N` |
| `scripts/evaluation/evaluate_typed.py` | évaluation par type d'image |
| `scripts/evaluation/benchmark.py` | benchmark performance |
| `scripts/visualization/demo_dual_mode_grid.py` | grille image query visuel+sémantique |
| `scripts/visualization/demo_text_search_grid.py` | `--query "text" --k 5` → `data/test/*.jpg` |

Résultats d'évaluation → `proofs/perf/`

---

## 12. Recettes d'extension

### A. Ajouter un embedder

1. Créer `src/mediscan/embedders/mon_embedder.py` :
```python
from .base import Embedder
from .utils import normalize_embedding
import numpy as np
from PIL import Image

class MonEmbedder(Embedder):
    name = "mon_nom"
    dim = 256

    def __init__(self, model_name: str = "org/model"):
        ...  # charger modèle

    def encode_pil(self, image: Image.Image) -> np.ndarray:
        ...  # traitement
        return normalize_embedding(vec, self.dim)   # OBLIGATOIRE
```

2. Enregistrer dans `src/mediscan/embedders/factory.py` :
```python
EMBEDDER_REGISTRY = {
    "dinov2_base": DINOv2BaseEmbedder,
    "biomedclip":  BioMedCLIPEmbedder,
    "mon_nom":     MonEmbedder,          # ← ici
}
```

3. Ajouter le mode dans `src/mediscan/runtime.py` :
```python
STABLE_MODE_CONFIGS = {
    ...,
    "mon_mode": ModeConfig(
        mode="mon_mode", embedder="mon_nom",
        index_path=PROJECT_ROOT / "artifacts" / "index_mon_mode.faiss",
        ids_path=PROJECT_ROOT / "artifacts" / "ids_mon_mode.json",
        manifest_path=PROJECT_ROOT / "artifacts" / "manifests" / "mon_mode_stable.json",
    ),
}
```

4. Builder l'index :
```bash
PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode mon_mode
```

---

### B. Ajouter un endpoint API

1. `backend/app/models/schema.py` — ajouter modèle Pydantic si nouveau schéma.
2. `backend/app/api/routes.py` — ajouter endpoint :
```python
@router.post("/mon-endpoint", response_model=MonResponse)
async def mon_endpoint(body: MonRequest, request: Request) -> MonResponse:
    service = _get_service(request)
    try:
        ...
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
```
3. Logique complexe → méthode dans `backend/app/services/search_service.py`.
4. Router monté avec prefix `/api` dans `main.py` → endpoint final = `/api/mon-endpoint`.

---

### C. Modifier le pipeline de recherche

**Re-ranking** : modifier `query()` dans `search.py` après `index.search()`, avant construction des résultats (ligne ~101).

**Filtre metadata** : filtrer `rows` avant ou après FAISS dans `query()` ou `query_text()`.

**Mode hybride** (visual + semantic) :
- Créer fonction dans `search.py` qui appelle `query()` deux fois + fusionne scores
- Gérer comme cas spécial dans `SearchService` (ne pas ajouter dans STABLE_MODE_CONFIGS)

**Ajouter encode_text à un embedder** : implémenter `encode_text(self, text: str) -> np.ndarray` avec les mêmes contraintes que `encode_pil` (float32, (dim,), L2-norm). Utiliser `normalize_embedding()` de `utils.py`.

---

### D. Ajouter une page frontend

1. Créer `frontend/src/components/MaPage.jsx` :
```jsx
import { useContext } from "react"
import { LangContext } from "../context/lang-context.js"   // objet context ici
import { ThemeContext } from "../context/theme-context.js"

export default function MaPage({ onPageChange }) {
  const { t } = useContext(LangContext)
  const { theme } = useContext(ThemeContext)
  return <div className="bg-bg text-text">...</div>
}
```
2. `frontend/src/App.jsx` — ajouter dans le registry `pages` :
```js
const pages = { ..., mapage: MaPage }
```
3. `frontend/src/i18n/en.js` et `fr.js` — ajouter la section i18n.

---

## 13. Frontend — classes CSS et patterns

### Classes Tailwind custom (définies dans `index.css` — utiliser uniquement celles-ci)
```
bg-primary      bg-primary-light   bg-primary-pale
bg-accent       bg-accent-light    bg-accent-pale
bg-surface      bg-bg              bg-bg-soft
text-text       text-muted
border-border
bg-footer       text-footer-muted
```

### Thème (persisté localStorage("theme"))
```js
const { theme, setTheme } = useContext(ThemeContext)   // "light" | "dark"
// → document.documentElement.dataset.theme → CSS [data-theme="dark"]
```

### i18n (persisté localStorage("lang"))
```js
const { t, lang, setLanguage, langVisible } = useContext(LangContext)
// t.search.headline, t.nav.home, etc.
// langVisible : boolean pour animation fondu lors changement de langue
```

### API client (`frontend/src/api.js`)
```js
const API_BASE = "http://127.0.0.1:8000/api"
async function searchImage(file, mode, k)  // POST multipart → SearchResponse JSON
function imageUrl(imageId)                  // → string URL GET /api/images/{id}
```

### Navigation entre pages
```jsx
export default function MaPage({ onPageChange }) {
  return <button onClick={() => onPageChange("search")}>...</button>
}
```

---

## 14. Pièges connus

| Piège | Solution |
|---|---|
| `import mediscan` échoue | Toujours `PYTHONPATH=src:.` |
| Mauvais python | `.venv311/bin/python`, jamais `python3` |
| Port frontend | Makefile force 5173 même si vite.config.js dit 3000 |
| `encode_pil` / `encode_text` contrat | float32 + shape (dim,) + L2-norm OBLIGATOIRE — utiliser `normalize_embedding()` |
| Dim mismatch | `load_resources()` vérifie `embedder.dim == index.d`, échoue sinon |
| `text query` sur mode visual | `query_text()` lève ValueError si l'embedder n'a pas `encode_text()` |
| `httpx` absent | `test_backend_api.py` et `test_text_search.py` nécessitent `pip install httpx` |
| image_id sécurité | `_sanitize_image_id()` : `[a-zA-Z0-9_-]` seulement, pas de `..` ni `/` |
| `LangContext` import | importer depuis `lang-context.js`, pas `LangContext.jsx` (idem ThemeContext) |
| `SearchResponse.results` frontend | déstructurer avec `Array.isArray(r) ? r : r.results` (SearchPage.jsx) |
| FAISS absent | → FileNotFoundError → SearchUnavailableError → HTTP 503 |
| Requête texte française | BioMedCLIP entraîné anglais uniquement — scores dégradés en FR |
