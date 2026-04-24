# MEDISCAN AI

<div align="center">
  <img src="frontend/public/Logo-2.svg" alt="Logo MEDISCAN AI" width="120" />

  <h3>Plateforme de recherche multimodale pour images médicales.</h3>

  <p>
    MEDISCAN AI permet de rechercher, comparer et explorer des images médicales à partir d'une image, d'une requête textuelle ou d'une représentation sémantique.
  </p>

  <p>
    <strong>Prototype académique non clinique.</strong><br />
    Ce dépôt sert à expérimenter un système de recherche d'images médicales. Il ne doit pas être utilisé comme dispositif médical ni comme outil de diagnostic.
  </p>

  <p>
    <img alt="Python" src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=06141B" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
    <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
    <img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-Deep_Learning-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
    <img alt="Hugging Face" src="https://img.shields.io/badge/Hugging_Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" />
    <img alt="Kaggle" src="https://img.shields.io/badge/Kaggle-20BEFF?style=for-the-badge&logo=kaggle&logoColor=white" />
    <img alt="FAISS" src="https://img.shields.io/badge/FAISS-Vector_Search-20232A?style=for-the-badge" />
    <img alt="DINOv2" src="https://img.shields.io/badge/DINOv2-Visual_Retrieval-111827?style=for-the-badge" />
    <img alt="BioMedCLIP" src="https://img.shields.io/badge/BioMedCLIP-Semantic_Retrieval-7C3AED?style=for-the-badge" />
    <img alt="ROCOv2" src="https://img.shields.io/badge/ROCOv2-Fine_Tuning-2563EB?style=for-the-badge" />
    <img alt="OpenCLIP" src="https://img.shields.io/badge/OpenCLIP-Multimodal_AI-0F766E?style=for-the-badge" />
  </p>
</div>

## Présentation

MEDISCAN AI est un prototype académique dédié à la recherche d'images médicales. L'application permet d'interroger une base d'images à partir d'une image de référence, d'une requête textuelle ou d'une représentation sémantique.

Le projet étudie l'utilisation de modèles visuels et multimodaux pour explorer une collection d'images médicales. L'application regroupe l'upload, l'affichage des résultats, les filtres, la comparaison, la relance de recherche et la synthèse assistée.

Trois types de recherche sont proposés :

- recherche par image, pour retrouver des images visuellement similaires ;
- recherche sémantique, pour identifier des images médicalement proches ;
- recherche par texte, pour retrouver des images correspondant à une description ou à une intention clinique.

## Démo de l'application

