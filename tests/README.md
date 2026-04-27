# Tests MediScan

Ce dossier repart proprement pour une suite de tests unitaires avec `pytest`.

## Ordre conseille

1. Tester les fonctions pures de `src/mediscan`.
   Commencer par `runtime.py`, `dataset.py`, puis `search.py`, car ces modules portent la logique metier sans lancer le serveur ni charger le frontend.

2. Tester les petits utilitaires backend.
   Couvrir `backend/app/image_utils.py`, puis `backend/app/services/validation.py`, `result_enricher.py` et `image_store.py` avec des mocks quand il y a du disque, du reseau ou MongoDB.

3. Tester les embedders avec doubles de test.
   Verifier surtout les contrats de `src/mediscan/embedders/base.py`, `factory.py`, `utils.py`; eviter de charger les vrais modeles lourds dans des tests unitaires.

4. Tester les services backend.
   Couvrir `search_service.py` et `analysis_service.py` en remplacant les indexes, les embedders et les appels externes par des fixtures/mocks.

5. Tester l'API FastAPI.
   Utiliser `TestClient` sur `backend/app/main.py` ou les routers, avec services mockes, pour verifier les statuts HTTP, les schemas et les erreurs.

6. Tester les scripts comme interface fine.
   Garder des tests simples sur `scripts/build_index.py`, `query.py`, `query_text.py` et `rebuild_stable_indexes.py`, surtout pour les arguments, les chemins et les appels aux fonctions principales.

Les tests frontend React doivent rester cote frontend avec Vitest/React Testing Library si on decide d'en ajouter. Pour l'instant, ce dossier est reserve a Python/pytest.

## Tests avec artefacts

Les tests unitaires utilisent des doubles de test pour rester rapides. Les tests marques `integration` peuvent lire les vrais fichiers de `artifacts/`, par exemple les index FAISS et les fichiers d'IDs.

Pour lancer seulement les tests unitaires rapides :

```bash
.venv/bin/python -m pytest tests/src/mediscan -m "not integration"
```

Pour inclure les vrais artefacts :

```bash
.venv/bin/python -m pytest tests/src/mediscan
```
