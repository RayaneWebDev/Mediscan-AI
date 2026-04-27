#!/usr/bin/env bash
# MediScan AI launcher for macOS/Linux.
# It prepares a Python 3.11 CPU-only runtime, installs the frontend, then starts both servers.

set -euo pipefail

readonly PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly FRONTEND_DIR="$PROJECT_DIR/frontend"
readonly VENV_DIR="$PROJECT_DIR/.venv311"
readonly PYTHON_BIN="$VENV_DIR/bin/python"
readonly REQUIREMENTS_LOCK="$PROJECT_DIR/requirements.lock.txt"
readonly REQUIREMENTS_FALLBACK="$PROJECT_DIR/requirements.txt"
readonly PY_DEPS_STAMP_FILE="$VENV_DIR/.mediscan_py_deps_stamp"
readonly FE_DEPS_STAMP_FILE="$FRONTEND_DIR/.mediscan_fe_deps_stamp"
readonly PYTORCH_CPU_INDEX="https://download.pytorch.org/whl/cpu"
readonly BACKEND_HOST="127.0.0.1"
readonly FRONTEND_PORT="5173"
readonly BACKEND_LOG="/tmp/mediscan-backend.log"

BACKEND_PORT="8000"
BACKEND_PID=""
PYTHON311_BIN=""

cd "$PROJECT_DIR"

log_info() { echo "[INFO] $1"; }
log_ok() { echo "[OK] $1"; }
log_warn() { echo "[WARN] $1"; }
fail() { echo "[ERROR] $1" >&2; exit 1; }

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "$2"
}

hash_file() {
    local file_path="$1"
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file_path" | awk '{print $1}'
    elif command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file_path" | awk '{print $1}'
    elif command -v openssl >/dev/null 2>&1; then
        openssl dgst -sha256 "$file_path" | awk '{print $2}'
    else
        fail "Cannot calculate SHA256; install shasum, sha256sum, or openssl."
    fi
}

run_with_optional_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        fail "Administrator privileges are required, but sudo is not available."
    fi
}

load_env_port() {
    local value=""
    if [ -f "$PROJECT_DIR/.env" ]; then
        value="$(grep -E '^(BACKEND_PORT|MEDISCAN_BACKEND_PORT)=' "$PROJECT_DIR/.env" | tail -n 1 | cut -d= -f2- | tr -d "\"'" || true)"
    fi
    if [ -n "$value" ]; then
        BACKEND_PORT="$value"
    fi
}

