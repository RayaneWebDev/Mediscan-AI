# MEDISCAN AI

MEDISCAN AI est un prototype academique de recherche d'images medicales. Il permet de retrouver des images proches par similarite visuelle, par proximite semantique, ou depuis une requete textuelle.

Important : ce projet n'est pas un dispositif medical, n'est pas un outil de diagnostic et ne doit pas etre utilise pour prendre une decision clinique.

## Lancement rapide

Depuis une machine neuve, le lancement normal se fait avec un seul fichier.

Windows :

```bat
bin\run.bat
```

macOS ou Linux :

```bash
./bin/run.sh
```

macOS en double-clic :

```text
bin/MEDISCAN_EXECUTABLE.command
```

Apres le demarrage :

- Frontend : http://127.0.0.1:5173
- Backend : http://127.0.0.1:8000
- API health check : http://127.0.0.1:8000/api/health

## Dossier bin

Le dossier `bin/` est volontairement minimal :

```text
bin/
  run.bat                    Lanceur Windows, double-cliquable.
  run.sh                     Lanceur macOS/Linux.
  MEDISCAN_EXECUTABLE.command Lanceur macOS double-cliquable.
```

Il n'y a pas de fichier d'installation cache a lancer a la main. Toute la preparation est integree dans `run.bat` et `run.sh`.

## Ce que les lanceurs installent

Les lanceurs preparent le projet en mode zero-shot :

- detection ou installation de Python 3.11 quand c'est possible ;
- detection ou installation de Node.js compatible avec Vite ;
- creation du venv local `.venv311` ;
- installation de `pip`, `setuptools` et `wheel` ;
- installation forcee de PyTorch et TorchVision en CPU-only depuis l'index officiel PyTorch ;
- installation des dependances Python du projet ;
- verification que PyTorch n'est pas une version CUDA/GPU ;
- verification des imports critiques : `torch`, `torchvision`, `open_clip`, `faiss`, `fastapi`, `uvicorn`, `transformers`, `PIL`, `numpy` ;
- verification des fichiers FAISS et metadonnees dans `artifacts/` ;
- installation du frontend avec `npm ci` ;
- demarrage du backend FastAPI et du frontend Vite.

Le point important pour Windows : le lanceur installe PyTorch CPU avant les autres dependances, puis le reinstalle en CPU a la fin. Si `open_clip_torch` ou une autre dependance essaie de tirer une mauvaise version de PyTorch, le lanceur remet la version CPU-only avant de demarrer.

## Verification sans demarrer l'application

Pour tester l'installation sans ouvrir les serveurs :

Windows :

```bat
bin\run.bat check
```

macOS / Linux :

```bash
./bin/run.sh check
```

Si cette commande passe, Python, PyTorch CPU, OpenCLIP, FAISS, les index et le frontend sont prets.

## Documentation locale

Pour generer le portail de documentation :

Windows :

```bat
bin\run.bat docs
```

macOS / Linux :

```bash
./bin/run.sh docs
```

Sortie :

```text
docs/index.html
```

## Fichiers necessaires

Les fichiers lourds de recherche sont dans `artifacts/` :

- `artifacts/index.faiss`
- `artifacts/index_semantic.faiss`
- `artifacts/ids.json`
- `artifacts/ids_semantic.json`
- `artifacts/cui_categories.json`
- `artifacts/manifests/visual_stable.json`
- `artifacts/manifests/semantic_stable.json`

Si le projet vient d'un clone Git, installer Git LFS puis recuperer les vrais fichiers :

```bash
git lfs install
git lfs pull
```

Si le projet est rendu sous forme de dossier ou d'archive, verifier que les fichiers FAISS ne sont pas de petits fichiers texte Git LFS. Les lanceurs refusent de demarrer si les index sont absents ou trop petits.

## Variables optionnelles

Copier `.env.example` vers `.env` uniquement si necessaire :

```bash
cp .env.example .env
```

Variables utiles :

