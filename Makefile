PYTHON := ./.venv/bin/python
PIP := ./.venv/bin/pip
PYTEST := ./.venv/bin/pytest
UVICORN := ./.venv/bin/uvicorn

.PHONY: setup-python setup-frontend setup run-backend run-frontend test

setup-python:
	python3 -m venv .venv
	$(PIP) install -r requirements.txt

setup-frontend:
	cd frontend && npm ci

setup: setup-python setup-frontend

run-backend:
	PYTHONPATH=src:. $(UVICORN) backend.app.main:app --host 127.0.0.1 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

test:
	PYTHONPATH=src:. $(PYTEST) -q