install_python311_if_possible() {
    local system_name
    system_name="$(uname -s 2>/dev/null || true)"

    if [ "$system_name" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
        log_info "Installing Python 3.11 with Homebrew..."
        brew install python@3.11 || brew upgrade python@3.11 || true
    elif [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1; then
        log_info "Installing Python 3.11 with apt..."
        run_with_optional_sudo apt-get update
        run_with_optional_sudo apt-get install -y python3.11 python3.11-venv python3.11-dev
    elif command -v dnf >/dev/null 2>&1; then
        log_info "Installing Python 3.11 with dnf..."
        run_with_optional_sudo dnf install -y python3.11 python3.11-devel
    elif command -v yum >/dev/null 2>&1; then
        log_info "Installing Python 3.11 with yum..."
        run_with_optional_sudo yum install -y python3.11 python3.11-devel
    elif command -v pacman >/dev/null 2>&1; then
        log_info "Installing Python with pacman..."
        run_with_optional_sudo pacman -S --noconfirm python
    fi
}

resolve_python311() {
    if command -v python3.11 >/dev/null 2>&1; then
        PYTHON311_BIN="$(command -v python3.11)"
    else
        install_python311_if_possible
        if command -v python3.11 >/dev/null 2>&1; then
            PYTHON311_BIN="$(command -v python3.11)"
        elif [ -x "/opt/homebrew/bin/python3.11" ]; then
            PYTHON311_BIN="/opt/homebrew/bin/python3.11"
        elif [ -x "/usr/local/bin/python3.11" ]; then
            PYTHON311_BIN="/usr/local/bin/python3.11"
        else
            fail "Python 3.11 not found. Install it from https://www.python.org/downloads/ and relaunch."
        fi
    fi
    log_ok "Python 3.11 found: $PYTHON311_BIN"
}

ensure_curl_available() {
    if command -v curl >/dev/null 2>&1; then
        return
    fi

    if [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1; then
        log_info "Installing curl with apt..."
        run_with_optional_sudo apt-get update
        run_with_optional_sudo apt-get install -y curl ca-certificates
    elif command -v dnf >/dev/null 2>&1; then
        log_info "Installing curl with dnf..."
        run_with_optional_sudo dnf install -y curl ca-certificates
    elif command -v yum >/dev/null 2>&1; then
        log_info "Installing curl with yum..."
        run_with_optional_sudo yum install -y curl ca-certificates
    elif command -v pacman >/dev/null 2>&1; then
        log_info "Installing curl with pacman..."
        run_with_optional_sudo pacman -S --noconfirm curl ca-certificates
    fi

    require_command "curl" "curl is required and could not be installed automatically."
}

install_node_if_possible() {
    local system_name
    system_name="$(uname -s 2>/dev/null || true)"

    if [ "$system_name" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
        log_info "Installing/updating Node.js with Homebrew..."
        brew install node || brew upgrade node || true
    elif [ -f /etc/debian_version ] && command -v apt-get >/dev/null 2>&1; then
        ensure_curl_available
        log_info "Installing Node.js 22 LTS with NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/mediscan-nodesource-setup.sh
        run_with_optional_sudo bash /tmp/mediscan-nodesource-setup.sh
        run_with_optional_sudo apt-get install -y nodejs
    elif command -v dnf >/dev/null 2>&1; then
        log_info "Installing Node.js/npm with dnf..."
        run_with_optional_sudo dnf install -y nodejs npm
    elif command -v yum >/dev/null 2>&1; then
        log_info "Installing Node.js/npm with yum..."
        run_with_optional_sudo yum install -y nodejs npm
    elif command -v pacman >/dev/null 2>&1; then
        log_info "Installing Node.js/npm with pacman..."
        run_with_optional_sudo pacman -S --noconfirm nodejs npm
    fi
}

node_version_supported() {
    local version major minor
    command -v node >/dev/null 2>&1 || return 1
    version="$(node -e "process.stdout.write(process.version.slice(1))")"
    major="$(echo "$version" | cut -d. -f1)"
    minor="$(echo "$version" | cut -d. -f2)"

    [ "$major" -ge 23 ] && return 0
    [ "$major" -eq 22 ] && [ "$minor" -ge 12 ] && return 0
    [ "$major" -eq 20 ] && [ "$minor" -ge 19 ] && return 0
    return 1
}

ensure_node_available() {
    if ! node_version_supported; then
        if command -v node >/dev/null 2>&1; then
            log_warn "Node.js $(node -e "process.stdout.write(process.version)") is too old."
        else
            log_warn "Node.js not found."
        fi
        install_node_if_possible
        hash -r
    fi

    node_version_supported || fail "Node.js 20.19+ or 22.12+ is required. Install Node.js 22 LTS from https://nodejs.org/ and relaunch."
    log_ok "Node.js $(node -e "process.stdout.write(process.version)")"
}

warn_if_git_lfs_missing() {
    if command -v git >/dev/null 2>&1 && git lfs version >/dev/null 2>&1; then
        return
    fi
    log_warn "Git LFS not found. If artifacts are missing, run: git lfs install && git lfs pull"
}

install_cpu_pytorch() {
    local system_name
    system_name="$(uname -s 2>/dev/null || true)"

    log_info "Installing PyTorch CPU wheels..."
    if [ "$system_name" = "Darwin" ]; then
        "$PYTHON_BIN" -m pip install -q --upgrade --force-reinstall \
            --index-url "$PYTORCH_CPU_INDEX" --extra-index-url https://pypi.org/simple \
            "torch==2.11.0" "torchvision==0.26.0"
    else
        "$PYTHON_BIN" -m pip install -q --upgrade --force-reinstall \
            --index-url "$PYTORCH_CPU_INDEX" --extra-index-url https://pypi.org/simple \
            "torch==2.11.0+cpu" "torchvision==0.26.0+cpu"
    fi
}

verify_runtime() {
    "$PYTHON_BIN" - "$@" <<'PY'
import importlib
import os
import sys
from pathlib import Path

project = Path.cwd()
os.environ["CUDA_VISIBLE_DEVICES"] = ""

def die(message):
    print("[ERROR] " + message, file=sys.stderr)
    raise SystemExit(1)

def ok(message):
    print("[OK] " + message)

if sys.version_info[:2] != (3, 11):
    die(f"Python 3.11 required, got {sys.version.split()[0]}")

try:
    import torch
except Exception as exc:
    die(f"PyTorch import failed: {exc}")

cuda_version = getattr(getattr(torch, "version", None), "cuda", None)
if cuda_version:
    die(
        "CUDA PyTorch build detected "
        f"(torch={torch.__version__}, cuda={cuda_version}). Delete .venv311 and relaunch."
    )
ok(f"PyTorch CPU build {torch.__version__}")

for label, module_name in [
    ("numpy", "numpy"),
    ("Pillow", "PIL"),
    ("faiss-cpu", "faiss"),
    ("FastAPI", "fastapi"),
    ("Uvicorn", "uvicorn"),
    ("Transformers", "transformers"),
    ("OpenCLIP", "open_clip"),
    ("TorchVision", "torchvision"),
]:
    try:
        module = importlib.import_module(module_name)
    except Exception as exc:
        die(f"{label} import failed: {exc}")
    ok(f"{label} {getattr(module, '__version__', 'installed')}")

if "--skip-artifacts" not in sys.argv:
    required = {
        "artifacts/index.faiss": 1_000_000,
        "artifacts/index_semantic.faiss": 1_000_000,
        "artifacts/ids.json": 1_000_000,
        "artifacts/ids_semantic.json": 1_000_000,
        "artifacts/cui_categories.json": 100,
        "artifacts/manifests/visual_stable.json": 100,
        "artifacts/manifests/semantic_stable.json": 100,
    }
    bad = []
    for relative, min_size in required.items():
        path = project / relative
        if not path.exists():
            bad.append(f"{relative} missing")
            continue
        with path.open("rb") as handle:
            header = handle.read(128)
        if header.startswith(b"version https://git-lfs.github.com/spec/v1"):
            bad.append(f"{relative} is a Git LFS pointer")
        elif path.stat().st_size < min_size:
            bad.append(f"{relative} is too small")
    if bad:
        die("Search artifacts are not ready: " + "; ".join(bad) + ". Run: git lfs install && git lfs pull")
    ok("FAISS artifacts ready")

ok("Runtime verification complete")
PY
}

ensure_python_environment() {
    local current_stamp=""
    local lock_stamp="NOLOCK"
    local expected_stamp=""

    if [ ! -x "$PYTHON_BIN" ]; then
        log_info "Creating Python 3.11 virtual environment..."
        "$PYTHON311_BIN" -m venv "$VENV_DIR"
    fi

    "$PYTHON_BIN" -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 1)" \
        || fail ".venv311 exists but is not Python 3.11. Delete .venv311, then relaunch."

    if [ -f "$PY_DEPS_STAMP_FILE" ]; then
        current_stamp="$(cat "$PY_DEPS_STAMP_FILE" 2>/dev/null || true)"
    fi
    if [ -f "$REQUIREMENTS_LOCK" ]; then
        lock_stamp="$(hash_file "$REQUIREMENTS_LOCK")"
    fi
    expected_stamp="req:$(hash_file "$REQUIREMENTS_FALLBACK")|lock:$lock_stamp|torch:2.11.0-cpu|torchvision:0.26.0-cpu"

    if [ "$current_stamp" = "$expected_stamp" ]; then
        log_ok "Python dependencies already up to date"
        verify_runtime
        return
    fi

    if verify_runtime --skip-artifacts >/dev/null 2>&1; then
        echo "$expected_stamp" > "$PY_DEPS_STAMP_FILE"
        log_ok "Existing Python runtime is already valid"
        verify_runtime
        return
    fi

    log_warn "Existing Python runtime is incomplete; reinstalling dependencies."

    log_info "Upgrading pip/setuptools/wheel..."
    "$PYTHON_BIN" -m pip install -q --upgrade pip setuptools wheel

    install_cpu_pytorch

    log_info "Installing Python dependencies..."
    if [ -f "$REQUIREMENTS_LOCK" ]; then
        if ! "$PYTHON_BIN" -m pip install -q -r "$REQUIREMENTS_LOCK"; then
            log_warn "requirements.lock.txt failed on this machine; retrying with requirements.txt."
            "$PYTHON_BIN" -m pip install -q -r "$REQUIREMENTS_FALLBACK"
        fi
    else
        "$PYTHON_BIN" -m pip install -q -r "$REQUIREMENTS_FALLBACK"
    fi

    install_cpu_pytorch
    verify_runtime
    echo "$expected_stamp" > "$PY_DEPS_STAMP_FILE"
    log_ok "Python dependencies ready"
}

install_frontend_dependencies() {
    local current_stamp=""
    local lock_stamp="NOLOCK"
    local expected_stamp=""

    if [ -f "$FRONTEND_DIR/package-lock.json" ]; then
        lock_stamp="$(hash_file "$FRONTEND_DIR/package-lock.json")"
    fi
    expected_stamp="pkg:$(hash_file "$FRONTEND_DIR/package.json")|lock:$lock_stamp"

    if [ -f "$FE_DEPS_STAMP_FILE" ]; then
        current_stamp="$(cat "$FE_DEPS_STAMP_FILE" 2>/dev/null || true)"
    fi

    if [ "$current_stamp" = "$expected_stamp" ] && [ -d "$FRONTEND_DIR/node_modules" ]; then
        log_ok "Frontend dependencies already up to date"
        return
    fi

    log_info "Installing frontend dependencies..."
    (
        cd "$FRONTEND_DIR"
        if [ -f package-lock.json ]; then
            npm ci --silent
        else
            npm install --silent
        fi
    )
    echo "$expected_stamp" > "$FE_DEPS_STAMP_FILE"
    log_ok "Frontend dependencies ready"
}

kill_port_process() {
    local port="$1"
    command -v lsof >/dev/null 2>&1 || return
    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
}

cleanup() {
    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
}

start_backend() {
    log_info "Starting backend on http://$BACKEND_HOST:$BACKEND_PORT ..."
    CUDA_VISIBLE_DEVICES="" \
    PYTHONPATH="$PROJECT_DIR/src:$PROJECT_DIR" \
        "$PYTHON_BIN" -m uvicorn backend.app.main:app \
        --host "$BACKEND_HOST" --port "$BACKEND_PORT" \
        >"$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
}

wait_for_backend() {
    local ready=0
    log_info "Waiting for backend health check..."
    for _ in $(seq 1 60); do
        if curl -sf "http://$BACKEND_HOST:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
            ready=1
            break
        fi
        sleep 1
    done

    if [ "$ready" -eq 0 ]; then
        echo "[ERROR] Backend did not start. Log file: $BACKEND_LOG" >&2
        cat "$BACKEND_LOG" >&2
        exit 1
    fi
    log_ok "Backend ready: http://$BACKEND_HOST:$BACKEND_PORT"
}

start_frontend() {
    echo ""
    echo "MediScan AI is ready."
    echo "Frontend: http://$BACKEND_HOST:$FRONTEND_PORT"
    echo "Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
    echo "Press Ctrl+C to stop."
    echo ""
    (
        cd "$FRONTEND_DIR"
        npm run dev -- --host "$BACKEND_HOST" --port "$FRONTEND_PORT"
    )
}

generate_docs() {
    log_info "Generating documentation..."
    "$PYTHON_BIN" "$PROJECT_DIR/scripts/generate_docs.py"
    log_ok "Documentation generated: $PROJECT_DIR/docs/index.html"
}

load_env_port
resolve_python311
ensure_node_available
ensure_curl_available
warn_if_git_lfs_missing
ensure_python_environment
install_frontend_dependencies

case "${1:-run}" in
    check)
        log_ok "Check complete. No server was started."
        exit 0
        ;;
    docs)
        generate_docs
        exit 0
        ;;
    run)
        ;;
    *)
        fail "Unknown command: $1. Use: run, check, or docs."
        ;;
esac

kill_port_process "$BACKEND_PORT"
kill_port_process "$FRONTEND_PORT"

trap cleanup INT TERM EXIT
start_backend
wait_for_backend
start_frontend
