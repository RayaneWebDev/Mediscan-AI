#!/usr/bin/env bash
# run.sh - Lance MediScan AI (backend + frontend) en un seul script.
set -euo pipefail

readonly PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly FRONTEND_DIR="$PROJECT_DIR/frontend"
readonly VENV_DIR="$PROJECT_DIR/.venv311"
readonly PYTHON_BIN="$VENV_DIR/bin/python"
readonly REQUIREMENTS_LOCK="$PROJECT_DIR/requirements.lock.txt"
readonly REQUIREMENTS_DEV="$PROJECT_DIR/requirements.txt"
readonly PY_DEPS_STAMP_FILE="$VENV_DIR/.mediscan_py_deps_stamp"
readonly FE_DEPS_STAMP_FILE="$PROJECT_DIR/frontend/.mediscan_fe_deps_stamp"
readonly BACKEND_HOST="127.0.0.1"
readonly BACKEND_PORT="8000"
readonly FRONTEND_PORT="5173"
readonly BACKEND_LOG="/tmp/mediscan-backend.log"
BACKEND_PID=""
PYTHON311_BIN=""

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

hash_file() {
    local file_path="$1"

    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file_path" | awk '{print $1}'
        return
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file_path" | awk '{print $1}'
        return
    fi

    if command -v openssl >/dev/null 2>&1; then
        openssl dgst -sha256 "$file_path" | awk '{print $2}'
        return
    fi

    fail "Impossible de calculer un hash (shasum/sha256sum/openssl introuvable)."
}

run_with_optional_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
        return
    fi

    if command -v sudo >/dev/null 2>&1; then
        sudo "$@"
        return
    fi

    fail "Privilèges administrateur requis pour installer les prérequis (sudo introuvable)."
}

