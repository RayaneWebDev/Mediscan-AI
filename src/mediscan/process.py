"""
Assistants de configuration au niveau du processus pour MediScan AI.

Ce module fournit des utilitaires de configuration de l'environnement d'exécution
partagés entre les scripts CLI et le backend FastAPI. Il garantit un comportement
déterministe sur CPU en évitant les conflits de bibliothèques parallèles.
"""

from __future__ import annotations

import os


def configure_cpu_environment() -> None:
    """
    Configure l'environnement pour une exécution CPU déterministe.

    Définit les variables d'environnement nécessaires pour éviter les conflits
    entre les bibliothèques de parallélisme (OpenMP, MKL) utilisées conjointement
    par FAISS et PyTorch sur CPU. Doit être appelée au démarrage de chaque script
    ou module avant tout import de FAISS ou PyTorch.

    Variables configurées :
        - KMP_DUPLICATE_LIB_OK : Autorise plusieurs instances d'OpenMP (évite
          les crashs sur macOS et Windows avec certaines distributions).
        - OMP_NUM_THREADS : Limite à 1 thread OpenMP pour éviter les conflits
          lors de l'utilisation simultanée de FAISS et PyTorch.

    Returns:
        None

    Notes:
        Utilise `os.environ.setdefault` pour ne pas écraser les valeurs déjà
        définies par l'utilisateur ou par des variables d'environnement système.
    """
    os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    os.environ.setdefault("OMP_NUM_THREADS", "1")


__all__ = ["configure_cpu_environment"]