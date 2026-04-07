# MEDISCAN AI — Guide de démarrage

Prototype universitaire de recherche d'images médicales par le contenu (CBIR).
Développé à Paris Cité. **Non-clinique.**

---

## Prérequis

| Outil      | Version requise                     | Vérification                  |
|------------|-------------------------------------|-------------------------------|
| Python     | **3.11.x exactement**               | `python3.11 --version`        |
| Node.js    | **≥ 20.19.0 ou ≥ 22.12.0** (22 LTS recommandé) | `node --version`  |
| Git LFS    | n'importe laquelle                  | `git lfs version`             |

> ⚠️ **Python 3.12+ non garanti** (certains packages ML n'ont pas de wheel précompilée).
> ⚠️ **Python 3.14 ne fonctionne pas.**
> ⚠️ **Node.js < 20.19 ne fonctionne pas** — Vite 8 l'exige.

---

## 1. Installer Python 3.11

### Mac
```bash
brew install python@3.11

# Si python3.11 n'est pas trouvé après installation :
echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

python3.11 --version   # doit afficher 3.11.x
```

Ou télécharger l'installeur : https://www.python.org/downloads/release/python-31119/

### Windows
Télécharger l'installeur 3.11 : https://www.python.org/downloads/release/python-31119/
> ✅ Cocher **"Add Python to PATH"** lors de l'installation.

Vérifier après installation (deux méthodes) :
```
py -3.11 --version     # via Python Launcher (recommandé Windows)
python --version       # doit afficher 3.11.x
```

---

## 2. Installer Node.js 22 LTS

### Mac
```bash
brew install node@22
node --version   # doit afficher v22.x.x
```

Ou : https://nodejs.org/ → choisir **22 LTS**

### Windows
Télécharger l'installeur **22 LTS** : https://nodejs.org/

Vérifier :
```
node --version   # doit afficher v22.x.x
npm --version
```

---

## 3. Installer Git LFS

### Mac
```bash
brew install git-lfs
git lfs install
```

### Windows
```
winget install GitHub.GitLFS
git lfs install
```

Ou télécharger : https://git-lfs.com/

---

## 4. Cloner et lancer

### Mac / Linux

```bash
git clone https://github.com/OzanTaskin/mediscan-cbir.git
cd mediscan-cbir
git lfs pull                  # télécharge les index FAISS (~300 Mo)
cp .env.example .env          # crée le fichier de config local
# → édite .env et renseigne MONGO_URI si tu veux l'enrichissement MongoDB (optionnel)
chmod +x run.sh
./run.sh                      # installe tout et lance le projet
```

### Windows

```bat
git clone https://github.com/OzanTaskin/mediscan-cbir.git
cd mediscan-cbir
git lfs pull
copy .env.example .env
rem → édite .env si besoin
run.bat
```

Ouvrir ensuite : **http://127.0.0.1:5173**

---

## Configuration `.env`

Le fichier `.env` n'est **jamais commité** (dans `.gitignore`). Chaque développeur crée le sien depuis le template :

```bash
cp .env.example .env
```

| Variable               | Obligatoire | Description |
|------------------------|-------------|-------------|
| `GROQ_KEY_API`         | **Oui**     | Clé API Groq pour la fonctionnalité "Analyse IA". Créer une clé sur [console.groq.com](https://console.groq.com) → API Keys. Sans cette clé, le bouton "Analyse IA" retournera une erreur mais le reste du site fonctionne normalement. |
| `MONGO_URI`            | Non         | URI MongoDB Atlas pour l'enrichissement des métadonnées. Si absent, la recherche fonctionne normalement sans enrichissement. |
| `BACKEND_PORT`         | Non         | Port FastAPI (défaut : 8000) |

**Sans `GROQ_KEY_API`** : la recherche visuelle et textuelle fonctionnent normalement. Seul le bouton "Analyse IA" sera non fonctionnel.

**Sans `MONGO_URI`** : le site fonctionne complètement — les résultats viennent des index FAISS locaux et les images sont chargées depuis HuggingFace. MongoDB ajoute uniquement des métadonnées supplémentaires (captions enrichies, codes CUI UMLS).

**Si MongoDB est configuré mais inaccessible** (réseau, IP non whitelistée sur Atlas) : la recherche continue sans enrichissement, aucune erreur n'est retournée.

---

## Ce que font `run.sh` / `run.bat`

1. Vérifie Python 3.11 et Node.js (version exacte)
2. Vérifie Git LFS (avertissement si absent)
3. Crée le virtualenv `.venv311` si absent
4. Installe les dépendances Python (`requirements.txt`)
5. Installe les dépendances frontend (`npm ci` — reproductible via lockfile)
6. Démarre le backend FastAPI sur `http://127.0.0.1:8000`
7. Attend que le health check réponde
8. Démarre le frontend Vite sur `http://127.0.0.1:5173`

---

## URLs

| Service               | URL                                                        |
|-----------------------|------------------------------------------------------------|
| Frontend              | http://127.0.0.1:5173                                      |
| Backend health        | http://127.0.0.1:8000/api/health                           |
| Recherche par image   | `POST` http://127.0.0.1:8000/api/search                    |
| Recherche par texte   | `POST` http://127.0.0.1:8000/api/search-text               |
| Recherche par ID      | `POST` http://127.0.0.1:8000/api/search-by-id              |
| Recherche multi-IDs   | `POST` http://127.0.0.1:8000/api/search-by-ids             |
| Analyse IA (Groq)     | `POST` http://127.0.0.1:8000/api/generate-conclusion       |
| Image (redirect HF)   | `GET`  http://127.0.0.1:8000/api/images/{id}               |

---

## Lancement manuel (deux terminaux séparés)

**Terminal 1 — Backend :**
```bash
# Mac/Linux
make run-backend

# Windows
set PYTHONPATH=src;.
.venv311\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend :**
```bash
make run-frontend
# ou :
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

---

## Setup seul (sans lancement)

```bash
# Mac/Linux
make setup

# Windows
py -3.11 -m venv .venv311
.venv311\Scripts\python.exe -m pip install --upgrade pip
.venv311\Scripts\python.exe -m pip install -r requirements.txt
cd frontend && npm ci && cd ..
```

---

## Résolution de problèmes fréquents

### "Failed to resolve import jspdf" ou page blanche Vite
```bash
cd frontend && npm ci
```
Toujours utiliser `npm ci` (pas `npm install`) pour rester aligné avec le lockfile.

### "load failed" au scan
1. Vérifier que le backend tourne : `curl http://127.0.0.1:8000/api/health`
2. Si absent : relancer avec `.venv311` (Python 3.11 obligatoire)
3. Vérifier que `artifacts/` contient les fichiers `.faiss` :
   ```bash
   ls -lh artifacts/   # index.faiss et index_semantic.faiss doivent faire ~100-200 Mo
   git lfs pull        # si les fichiers sont vides / manquants
   ```
4. La première recherche peut prendre ~30s (chargement lazy du modèle)

### Node.js trop ancien (`The engine "node" is incompatible`)
Installer Node 22 LTS : https://nodejs.org/

### Python introuvable sur Mac après brew
```bash
echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### J'ai déplacé/renommé le dossier du projet et `./run.sh` ne marche plus
Les virtualenv Python contiennent parfois des chemins absolus. Si le projet a été déplacé, l'ancien `.venv311` peut être cassé.

```bash
rm -rf .venv311
./run.sh
```

Ou relancer le backend via le Python du venv :

```bash
PYTHONPATH=src:. .venv311/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Port déjà utilisé
```bash
# Mac/Linux
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -aon | findstr ":8000"
taskkill /F /PID <PID>
```

### Windows : erreur à la création du venv
S'assurer que le Python Launcher fonctionne :
```
py -3.11 --version
py -3.11 -m venv .venv311
```

---

## Notes importantes

- **`data/` non requis** : les images sont servies depuis HuggingFace (`Mediscan-Team/mediscan-data`). Tu n'as pas besoin de télécharger le dataset localement.
- **`artifacts/` obligatoire** : les index FAISS sont requis pour la recherche. Ils sont versionnés via Git LFS (~300 Mo) — `git lfs pull` les télécharge automatiquement.
- **Le backend lazy-charge les modèles** au premier appel — la toute première recherche prend ~30s.
- **CPU uniquement**, pas de GPU nécessaire.
- **Architecture** : testé sur macOS ARM64 (Apple Silicon) et x86_64.
- **MongoDB optionnel** : sans `MONGO_URI`, la recherche fonctionne normalement. Même si `MONGO_URI` est défini mais que la connexion échoue (timeout, IP non whitelistée), la recherche continue sans enrichissement.

---

## Tests

```bash
# Mac/Linux
make test

# Windows
set PYTHONPATH=src;.
.venv311\Scripts\pytest -q
```

---

## Commandes utiles (dev)

```bash
# Rebuild les index FAISS stables
.venv311/bin/python scripts/rebuild_stable_indexes.py

# Requête CLI
.venv311/bin/python scripts/query.py --mode visual --image data/roco_small/images/<IMAGE>.png --k 10

# Évaluation qualité CUI
.venv311/bin/python scripts/evaluation/evaluate_cui.py --mode visual --k 10 --n-queries 50

# Benchmark performance
.venv311/bin/python scripts/evaluation/benchmark.py --mode visual --k 10 --n-queries 10
```

---

## Versions de référence

| Composant  | Version retenue          | Notes                              |
|------------|--------------------------|------------------------------------|
| Python     | **3.11.x**               | Obligatoire                        |
| Node.js    | **22 LTS** (≥20.19 min)  | Requis par Vite 8                  |
| npm        | **≥ 10**                 | Fourni avec Node 22                |
| React      | 19                       |                                    |
| Vite       | 8                        | Requiert Node ≥20.19 ou ≥22.12     |
| FastAPI    | ≥0.115                   |                                    |
| PyTorch    | ≥2.2 (CPU)               | Pas de GPU nécessaire              |
| FAISS      | faiss-cpu ≥1.8           |                                    |

---

## Structure du dépôt

```
mediscan-cbir/
├── run.sh / run.bat          ← lancement en une commande (Mac/Linux ou Windows)
├── Makefile                  ← commandes dev (Mac/Linux)
├── requirements.txt          ← dépendances Python
├── .python-version           ← Python 3.11 (pyenv/asdf)
├── .nvmrc                    ← Node 22 (nvm)
├── src/mediscan/             ← bibliothèque CBIR centrale
├── backend/                  ← API FastAPI
├── frontend/                 ← application React/Vite
├── scripts/                  ← CLI, évaluation, rebuild index
├── artifacts/                ← index FAISS (Git LFS, ~300 Mo)
├── data/                     ← dataset ROCO (non versionné, ~10 Go)
└── tests/                    ← suite pytest
```

---

## Architecture (résumé)

```
Frontend React/Vite
        ↓
Backend FastAPI
        ↓
mediscan (lib Python)
   ├── DINOv2        (mode visual,   768-dim)
   ├── BioMedCLIP    (mode semantic, 512-dim — image ET texte)
   └── FAISS IndexFlatIP  ← index locaux dans artifacts/
        ↓
MongoDB Atlas (optionnel) — enrichissement métadonnées
        ↓
Images  ←  HuggingFace CDN (Mediscan-Team/mediscan-data)
        ↓
Groq LLM (llama-3.3-70b) — Analyse IA des résultats (nécessite GROQ_KEY_API)
```

Trois modes de recherche :
- **Recherche par image / visual** — similarité visuelle avec DINOv2
- **Recherche par image / semantic** — similarité sémantique médicale avec BioMedCLIP
- **Recherche par texte** — description en langage naturel → BioMedCLIP encode le texte → FAISS trouve les images les plus proches sémantiquement
