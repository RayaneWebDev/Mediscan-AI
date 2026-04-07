#!/usr/bin/env bash
# run.sh - Lance MediScan AI (backend + frontend) en un seul script.
set -euo pipefail

readonly PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly FRONTEND_DIR="$PROJECT_DIR/frontend"
readonly VENV_DIR="$PROJECT_DIR/.venv311"
readonly PYTHON_BIN="$VENV_DIR/bin/python"
readonly BACKEND_HOST="127.0.0.1"
readonly BACKEND_PORT="8000"
readonly FRONTEND_PORT="5173"
readonly BACKEND_LOG="/tmp/mediscan-backend.log"
BACKEND_PID=""

cd "$PROJECT_DIR"

log_info() {
    echo "→ $1"
}

log_success() {
    echo "✓ $1"
}

fail() {
    echo "❌ $1"
    exit 1
}

require_command() {
    local command_name="$1"
    local error_message="$2"

    if ! command -v "$command_name" >/dev/null 2>&1; then
        fail "$error_message"
    fi
}

validate_node_version() {
    local node_version node_major node_minor is_supported

    node_version="$(node -e "process.stdout.write(process.version.slice(1))")"
    node_major="$(echo "$node_version" | cut -d. -f1)"
    node_minor="$(echo "$node_version" | cut -d. -f2)"
    is_supported=0

    if [ "$node_major" -ge 23 ]; then
        is_supported=1
    elif [ "$node_major" -eq 22 ] && [ "$node_minor" -ge 12 ]; then
        is_supported=1
    elif [ "$node_major" -eq 20 ] && [ "$node_minor" -ge 19 ]; then
        is_supported=1
    fi

    if [ "$is_supported" -eq 0 ]; then
        fail "Node.js $node_version trop ancien. Vite 8 requiert Node >=20.19.0 ou >=22.12.0."
    fi
}

warn_if_git_lfs_missing() {
    if command -v git-lfs >/dev/null 2>&1 || git lfs version >/dev/null 2>&1; then
        return
    fi

    echo "⚠️  Git LFS introuvable - les index FAISS (artifacts/) pourraient être vides."
    echo "   → Mac  : brew install git-lfs && git lfs install"
    echo "   → Linux: sudo apt install git-lfs && git lfs install"
    echo "   → Puis : git lfs pull"
}

ensure_python_environment() {
    if [ -x "$PYTHON_BIN" ]; then
        return
    fi

    log_info "Création de l'environnement Python 3.11..."
    python3.11 -m venv "$VENV_DIR"
    "$PYTHON_BIN" -m pip install -q --upgrade pip
    "$PYTHON_BIN" -m pip install -q -r requirements.txt
    log_success "Environnement Python prêt"
}

install_frontend_dependencies() {
    log_info "Installation des dépendances frontend (npm ci)..."
    (
        cd "$FRONTEND_DIR"
        npm ci --silent
    )
    log_success "Frontend prêt"
}

kill_port_process() {
    local port="$1"

    if ! command -v lsof >/dev/null 2>&1; then
        return
    fi

    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
}

cleanup() {
    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
}

start_backend() {
    log_info "Démarrage du backend (port $BACKEND_PORT)..."
    # Charge GROQ_KEY_API depuis .env si défini
    if [ -f "$PROJECT_DIR/.env" ]; then
        local groq_key
        groq_key=$(grep -E '^GROQ_KEY_API=' "$PROJECT_DIR/.env" | cut -d= -f2- | tr -d '"'"'" || true)
        if [ -n "$groq_key" ]; then
            export GROQ_KEY_API="$groq_key"
        fi
    fi
    PYTHONPATH="$PROJECT_DIR/src:$PROJECT_DIR" \
        "$PYTHON_BIN" -m uvicorn backend.app.main:app \
        --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload \
        >"$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
}

wait_for_backend() {
    local ready=0

    log_info "En attente du backend..."
    for _ in $(seq 1 30); do
        if curl -sf "http://$BACKEND_HOST:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
            ready=1
            break
        fi
        sleep 1
    done

    if [ "$ready" -eq 0 ]; then
        echo "❌ Backend non démarré après 30s. Logs :"
        cat "$BACKEND_LOG"
        exit 1
    fi

    log_success "Backend prêt  →  http://$BACKEND_HOST:$BACKEND_PORT"
}

start_frontend() {
    echo ""
    echo "  ✅ MediScan AI est prêt !"
    echo "  Frontend : http://$BACKEND_HOST:$FRONTEND_PORT"
    echo "  Backend  : http://$BACKEND_HOST:$BACKEND_PORT"
    echo "  (Ctrl+C pour arrêter)"
    echo ""

    (
        cd "$FRONTEND_DIR"
        npm run dev -- --host "$BACKEND_HOST" --port "$FRONTEND_PORT"
    )
}

require_command "python3.11" "Python 3.11 introuvable.
   → Mac  : brew install python@3.11  ou  https://python.org/downloads/release/python-31119/
   → Linux: sudo apt install python3.11"
require_command "node" "Node.js introuvable.
   → https://nodejs.org/  (version 20.19+ ou 22+ requise)"
require_command "curl" "curl introuvable."

validate_node_version
warn_if_git_lfs_missing
ensure_python_environment
install_frontend_dependencies

kill_port_process "$BACKEND_PORT"
kill_port_process "$FRONTEND_PORT"

trap cleanup INT TERM EXIT

start_backend
wait_for_backend
start_frontend
