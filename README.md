# MediScan AI

> Prototype universitaire de recherche d'images médicales par similarité visuelle et sémantique. Projet non clinique.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22%20LTS-green?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-CPU-orange)
![Groq](https://img.shields.io/badge/LLM-Groq-purple)
![Git LFS](https://img.shields.io/badge/Git%20LFS-required-lightgrey?logo=git)

MediScan AI permet de rechercher des images médicales (radiographies, IRM, scanner…) par **similarité visuelle** (upload d'image ou URL) ou par **requête textuelle sémantique**. Les résultats peuvent être synthétisés par un LLM via Groq.

**Stack** : FastAPI · React 19 + Vite · FAISS (BioMedCLIP + DINOv2) · Groq (llama-3.3-70b) · MongoDB optionnel

---

## README développeur

Ce guide vise un objectif simple :
lancer le backend, le frontend et la fonctionnalité LLM sans friction, en une seule séquence.

---

## Démarrage rapide

### Mac / Linux

```bash
git clone https://github.com/OzanTaskin/mediscan-cbir.git
cd mediscan-cbir
git lfs install
git lfs pull
cp .env.example .env
# renseigner GROQ_KEY_API dans .env si vous voulez la Synthèse / Analyse IA
chmod +x run.sh
./run.sh
```

### Windows

```bat
git clone https://github.com/OzanTaskin/mediscan-cbir.git
cd mediscan-cbir
git lfs install
git lfs pull
copy .env.example .env
rem renseigner GROQ_KEY_API dans .env si vous voulez la Synthèse / Analyse IA
run.bat
```

Une fois lancé :

- Frontend : `http://127.0.0.1:5173`
- Backend : `http://127.0.0.1:8000`
- Health check : `http://127.0.0.1:8000/api/health`

---

## Ce que lance le projet

Le projet se compose de :

- un frontend React + Vite dans `frontend/`
- un backend FastAPI dans `backend/`
- une librairie Python CBIR dans `src/mediscan/`
- des index FAISS versionnés via Git LFS dans `artifacts/`
- une intégration Groq pour la synthèse IA

Les scripts `run.sh` et `run.bat` :

1. vérifient Python et Node
2. créent le venv `.venv311` si besoin
3. installent les dépendances Python
4. installent les dépendances frontend avec `npm ci`
5. démarrent le backend
6. attendent que `/api/health` réponde
7. démarrent le frontend

L’objectif est de permettre un lancement complet en une commande.

---

## Vérification après clone

Après `git lfs pull`, confirmer que les index FAISS sont bien des fichiers binaires réels (et non des pointeurs LFS de 134 bytes) :

```bash
ls -lh artifacts/
# index.faiss et index_semantic.faiss doivent afficher ~100–350 MB
```

Si la taille affichée est ~134 bytes, les fichiers LFS ne sont pas récupérés :

```bash
git lfs pull
```

---

## Prérequis exacts

| Outil | Version attendue | Vérification |
|---|---:|---|
| Python | `3.11.x` | `python3.11 --version` ou `py -3.11 --version` |
| Node.js | `>= 20.19.0` ou `>= 22.12.0` | `node --version` |
| npm | fourni avec Node | `npm --version` |
| Git LFS | requis pour `artifacts/` | `git lfs version` |

Notes :

- Python 3.11 est la version cible du projet
- Python 3.12+ n’est pas la cible recommandée ici
- Node 22 LTS est le choix conseillé
- sans Git LFS, les index FAISS peuvent être absents ou incomplets

---

## Configuration `.env`

Créer le fichier local :

```bash
cp .env.example .env
```

Variables importantes :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `GROQ_KEY_API` | Oui pour la synthèse IA | clé Groq utilisée par l’Analyse / Synthèse IA |
| `MEDISCAN_GROQ_MODEL` | Non | modèle Groq utilisé |
| `MONGO_URI` | Non | enrichissement MongoDB Atlas |
| `BACKEND_PORT` | Non | port FastAPI, défaut `8000` |
| `MEDISCAN_CORS_ORIGINS` | Non | origines frontend autorisées |
| `MEDISCAN_MAX_UPLOAD_BYTES` | Non | taille max des uploads |
| `MEDISCAN_REMOTE_IMAGE_TIMEOUT_SECONDS` | Non | timeout images distantes |
| `MEDISCAN_MAX_CONCLUSION_RESULTS` | Non | nombre de résultats injectés dans la synthèse |
| `MEDISCAN_TORCH_THREADS` | Non | threads CPU PyTorch |

### Exemple minimal pour tout lancer

```env
BACKEND_PORT=8000
MEDISCAN_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
GROQ_KEY_API=your_groq_api_key_here
MEDISCAN_GROQ_MODEL=llama-3.3-70b-versatile
MEDISCAN_MAX_CONCLUSION_RESULTS=6
```

Comportement :

- sans `GROQ_KEY_API`, la recherche fonctionne mais la synthèse IA échouera
- sans `MONGO_URI`, la recherche fonctionne normalement sans enrichissement MongoDB

---

## Ordre recommandé pour un premier setup propre

### 1. Installer Python 3.11

#### Mac

```bash
brew install python@3.11
python3.11 --version
```

Si `python3.11` n’est pas trouvé :

```bash
echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
python3.11 --version
```

#### Windows

Installer Python 3.11 depuis :
`https://www.python.org/downloads/release/python-31119/`

Puis vérifier :

```bat
py -3.11 --version
```

### 2. Installer Node.js 22 LTS

Télécharger depuis :
`https://nodejs.org/`

Puis vérifier :

```bash
node --version
npm --version
```

### 3. Installer Git LFS

#### Mac

```bash
brew install git-lfs
git lfs install
```

#### Windows

```bat
winget install GitHub.GitLFS
git lfs install
```

### 4. Cloner le dépôt et récupérer les index

```bash
git clone https://github.com/OzanTaskin/mediscan-cbir.git
cd mediscan-cbir
git lfs pull
```

### 5. Créer `.env`

```bash
cp .env.example .env
```

Ajouter ensuite `GROQ_KEY_API` si vous voulez la fonctionnalité IA.

### 6. Lancer le projet en une commande

#### Mac / Linux

```bash
./run.sh
```

#### Windows

```bat
run.bat
```

---

## Lancement manuel

Si vous voulez séparer les processus :

### Setup seulement

#### Mac / Linux

```bash
make setup
```

#### Windows

```bat
py -3.11 -m venv .venv311
.venv311\Scripts\python.exe -m pip install --upgrade pip
.venv311\Scripts\python.exe -m pip install -r requirements.txt
cd frontend && npm ci && cd ..
```

### Backend

#### Mac / Linux

```bash
PYTHONPATH=src:. .venv311/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

ou

```bash
make run-backend
```

#### Windows

```bat
set PYTHONPATH=src;.
.venv311\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

ou

```bash
make run-frontend
```

---

## LLM / Synthèse IA

La synthèse IA est générée par **Groq** (inférence ultra-rapide, gratuite en tier Free).
Le modèle par défaut est `llama-3.3-70b-versatile`.

Après chaque recherche, MediScan envoie les descriptions des résultats les plus proches à Groq et reçoit une synthèse clinique prudente en français (3 paragraphes : observations communes, limites, rappel non-clinique).

### Étape 1 — Créer un compte Groq et obtenir une clé API

1. Aller sur `https://console.groq.com`
2. Créer un compte (GitHub, Google ou email)
3. Dans le menu latéral : **API Keys → Create API Key**
4. Donner un nom à la clé (ex. `mediscan-local`)
5. **Copier la clé** (elle ne sera plus affichée après fermeture)

> Le tier gratuit de Groq est suffisant pour utiliser la synthèse en local.
> Aucune carte bancaire n’est requise.

### Étape 2 — Configurer la clé dans `.env`

```bash
cp .env.example .env   # si pas encore fait
```

Puis éditer `.env` et renseigner :

```env
GROQ_KEY_API=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MEDISCAN_GROQ_MODEL=llama-3.3-70b-versatile
MEDISCAN_MAX_CONCLUSION_RESULTS=6
```

Le modèle `llama-3.3-70b-versatile` est recommandé.
Alternatives disponibles sur Groq : `mixtral-8x7b-32768`, `gemma2-9b-it`.

### Étape 3 — Lancer le projet

```bash
./run.sh   # Mac / Linux
run.bat    # Windows
```

### Étape 4 — Vérifier que la synthèse fonctionne

1. Ouvrir `http://127.0.0.1:5173`
2. Aller dans **Image Search**
3. Uploader une image → lancer la recherche
4. En bas des résultats : le bloc **Synthèse IA** doit s’afficher en quelques secondes

Si le bloc affiche une erreur `"La fonctionnalité d’analyse IA n’est pas configurée"` :
→ vérifier que `GROQ_KEY_API` est bien renseigné dans `.env` (pas vide, pas avec guillemets)

Si le bloc affiche `"Service temporairement indisponible"` :
→ le quota Groq est peut-être atteint, ou la clé est invalide

Tester directement l’endpoint :

```bash
curl -s http://127.0.0.1:8000/api/health | python3 -m json.tool
```

Sans clé Groq :

- le site démarre normalement
- la recherche par image et par texte fonctionne
- la Synthèse IA affiche un message d’erreur explicite (comportement attendu)

Endpoint concerné :

- `POST http://127.0.0.1:8000/api/generate-conclusion`

---

## Données, index et ce qui est vraiment nécessaire

### Obligatoire

- `artifacts/`
- les fichiers FAISS récupérés via Git LFS

### Non obligatoire pour démarrer

- `data/`
- MongoDB

Important :

- `data/` n’est pas requis pour utiliser le site en local
- les images sont récupérées via HuggingFace
- MongoDB ne sert qu’à enrichir certains résultats

---

## URLs et endpoints

| Service | URL |
|---|---|
| Frontend | `http://127.0.0.1:5173` |
| Backend | `http://127.0.0.1:8000` |
| Health | `http://127.0.0.1:8000/api/health` |
| Recherche image | `POST /api/search` |
| Recherche texte | `POST /api/search-text` |
| Recherche par ID | `POST /api/search-by-id` |
| Recherche multi-ID | `POST /api/search-by-ids` |
| Synthèse IA | `POST /api/generate-conclusion` |
| Image proxy | `GET /api/images/{id}` |

---

## Dépannage rapide

### Le site ne démarre pas

Vérifier :

```bash
node --version
python3.11 --version
git lfs version
```

### Le backend ne répond pas

```bash
curl http://127.0.0.1:8000/api/health
```

Si échec :

- vérifier que le venv `.venv311` existe
- vérifier que Python 3.11 est bien utilisé
- relancer `./run.sh` ou `run.bat`

### La recherche échoue au premier essai

C’est normal si les modèles sont encore chargés à froid.
La première requête peut être sensiblement plus lente.

### Les index FAISS sont absents

```bash
git lfs pull
ls -lh artifacts/
```

### Erreur Vite / dépendances frontend

```bash
cd frontend
npm ci
```

### Projet déplacé et venv cassé

#### Mac / Linux

```bash
rm -rf .venv311
./run.sh
```

#### Windows

Supprimer `.venv311` puis relancer `run.bat`.

### Port déjà pris

#### Mac / Linux

```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

#### Windows

```bat
netstat -aon | findstr ":8000"
taskkill /F /PID <PID>
```

---

## Tests et commandes utiles

### Tests

#### Mac / Linux

```bash
make test
```

#### Windows

```bat
set PYTHONPATH=src;.
.venv311\Scripts\pytest -q
```

### Commandes utiles

```bash
# Rebuild des index stables
.venv311/bin/python scripts/rebuild_stable_indexes.py

# Requête CLI
.venv311/bin/python scripts/query.py --mode visual --image <IMAGE> --k 10

# Évaluation
.venv311/bin/python scripts/evaluation/evaluate_cui.py --mode visual --k 10 --n-queries 50

# Benchmark
.venv311/bin/python scripts/evaluation/benchmark.py --mode visual --k 10 --n-queries 10
```

---

## Structure rapide du dépôt

```text
mediscan-cbir/
├── run.sh
├── run.bat
├── Makefile
├── backend/
├── frontend/
├── src/mediscan/
├── scripts/
├── artifacts/
├── tests/
└── .env.example
```

---

## Résumé dev

Si vous voulez juste lancer le projet sans surprise :

1. installez Python 3.11
2. installez Node 22 LTS
3. installez Git LFS
4. faites `git lfs pull`
5. créez `.env` depuis `.env.example`
6. ajoutez `GROQ_KEY_API` si vous voulez la Synthèse IA
7. lancez `./run.sh` ou `run.bat`

En pratique, c’est la voie la plus simple et la plus fiable pour démarrer le site, l’API et la partie LLM ensemble.
