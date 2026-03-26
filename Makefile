PYTHON311 := $(shell command -v python3.11 2>/dev/null)
PYTHON := ./.venv311/bin/python
PIP := $(PYTHON) -m pip
PYTEST := $(PYTHON) -m pytest
UVICORN := $(PYTHON) -m uvicorn

.PHONY: setup-python setup-frontend setup run-backend run-frontend dev test

setup-python:
ifndef PYTHON311
	$(error Python 3.11 not found. Install it: brew install python@3.11  OR  https://www.python.org/downloads/release/python-31119/)
endif
	python3.11 -m venv .venv311
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

setup-frontend:
	cd frontend && npm ci

setup: setup-python setup-frontend

run-backend:
	PYTHONPATH=src:. $(UVICORN) backend.app.main:app --host 127.0.0.1 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

dev:
	@echo "Lancer run.sh pour demarrer backend + frontend ensemble"
	@echo "  Mac/Linux : ./run.sh"
	@echo "  Windows   : run.bat"

test:
	PYTHONPATH=src:. $(PYTEST) -q