install_python311_if_possible() {
    local uname_out

    uname_out="$(uname -s 2>/dev/null || true)"

    if [ "$uname_out" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
        log_info "Installation automatique de Python 3.11 via Homebrew..."
        brew install python@3.11 || true
        return
    fi

    if [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1; then
        log_info "Installation automatique de Python 3.11 via apt..."
        run_with_optional_sudo apt-get update
        run_with_optional_sudo apt-get install -y python3.11 python3.11-venv
        return
    fi

    if command -v dnf >/dev/null 2>&1; then
        log_info "Installation automatique de Python 3.11 via dnf..."
        run_with_optional_sudo dnf install -y python3.11
        return
    fi

    if command -v yum >/dev/null 2>&1; then
        log_info "Installation automatique de Python 3.11 via yum..."
        run_with_optional_sudo yum install -y python3.11
        return
    fi

    if command -v pacman >/dev/null 2>&1; then
        log_info "Installation automatique de Python via pacman..."
        run_with_optional_sudo pacman -S --noconfirm python
        return
    fi
}

resolve_python311() {
    if command -v python3.11 >/dev/null 2>&1; then
        PYTHON311_BIN="$(command -v python3.11)"
        return
    fi

    install_python311_if_possible

    if command -v python3.11 >/dev/null 2>&1; then
        PYTHON311_BIN="$(command -v python3.11)"
        return
    fi

    if [ -x "/opt/homebrew/bin/python3.11" ]; then
        PYTHON311_BIN="/opt/homebrew/bin/python3.11"
        return
    fi

    if [ -x "/usr/local/bin/python3.11" ]; then
        PYTHON311_BIN="/usr/local/bin/python3.11"
        return
    fi

    fail "Python 3.11 introuvable.
   → Mac  : brew install python@3.11  ou  https://python.org/downloads/release/python-31119/
   → Linux: sudo apt install python3.11 python3.11-venv"
}

install_node_if_possible() {
    local uname_out

    uname_out="$(uname -s 2>/dev/null || true)"

    if [ "$uname_out" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
        log_info "Installation automatique de Node.js via Homebrew..."
        brew install node || true
        return
    fi

    if [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1; then
        log_info "Installation automatique de Node.js/npm via apt..."
        run_with_optional_sudo apt-get update
        run_with_optional_sudo apt-get install -y nodejs npm
        return
    fi

    if command -v dnf >/dev/null 2>&1; then
        log_info "Installation automatique de Node.js/npm via dnf..."
        run_with_optional_sudo dnf install -y nodejs npm
        return
    fi

    if command -v yum >/dev/null 2>&1; then
        log_info "Installation automatique de Node.js/npm via yum..."
        run_with_optional_sudo yum install -y nodejs npm
        return
    fi

    if command -v pacman >/dev/null 2>&1; then
        log_info "Installation automatique de Node.js/npm via pacman..."
        run_with_optional_sudo pacman -S --noconfirm nodejs npm
        return
    fi
}

ensure_node_available() {
    if command -v node >/dev/null 2>&1; then
        return
    fi

    install_node_if_possible

    require_command "node" "Node.js introuvable.
   → https://nodejs.org/  (version 20.19+ ou 22+ requise)"
}

ensure_curl_available() {
    if command -v curl >/dev/null 2>&1; then
        return
    fi

    if [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1; then
        log_info "Installation automatique de curl via apt..."
        run_with_optional_sudo apt-get update
        run_with_optional_sudo apt-get install -y curl
    elif command -v dnf >/dev/null 2>&1; then
        log_info "Installation automatique de curl via dnf..."
        run_with_optional_sudo dnf install -y curl
    elif command -v yum >/dev/null 2>&1; then
        log_info "Installation automatique de curl via yum..."
        run_with_optional_sudo yum install -y curl
    elif command -v pacman >/dev/null 2>&1; then
        log_info "Installation automatique de curl via pacman..."
        run_with_optional_sudo pacman -S --noconfirm curl
    fi

    require_command "curl" "curl introuvable."
}

require_command() {
    local command_name="$1"
    local error_message="$2"

    if ! command -v "$command_name" >/dev/null 2>&1; then
        fail "$error_message"
    fi
}

generate_docs() {
    ensure_python_environment
    require_command "node" "Node.js introuvable.
   → https://nodejs.org/  (version 20.19+ ou 22+ requise)"
    validate_node_version
    install_frontend_dependencies
    log_info "Génération de la documentation unifiée..."
    "$PYTHON_BIN" "$PROJECT_DIR/scripts/generate_docs.py"
    log_success "Documentation générée → $PROJECT_DIR/docs/index.html"
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
    local current_stamp=""
    local expected_stamp=""

    if [ -x "$PYTHON_BIN" ]; then
        if [ -f "$PY_DEPS_STAMP_FILE" ]; then
            current_stamp="$(cat "$PY_DEPS_STAMP_FILE" 2>/dev/null || true)"
        fi
    else
        log_info "Création de l'environnement Python 3.11..."
        "$PYTHON311_BIN" -m venv "$VENV_DIR"
        "$PYTHON_BIN" -m pip install -q --upgrade pip
        log_success "Environnement Python prêt"
    fi

    expected_stamp="req:${REQUIREMENTS_DEV}:$(hash_file "$REQUIREMENTS_DEV")"
    if [ -f "$REQUIREMENTS_LOCK" ]; then
        expected_stamp="$expected_stamp|lock:${REQUIREMENTS_LOCK}:$(hash_file "$REQUIREMENTS_LOCK")"
    fi

    if [ "$current_stamp" = "$expected_stamp" ]; then
        log_success "Dépendances Python déjà à jour"
        return
    fi

    log_info "Installation des dépendances Python..."
    if [ -f "$REQUIREMENTS_LOCK" ]; then
        "$PYTHON_BIN" -m pip install -q -r "$REQUIREMENTS_LOCK"
    else
        "$PYTHON_BIN" -m pip install -q -r "$REQUIREMENTS_DEV"
    fi

    echo "$expected_stamp" > "$PY_DEPS_STAMP_FILE"
    log_success "Dépendances Python à jour"
}

install_frontend_dependencies() {
    local current_stamp=""
    local expected_stamp=""

    expected_stamp="pkg:${FRONTEND_DIR}/package.json:$(hash_file "$FRONTEND_DIR/package.json")"
    if [ -f "$FRONTEND_DIR/package-lock.json" ]; then
        expected_stamp="$expected_stamp|lock:${FRONTEND_DIR}/package-lock.json:$(hash_file "$FRONTEND_DIR/package-lock.json")"
    fi

    if [ -f "$FE_DEPS_STAMP_FILE" ]; then
        current_stamp="$(cat "$FE_DEPS_STAMP_FILE" 2>/dev/null || true)"
    fi

    if [ "$current_stamp" = "$expected_stamp" ] && [ -d "$FRONTEND_DIR/node_modules" ]; then
        log_success "Dépendances frontend déjà à jour"
        return
    fi

    log_info "Installation des dépendances frontend (npm ci)..."
    (
        cd "$FRONTEND_DIR"
        npm ci --silent
    )
    echo "$expected_stamp" > "$FE_DEPS_STAMP_FILE"
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

resolve_python311

if [ "${1:-}" = "docs" ]; then
    ensure_node_available
    validate_node_version
    generate_docs
    exit 0
fi

ensure_node_available
ensure_curl_available

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