- `BACKEND_PORT=8000` ou `MEDISCAN_BACKEND_PORT=8000` pour changer le port backend ;
- `GROQ_KEY_API=...` pour activer la conclusion assistee par LLM ;
- `MONGO_URI=...` si une base MongoDB externe est utilisee ;
- `MEDISCAN_CORS_ORIGINS=...` pour autoriser un autre frontend.

Sans `.env`, le lancement local fonctionne avec les valeurs par defaut.

## Depannage rapide

**Python 3.11 introuvable**

Windows : installer Python 3.11 depuis https://www.python.org/downloads/ et cocher `Add Python to PATH`.

macOS : installer Python 3.11 avec `brew install python@3.11` ou depuis python.org.

Linux Debian/Ubuntu : `sudo apt install python3.11 python3.11-venv python3.11-dev`.

**Node.js trop ancien**

Installer Node.js 22 LTS depuis https://nodejs.org/, puis relancer le script.

**Erreur PyTorch, OpenCLIP ou CUDA sur Windows**

Supprimer l'environnement virtuel et relancer :

```bat
rmdir /s /q .venv311
bin\run.bat check
```

Le lanceur reinstallera PyTorch CPU-only depuis `https://download.pytorch.org/whl/cpu`.

**Erreur `open_clip_torch`**

La cause la plus frequente est un PyTorch incorrect ou un venv partiellement installe. Supprimer `.venv311`, verifier la connexion Internet, puis relancer `bin\run.bat check` ou `./bin/run.sh check`.

**Erreur FAISS ou fichiers d'index manquants**

Lancer :

```bash
git lfs install
git lfs pull
```

Puis relancer le lanceur. Si les fichiers `.faiss` font seulement quelques octets ou quelques Ko, ce sont des pointeurs Git LFS et non les vrais index.

**Erreur `npm ci`**

Verifier Node.js avec :

```bash
node --version
```

Il faut Node.js 20.19+ ou 22.12+. Ensuite relancer le lanceur. Si besoin, supprimer `frontend/node_modules` et relancer.

**Port 8000 ou 5173 deja utilise**

Les scripts essaient de liberer les ports automatiquement. Si le probleme reste present, fermer les anciens terminaux ou changer le port backend dans `.env` :

```text
BACKEND_PORT=8010
```

Le frontend reste sur `5173`.

**Permission refusee sur macOS/Linux**

Rendre les lanceurs executables :

```bash
chmod +x bin/run.sh bin/MEDISCAN_EXECUTABLE.command
```

Puis relancer `./bin/run.sh`.

**macOS bloque le fichier `.command`**

Clic droit sur `MEDISCAN_EXECUTABLE.command`, choisir `Ouvrir`, puis confirmer. Sinon lancer `./bin/run.sh` dans le terminal.

**Installation bloquee par Internet, proxy ou certificat**

Relancer depuis un reseau stable. Si un proxy est obligatoire, configurer `HTTP_PROXY` et `HTTPS_PROXY` dans le terminal avant de lancer le script.

## Commandes utiles pour le rendu

Verifier l'installation :

```bash
./bin/run.sh check
```

Lancer l'application :

```bash
./bin/run.sh
```

Executer les tests Python :

```bash
.venv311/bin/python -m pytest tests/src tests/backend
```

Executer les tests frontend :

```bash
cd frontend
npm test
```

## Structure du projet

```text
backend/          API FastAPI
frontend/         Interface React/Vite
src/mediscan/     Moteur de recherche, embedders, runtime
scripts/          Scripts de requete, indexation et documentation
artifacts/        Index FAISS et metadonnees
bin/              Lanceurs locaux
tests/            Tests backend, frontend et moteur
```

## Notes techniques

- Le backend force l'execution CPU via `CUDA_VISIBLE_DEVICES=""`.
- Les embedders chargent DINOv2 et BioMedCLIP sur CPU.
- FAISS utilise `faiss-cpu`.
- Les dependances Python sont installees dans `.venv311`, jamais globalement.
- Les dependances frontend restent dans `frontend/node_modules`.
- Les fichiers generes localement comme `.venv311`, `node_modules` et `docs/` ne sont pas necessaires dans le rendu source.
