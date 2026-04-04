"""
Assistants au niveau du processus partagés par les scripts et le backend de MEDISCAN.
"""

from __future__ import annotations

import os


def configure_cpu_environment() -> None:
    """
    - Configure l'environnement pour une exécution CPU déterministe.
    - Évite les conflits de bibliothèques (OpenMP) lors de l'utilisation 
      de Faiss et Torch sur CPU.
    """
    os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    os.environ.setdefault("OMP_NUM_THREADS", "1")


__all__ = ["configure_cpu_environment"]
