# MEDISCAN AI

MEDISCAN AI is an academic prototype for medical image retrieval. It supports visual similarity search, semantic similarity search, and text-to-image retrieval over packaged FAISS indexes.

Important: this project is not a medical device, is not a diagnostic tool, and must not be used to make clinical decisions.

## Quick Start

From a clean machine, use one launcher.

Windows:

```bat
bin\run.bat
```

macOS or Linux:

```bash
./bin/run.sh
```

macOS double-click launcher:

```text
bin/MEDISCAN_EXECUTABLE.command
```

After startup:

- Frontend: http://127.0.0.1:5173
- Backend: http://127.0.0.1:8000
- API health check: http://127.0.0.1:8000/api/health

## Launcher Folder

The `bin/` folder is intentionally small:

```text
bin/
  run.bat                     Windows launcher, double-clickable.
  run.sh                      macOS/Linux launcher.
  MEDISCAN_EXECUTABLE.command  macOS double-click launcher.
```

There are no hidden setup scripts to run manually. The complete local setup is inside `run.bat` and `run.sh`.

## What The Launchers Install

The launchers prepare a zero-shot local environment:

- detect or install Python 3.11 when possible;
- detect or install a Node.js version compatible with Vite;
- create the local `.venv311` virtual environment;
- install `pip`, `setuptools`, and `wheel`;
- force-install PyTorch and TorchVision CPU-only from the official PyTorch CPU wheel index;
- install project Python dependencies;
- verify that PyTorch is not a CUDA/GPU build;
- verify critical imports: `torch`, `torchvision`, `open_clip`, `faiss`, `fastapi`, `uvicorn`, `transformers`, `PIL`, `numpy`;
- verify FAISS indexes and metadata under `artifacts/`;
- install frontend dependencies with `npm ci`;
- start the FastAPI backend and Vite frontend.

The Windows launcher is defensive about the common `open_clip_torch` / PyTorch problem: it installs CPU-only PyTorch before the rest of the Python dependencies, then force-installs CPU-only PyTorch again at the end. If a dependency tries to pull the wrong PyTorch build, the final runtime is corrected before startup.

## Check Without Starting Servers

Windows:

```bat
bin\run.bat check
```

macOS / Linux:

```bash
./bin/run.sh check
```

If this command succeeds, Python, CPU-only PyTorch, OpenCLIP, FAISS, the search artifacts, and frontend dependencies are ready.

## Generate Local Documentation

Windows:

```bat
bin\run.bat docs
```

macOS / Linux:

```bash
./bin/run.sh docs
```

Output:

```text
docs/index.html
```

## Required Artifacts

The retrieval engine needs these files:

- `artifacts/index.faiss`
- `artifacts/index_semantic.faiss`
- `artifacts/ids.json`
- `artifacts/ids_semantic.json`
- `artifacts/cui_categories.json`
- `artifacts/manifests/visual_stable.json`
- `artifacts/manifests/semantic_stable.json`

If the repository was cloned from Git, install Git LFS and fetch the large files:

```bash
git lfs install
git lfs pull
```

If the project is delivered as a folder or archive, make sure the `.faiss` files are real binary files, not tiny Git LFS pointer text files. The launchers stop early if indexes are missing or too small.

## Optional Environment

Copy `.env.example` to `.env` only when needed:

```bash
cp .env.example .env
```

Useful variables:

- `BACKEND_PORT=8000` or `MEDISCAN_BACKEND_PORT=8000` to change the backend port;
- `GROQ_KEY_API=...` to enable LLM-assisted conclusions;
- `MONGO_URI=...` if an external MongoDB database is used;
- `MEDISCAN_CORS_ORIGINS=...` to allow another frontend origin.

Without `.env`, local launch works with defaults.

## Troubleshooting

**Python 3.11 not found**

Windows: install Python 3.11 from https://www.python.org/downloads/ and enable `Add Python to PATH`.

macOS: install Python 3.11 with `brew install python@3.11` or from python.org.

Debian/Ubuntu Linux:

```bash
sudo apt install python3.11 python3.11-venv python3.11-dev
```

**Node.js is too old**

Install Node.js 22 LTS from https://nodejs.org/, then relaunch.

**PyTorch, OpenCLIP, or CUDA error on Windows**

Delete the virtual environment and rerun the check:

```bat
rmdir /s /q .venv311
bin\run.bat check
```

The launcher reinstalls CPU-only PyTorch from `https://download.pytorch.org/whl/cpu`.

**`open_clip_torch` fails**

The most common cause is a bad or partially installed PyTorch environment. Delete `.venv311`, check the internet connection, then rerun `bin\run.bat check` or `./bin/run.sh check`.

**FAISS error or missing indexes**

Run:

```bash
git lfs install
git lfs pull
```

Then relaunch. If `.faiss` files are only a few bytes or a few KB, they are Git LFS pointers, not the real indexes.

**`npm ci` fails**

Check Node.js:

```bash
node --version
```

Node.js 20.19+ or 22.12+ is required. Relaunch after upgrading. If needed, delete `frontend/node_modules` and run the launcher again.

**Port 8000 or 5173 is already in use**

The launchers try to free these ports automatically. If the error remains, close old terminals or change the backend port in `.env`:

```text
BACKEND_PORT=8010
```

The frontend still runs on `5173`.

**Permission denied on macOS/Linux**

Make the launchers executable:

```bash
chmod +x bin/run.sh bin/MEDISCAN_EXECUTABLE.command
```

Then run `./bin/run.sh`.

**macOS blocks the `.command` file**

Right-click `MEDISCAN_EXECUTABLE.command`, choose `Open`, then confirm. The terminal command `./bin/run.sh` also works.

**Network, proxy, or certificate failure**

Use a stable network and relaunch. If a proxy is required, define `HTTP_PROXY` and `HTTPS_PROXY` before running the launcher.

## Useful Delivery Commands

Check installation:

```bash
./bin/run.sh check
```

Start the app:

```bash
./bin/run.sh
```

Run Python tests:

```bash
.venv311/bin/python -m pytest tests/src tests/backend
```

Run frontend tests:

```bash
cd frontend
npm test
```

## Project Layout

```text
backend/          FastAPI backend
frontend/         React/Vite frontend
src/mediscan/     Retrieval engine, embedders, runtime helpers
scripts/          Query, indexing, and documentation scripts
artifacts/        FAISS indexes and metadata
bin/              Local launchers
tests/            Backend, frontend, and engine tests
```

## Technical Notes

- The backend forces CPU execution with `CUDA_VISIBLE_DEVICES=""`.
- DINOv2 and BioMedCLIP are loaded on CPU.
- FAISS uses `faiss-cpu`.
- Python dependencies are installed locally in `.venv311`, never globally.
- Frontend dependencies stay in `frontend/node_modules`.
- Generated local folders such as `.venv311`, `node_modules`, and `docs/` are not required in the source delivery.
