Lancer le backend depuis la racine du projet :

```bash
.venv/bin/uvicorn backend.app.main:app --reload
```

Endpoints :
- `GET /api/health`
- `POST /api/search`

Le endpoint `POST /api/search` accepte :
- `image` : fichier JPEG ou PNG
- `mode` : `visual` ou `semantic`
- `k` : entier entre 1 et 50
