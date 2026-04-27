#!/usr/bin/env bash
# Clickable macOS launcher for MediScan AI.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -x "$PROJECT_DIR/bin/run.sh" ]; then
    chmod +x "$PROJECT_DIR/bin/run.sh" 2>/dev/null || true
fi

exec "$PROJECT_DIR/bin/run.sh"
