MEDISCAN AI - READ BEFORE LAUNCH

This folder contains the local launch files for MediScan AI.
The complete project is the parent folder named "mediscan".

1. What to launch

macOS / Linux:
  Preferred command:
    ./bin/run.sh

  Double-click option on macOS:
    bin/MEDISCAN_EXECUTABLE.command

Windows:
  Command line or double-click option:
    bin\run.bat

2. Requirements

Before launching the application, make sure these tools are installed:

  - Python 3.11
  - Node.js 20.19+ or Node.js 22.12+
  - npm
  - Git LFS, if the project was cloned again from Git

If the project was freshly cloned, run:

  git lfs install
  git lfs pull

The FAISS index files in artifacts/ are managed by Git LFS. Without them, the
application can start but image search may fail or return incomplete results.

3. What the launcher does

The launcher prepares and starts the full local development application:

  - checks Python and Node.js;
  - creates the Python virtual environment in .venv311 if needed;
  - installs Python dependencies from requirements.lock.txt when available;
  - falls back to requirements.txt if the lockfile cannot be used on Windows;
  - installs frontend dependencies with npm ci;
  - starts the FastAPI backend;
  - starts the Vite frontend.

After a successful launch, open:

  Frontend: http://127.0.0.1:5173
  Backend:  http://127.0.0.1:8000

4. Generate documentation

macOS / Linux:
  ./bin/run.sh docs

Windows:
  bin\run.bat docs

The generated documentation is written to:

  docs/index.html

5. Common fixes

Python is not found:
  Install Python 3.11 and make sure it is available from the terminal.
  On Windows, enable "Add Python to PATH" during installation, or use the
  Python Launcher with py -3.11.

Node.js is too old:
  Install Node.js 22 LTS from https://nodejs.org/.

Dependencies failed on Windows:
  Run bin\run.bat again. If it still fails, delete the .venv311 folder in the
  project root, then run bin\run.bat again.

Search artifacts are missing:
  Run git lfs pull from the project root.

Ports are already in use:
  The launchers try to free the backend and frontend ports automatically.
  If a process remains stuck, stop the old terminal or restart the machine.

6. Important notes

These launchers are for local development and academic demonstration.
They start the backend with development settings and the frontend with Vite.
They are not production deployment scripts.

MediScan AI is a non-clinical academic prototype. It must not be used as a
medical device or as a diagnostic tool.