[Voir la vidéo de démonstration sur YouTube](https://youtu.be/sy-FLL0Jk4w)

![Démo de l'application MEDISCAN AI](docs/assets/readme/mediscanai-product-demo.gif)

La vidéo montre un scénario d'utilisation :

- choix du mode de recherche ;
- import d'une image médicale ou saisie d'une requête textuelle ;
- affichage des résultats ;
- exploration et comparaison des images ;
- relance de recherche depuis un ou plusieurs résultats ;
- génération d'une synthèse assistée par IA.

## 1. Fonctionnalités

Cette section décrit ce que l'utilisateur peut faire dans l'interface.

### Vue d'ensemble

MEDISCAN AI propose une interface de recherche d'images médicales pour l'exploration, la comparaison et l'aide à l'interprétation.

L'utilisateur peut :

- téléverser une image médicale et rechercher des images proches ;
- écrire une requête textuelle et obtenir des résultats visuels correspondants ;
- explorer une grille de résultats classés par similarité ;
- ouvrir une vue détaillée pour inspecter une image ;
- sélectionner un ou plusieurs résultats pour relancer une recherche ;
- générer une synthèse assistée par IA à partir des résultats retrouvés.

L'utilisateur ne manipule pas directement les modèles ou les index. L'interface envoie les requêtes au backend, récupère les résultats classés et affiche les métadonnées associées.

### Modes de recherche

MEDISCAN AI combine trois modes de recherche complémentaires.

<table border="1" cellpadding="12" cellspacing="0">
  <tr>
    <td width="33%" valign="top">
      <img alt="Visual Analysis" width="300" height="34" src="docs/assets/readme/badge-visual-analysis.svg" />
      <br /><br />
      <strong>Retrouver ce qui se ressemble visuellement.</strong>
      <br /><br />
      <strong>Entrée :</strong> image médicale
      <br /><br />
      <strong>Résultat :</strong> images proches par apparence
      <br /><br />
      <strong>Idéal pour :</strong> formes, textures, structures, cadrage et similarité visuelle.
    </td>
    <td width="33%" valign="top">
      <img alt="Interpretive Analysis" width="300" height="34" src="docs/assets/readme/badge-interpretive-analysis.svg" />
      <br /><br />
      <strong>Retrouver ce qui a le même sens médical.</strong>
      <br /><br />
      <strong>Entrée :</strong> image médicale
      <br /><br />
      <strong>Résultat :</strong> images médicalement proches
      <br /><br />
      <strong>Idéal pour :</strong> proximité clinique, anatomie, modalité et interprétation sémantique.
    </td>
    <td width="33%" valign="top">
      <img alt="Text Query" width="300" height="34" src="docs/assets/readme/badge-text-query.svg" />
      <br /><br />
      <strong>Passer d'une description à des images.</strong>
      <br /><br />
      <strong>Entrée :</strong> requête textuelle
      <br /><br />
      <strong>Résultat :</strong> images alignées avec le texte
      <br /><br />
      <strong>Idéal pour :</strong> exploration par intention, recherche guidée et formulation clinique.
    </td>
  </tr>
</table>

En pratique, `Visual Analysis` répond à la question "à quoi cette image ressemble ?", `Interpretive Analysis` répond à "quelles images portent le même sens médical ?", et `Text Query` répond à "quelles images correspondent à ma description ?".

### Fonctionnalités principales

<table border="1" cellpadding="14" cellspacing="0">
  <tr>
    <td width="50%" valign="top">
      <img alt="Recherche et exploration" width="300" height="34" src="docs/assets/readme/badge-recherche-exploration.svg" />
      <br /><br />
      <strong>Upload d'image médicale</strong><br />
      L'utilisateur importe une image de référence directement depuis l'interface.
      <br /><br />
      <strong>Recherche visuelle, sémantique et texte-vers-image</strong><br />
      Le même système couvre trois entrées : image, représentation sémantique ou description textuelle.
      <br /><br />
      <strong>Filtres et catégories</strong><br />
      Les résultats peuvent être affinés par score, légende, CUI, présence de CUI, type médical et référence d'image.
    </td>
    <td width="50%" valign="top">
      <img alt="Analyse" width="300" height="34" src="docs/assets/readme/badge-analyse.svg" />
      <br /><br />
      <strong>Grille de résultats</strong><br />
      Les images retrouvées sont classées, paginées et présentées dans une grille claire.
      <br /><br />
      <strong>Vue détaillée</strong><br />
      Chaque image peut être inspectée individuellement avec ses informations utiles.
      <br /><br />
      <strong>Relance depuis un ou plusieurs résultats</strong><br />
      L'utilisateur peut transformer un résultat intéressant en nouvelle recherche plus précise.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img alt="Synthèse assistée" width="300" height="34" src="docs/assets/readme/badge-synthese-assistee.svg" />
      <br /><br />
      <strong>Conclusion assistée par IA</strong><br />
      Une synthèse peut être générée à partir des résultats retrouvés pour aider à résumer les éléments observés.
      <br /><br />
      <strong>Export et partage</strong><br />
      Le parcours prévoit la restitution des résultats pour la comparaison, la revue et la présentation.
    </td>
    <td width="50%" valign="top">
      <img alt="Interface" width="300" height="34" src="docs/assets/readme/badge-experience-produit.svg" />
      <br /><br />
      <strong>Interface bilingue</strong><br />
      L'interface peut être consultée en plusieurs langues.
      <br /><br />
      <strong>Thème clair / sombre</strong><br />
      L'interface s'adapte visuellement au contexte d'usage.
      <br /><br />
      <strong>Parcours d'utilisation</strong><br />
      L'utilisateur reste dans la même interface, de l'upload à l'exploration puis à la synthèse.
    </td>
  </tr>
</table>

### Filtres de résultats

Les filtres agissent sur la liste de résultats déjà retournée par le moteur de recherche. Ils affinent l'affichage sans recalculer les embeddings et sans reconstruire l'index FAISS.

| Filtre | Rôle |
|---|---|
| Score minimum | Masque les résultats dont le score de similarité est sous un seuil choisi. Le score aide à classer les voisins, mais ne correspond pas à une probabilité clinique. |
| Tri par score | Affiche les résultats du plus proche au moins proche, ou l'inverse pour inspecter les résultats les plus faibles encore présents. |
| Légende / caption | Recherche un mot ou une expression dans les descriptions textuelles associées aux images retrouvées. |
| Mots suggérés | Propose des termes fréquents ou utiles dans les captions visibles, par exemple `CT`, `MRI`, `chest`, `fracture` ou `lesion`. |
| Code CUI | Filtre les résultats à partir d'un identifiant UMLS/CUI présent dans les métadonnées. |
| Présence CUI | Garde tous les résultats, seulement ceux avec CUI, ou seulement ceux sans CUI. |
| Type CUI | Restreint les résultats par familles de CUI : modalité, anatomie ou pathologie / finding. |
| Référence image | Retrouve une image précise à partir de son identifiant, par exemple `ROCO_000123`. |

Ces filtres servent surtout après une première recherche large. Par exemple, une requête peut retourner plusieurs examens proches ; l'utilisateur peut ensuite combiner un score minimum, un mot dans la caption et une catégorie CUI d'anatomie pour isoler un sous-ensemble plus précis.

### Parcours utilisateur

1. L'utilisateur choisit un mode de recherche : image, sémantique ou texte.
2. Il fournit une image médicale ou rédige une requête textuelle.
3. MEDISCAN AI calcule une représentation vectorielle et retourne les images les plus proches.
4. L'utilisateur explore les résultats, compare les images et sélectionne les éléments pertinents.
5. Il peut relancer une recherche depuis un résultat, combiner plusieurs images ou générer une synthèse assistée par IA.

Ce parcours permet de passer d'une requête initiale à une liste de résultats filtrée, puis à une nouvelle recherche relancée depuis un ou plusieurs résultats.

### Objectif du projet

MEDISCAN AI documente une implémentation complète d'un moteur de recherche multimodal pour images médicales. Le projet ne se limite pas à produire des embeddings ou à interroger un index vectoriel : il relie les modèles, le backend, les filtres, l'interface et les évaluations.

Le projet couvre quatre aspects :

- exploration rapide de bases d'images médicales ;
- comparaison visuelle et sémantique des résultats ;
- interface utilisateur autour d'un moteur de recherche IA ;
- code exécutable localement avec frontend, backend, index et scripts d'évaluation.

En combinant recherche par image, recherche par texte, modèles multimodaux et interface utilisateur, MEDISCAN AI montre comment organiser un système de retrieval médical de bout en bout.

## 2. Architecture technique

Cette section décrit le fonctionnement interne de MEDISCAN AI : comment une requête utilisateur devient un vecteur, comment FAISS retrouve les plus proches voisins, et pourquoi la branche sémantique repose sur un BioMedCLIP fine-tuné sur ROCOv2.

### Vue d'ensemble

MEDISCAN AI est structuré comme une application complète. Le frontend React gère l'interface, le backend FastAPI valide les requêtes et orchestre les ressources, puis le moteur de retrieval interroge des index FAISS déjà construits.

```text
Utilisateur
  |
  v
Frontend React / Vite
  |
  v
Backend FastAPI
  |
  v
SearchService + ResourceRegistry
  |
  +--> Visual Analysis       -> DINOv2      -> index.faiss
  |
  +--> Interpretive Analysis -> BioMedCLIP  -> index_semantic.faiss
  |
  `--> Text Query            -> BioMedCLIP  -> index_semantic.faiss
```

Le backend charge les ressources de recherche via une registry partagée. Les index FAISS, les métadonnées d'images et les modèles sont donc utilisés de façon cohérente entre les routes API, les scripts CLI et les évaluations.

### Stack technique

| Couche | Technologies | Rôle |
|---|---|---|
| Frontend | React 19, Vite, Tailwind CSS, lucide-react | Interface utilisateur, upload, filtres, résultats, modales et export |
| Backend | FastAPI, Uvicorn, Pydantic | API REST, validation, orchestration des recherches |
| Retrieval | FAISS, NumPy, PyTorch | Recherche vectorielle top-k sur embeddings normalisés |
| Vision | `facebook/dinov2-base` | Embeddings visuels pour la similarité image-to-image |
| Multimodal médical | `hf-hub:Ozantsk/biomedclip-rocov2-finetuned` | Embeddings image et texte dans un espace médical commun |
| Données | ROCOv2, captions, CUI, métadonnées JSON | Base indexée et enrichissement des résultats |
| Évaluation | Scripts Python dédiés, CSV de preuves | Mesure stricte par modalité, anatomie et texte-vers-image |

### Trois chemins de retrieval

Les trois modes partagent la même logique générale, mais pas le même encodeur.

| Mode | Entrée | Encodeur | Index | Objectif |
|---|---|---|---|---|
| Visual Analysis | Image médicale | `dinov2_base` | `artifacts/index.faiss` | Retrouver des images visuellement similaires |
| Interpretive Analysis | Image médicale | `biomedclip` fine-tuné | `artifacts/index_semantic.faiss` | Retrouver des images proches en signification médicale |
| Text Query | Texte médical | `biomedclip` fine-tuné | `artifacts/index_semantic.faiss` | Retrouver des images alignées avec une description |

```text
Visual Analysis
image -> preprocessing DINOv2 -> embedding 768D -> FAISS visual -> résultats

Interpretive Analysis
image -> preprocessing BioMedCLIP -> embedding 512D -> FAISS semantic -> résultats

Text Query
texte -> tokenizer BioMedCLIP -> embedding 512D -> FAISS semantic -> résultats
```

### Fine-tuning BioMedCLIP sur ROCOv2

La branche sémantique utilise un modèle BioMedCLIP fine-tuné sur ROCOv2 :

```text
hf-hub:Ozantsk/biomedclip-rocov2-finetuned
```

Ce modèle est une version de BioMedCLIP adaptée au domaine de MEDISCAN AI. Il conserve l'architecture multimodale image/texte de BioMedCLIP, mais ses poids ont été ajustés avec des couples image-caption issus de ROCOv2 afin de mieux représenter les images médicales du projet.

Il est utilisé pour deux tâches :

- encoder une image médicale en vecteur sémantique ;
- encoder une requête textuelle en vecteur dans le même espace latent.

L'intérêt du fine-tuning est d'adapter BioMedCLIP au vocabulaire, aux captions et aux distributions visuelles du dataset ROCOv2. Un modèle multimodal général peut déjà aligner texte et image, mais le modèle fine-tuné apprend un espace vectoriel plus proche du domaine réellement utilisé ici : radiographies, CT, IRM, échographies, légendes médicales et concepts associés.

Le point critique est la cohérence entre modèle et index. L'index sémantique n'est pas interrogé avec un modèle différent de celui qui l'a construit. Il a été reconstruit avec les embeddings produits par le modèle fine-tuné :

```text
BioMedCLIP fine-tuné ROCOv2
  |
  +--> encode toutes les images du dataset
  |
  +--> construit artifacts/index_semantic.faiss
  |
  +--> sert aussi aux requêtes image et texte en production
```

Cette cohérence évite une erreur classique en retrieval : générer une requête avec un espace d'embedding différent de celui de l'index. Le modèle fine-tuné définit l'espace de comparaison ; les images indexées, les requêtes image et les requêtes texte doivent donc être encodées par ce même modèle pour que les distances FAISS restent interprétables.

### Modèles utilisés

| Modèle | Dimension | Utilisation | Pourquoi |
|---|---:|---|---|
| `facebook/dinov2-base` | 768 | Visual Analysis | Extracteur de caractéristiques visuelles générales, utilisé pour formes, textures et structures |
| `hf-hub:Ozantsk/biomedclip-rocov2-finetuned` | 512 | Interpretive Analysis + Text Query | Espace multimodal médical, aligné image/texte et adapté au dataset ROCOv2 |

DINOv2 et BioMedCLIP ne cherchent pas la même chose. DINOv2 privilégie la proximité visuelle. BioMedCLIP privilégie une proximité plus interprétative : captions, contexte médical, anatomie, modalité et signification clinique.

### Index et artifacts

Les artifacts stables sont stockés dans `artifacts/`. Les manifests indiquent l'encodeur, la dimension, le nombre de vecteurs et le statut de validation.

| Artifact | Mode | Contenu |
|---|---|---|
| `artifacts/index.faiss` | Visual Analysis | Index FAISS visuel DINOv2 |
| `artifacts/ids.json` | Visual Analysis | Métadonnées alignées avec l'index visuel |
| `artifacts/index_semantic.faiss` | Interpretive + Text | Index FAISS BioMedCLIP fine-tuné |
| `artifacts/ids_semantic.json` | Interpretive + Text | Métadonnées alignées avec l'index sémantique |
| `artifacts/manifests/visual_stable.json` | Visual Analysis | Manifest validé : `59,962` vecteurs, dimension `768` |
| `artifacts/manifests/semantic_stable.json` | Interpretive + Text | Manifest validé : `59,962` vecteurs, dimension `512` |

Le manifest sémantique précise que l'index a été reconstruit sur le dataset complet et vérifié avec les embeddings du BioMedCLIP fine-tuné ROCOv2.

### Pipeline de recherche

Le pipeline suit le même contrat côté API et côté scripts :

```text
1. Requête utilisateur
   - image uploadée
   - image_id existant
   - liste d'image_id
   - texte médical

2. Validation backend
   - format image
   - k entre 1 et 50
   - mode visual / semantic
   - texte non vide

3. Encodage
   - DINOv2 pour Visual Analysis
   - BioMedCLIP fine-tuné pour Interpretive Analysis
   - encode_text BioMedCLIP pour Text Query

4. Normalisation
   - vecteurs float32
   - normalisation L2

5. Recherche FAISS
   - top-k voisins
   - exclusion optionnelle de l'image source
   - recherche par centroïde pour plusieurs images

6. Enrichissement
   - caption
   - CUI
   - image_id
   - score de similarité

7. Réponse API
   - résultats classés
   - affichage dans la grille React
```

### API backend

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/health` | `GET` | Vérifie que le backend est disponible |
| `/api/search` | `POST` | Recherche par image uploadée, en mode `visual` ou `semantic` |
| `/api/search-text` | `POST` | Recherche texte-vers-image via BioMedCLIP fine-tuné |
| `/api/search-by-id` | `POST` | Relance une recherche depuis une image déjà indexée |
| `/api/search-by-ids` | `POST` | Relance par centroïde à partir de plusieurs images sélectionnées |
| `/api/generate-conclusion` | `POST` | Génère une synthèse prudente à partir des résultats |
| `/api/contact` | `POST` | Envoie un message de contact si SMTP est configuré |
| `/api/images/{image_id}` | `GET` | Redirige vers l'image ROCOv2 publique |

### Évaluation et preuves

Le projet inclut des CSV de preuve dans `proofs/perf/`. Ils documentent le comportement du retrieval sur des requêtes évaluées.

| Évaluation | Requêtes | Résultat |
|---|---:|---|
| Semantic strict modèle fine-tuné, `k=10` | `9,140` | `TM requêtes 91.29%`, `TA requêtes 90.70%`, `TMO requêtes 88.88%` |
| Semantic strict baseline, `k=10` | `9,140` | `TM requêtes 90.97%`, `TA requêtes 90.40%`, `TMO requêtes 88.58%` |
| Text Query caption, `k=10` | `100` | `Precision@k 77.00%`, `Top-1 hit 100.00%` |
| Text Query keyword, `k=10` | `100` | `Precision@k 39.30%`, `Top-1 hit 86.00%` |

Abréviations utilisées par l'évaluation stricte :

- `TM` : même modalité ;
- `TA` : même anatomie / organe ;
- `TMO` : même modalité et même organe.

Les métriques montrent surtout que le modèle fine-tuné améliore les taux au niveau requête sur les critères stricts, tout en conservant des résultats proches au niveau résultats. Le test texte par caption valide l'alignement image-texte du modèle fine-tuné ; le test keyword est volontairement plus sévère, car il exige une correspondance lexicale explicite.

## 3. Lancer le code en local

Le dépôt peut être lancé localement avec le script `run.sh`. Il vérifie les prérequis, crée l'environnement Python `.venv311` si nécessaire, installe les dépendances frontend avec `npm ci`, démarre le backend FastAPI puis lance le frontend Vite.

Prérequis :

- Python `3.11` ;
- Node.js `>=20.19.0` ou `>=22.12.0` ;
- npm ;
- Git LFS pour récupérer les index FAISS.

Installation puis lancement :

```bash
git lfs install
git lfs pull
cp .env.example .env
./run.sh
```

Sous Windows, le dépôt fournit aussi `run.bat`.

URLs locales :

| Service | URL |
|---|---|
| Frontend | `http://127.0.0.1:5173` |
| Backend | `http://127.0.0.1:8000` |
| Health check | `http://127.0.0.1:8000/api/health` |

La synthèse assistée nécessite une clé Groq optionnelle dans `.env` :

```env
GROQ_KEY_API=your_groq_api_key_here
```

### Commandes développeur

Frontend :

```bash
cd frontend
npm ci
npm run dev
npm run build
npm run lint
```

Backend :

```bash
python3.11 -m venv .venv311
source .venv311/bin/activate
pip install -r requirements.txt
PYTHONPATH=src uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Tests :

```bash
pytest
```

Évaluations :

```bash
PYTHONPATH=src python scripts/evaluation/evaluate_strict.py --mode semantic --k 10 --n-queries 9140 --seed 42
PYTHONPATH=src python scripts/evaluation/evaluate_text.py --mode both --k 10 --n-queries 100 --seed 42
```

## 4. Structure du projet

```text
.
|-- backend/              API FastAPI, routes, services, validation
|-- frontend/             Interface React / Vite
|-- src/mediscan/         Runtime retrieval, embedders, recherche FAISS
|-- artifacts/            Index FAISS, IDs, manifests stables
|-- proofs/perf/          CSV de preuves d'évaluation
|-- scripts/              Build index, query CLI, visualisations, évaluations
|-- tests/                Tests unitaires et API
|-- run.sh                Lanceur macOS / Linux
`-- run.bat               Lanceur Windows
```

## Disclaimer

MEDISCAN AI est un prototype académique non clinique. Il est destiné à l'expérimentation, à la recherche en retrieval et à la conception d'interface. Il ne doit pas être utilisé pour établir un diagnostic, orienter une décision médicale ou remplacer le jugement d'un professionnel de santé.
