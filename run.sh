#!/usr/bin/env bash
# run.sh — Lance MediScan AI (backend + frontend) en un seul script
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ── Prérequis ───────────────────────────────────────────────────────────────
if ! command -v python3.11 &>/dev/null; then
    echo "❌ Python 3.11 introuvable."
    echo "   → Mac  : brew install python@3.11  ou  https://python.org/downloads/release/python-31119/"
    echo "   → Linux: sudo apt install python3.11"
    exit 1
fi

if ! command -v node &>/dev/null; then
    echo "❌ Node.js introuvable."
    echo "   → https://nodejs.org/  (version 20.19+ ou 22+ requise)"
    exit 1
fi

# Vite 8 exige Node >=20.19.0 ou >=22.12.0
NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1))")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

OK=0
if [ "$NODE_MAJOR" -ge 23 ]; then OK=1
elif [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -ge 12 ]; then OK=1
elif [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 19 ]; then OK=1
fi

if [ "$OK" -eq 0 ]; then
    echo "❌ Node.js $NODE_VERSION trop ancien. Vite 8 requiert Node >=20.19.0 ou >=22.12.0."
    echo "   → https://nodejs.org/  (choisir 22 LTS)"
    exit 1
fi

# Vérification Git LFS (avertissement seulement)
if ! command -v git-lfs &>/dev/null && ! git lfs version &>/dev/null 2>&1; then
    echo "⚠️  Git LFS introuvable — les index FAISS (artifacts/) pourraient être vides."
    echo "   → Mac  : brew install git-lfs && git lfs install"
    echo "   → Linux: sudo apt install git-lfs && git lfs install"
    echo "   → Puis : git lfs pull"
fi

# ── Venv Python 3.11 ────────────────────────────────────────────────────────
if [ ! -f ".venv311/bin/activate" ]; then
    echo "→ Création de l'environnement Python 3.11..."
    python3.11 -m venv .venv311
    .venv311/bin/python -m pip install -q --upgrade pip
    .venv311/bin/python -m pip install -q -r requirements.txt
    echo "✓ Environnement Python prêt"
fi

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "→ Installation des dépendances frontend (npm ci)..."
cd frontend && npm ci --silent && cd ..
echo "✓ Frontend prêt"

# ── Tuer les anciens processus sur les ports ─────────────────────────────────
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# ── Backend ──────────────────────────────────────────────────────────────────
echo "→ Démarrage du backend (port 8000)..."
PYTHONPATH="$PROJECT_DIR/src:$PROJECT_DIR" \
    .venv311/bin/python -m uvicorn backend.app.main:app \
    --host 127.0.0.1 --port 8000 --reload \
    > /tmp/mediscan-backend.log 2>&1 &
BACKEND_PID=$!

# Attente health check
echo "→ En attente du backend..."
READY=0
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 1
done

if [ "$READY" -eq 0 ]; then
    echo "❌ Backend non démarré après 30s. Logs :"
    cat /tmp/mediscan-backend.log
    exit 1
fi
echo "✓ Backend prêt  →  http://127.0.0.1:8000"

# ── Frontend dev server ───────────────────────────────────────────────────────
echo ""
echo "  ✅ MediScan AI est prêt !"
echo "  Frontend : http://127.0.0.1:5173"
echo "  Backend  : http://127.0.0.1:8000"
echo "  (Ctrl+C pour arrêter)"
echo ""

trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM

cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
