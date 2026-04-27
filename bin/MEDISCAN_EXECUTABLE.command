#!/usr/bin/env bash
# Executable local MediScan AI pour macOS et Linux.

set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -x "./bin/run.sh" ]; then
    chmod +x ./bin/run.sh 2>/dev/null || true
fi

./bin/run.sh
