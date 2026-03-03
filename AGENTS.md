# AGENTS.md — MEDISCAN AI

Projet universitaire — L3X1 — Université Paris Cité  
Version architecture : v1.0  
Références : CDCF v1.0, Conception générale v1.0, Cahier de recette v1.0  

---

# 1. Objectif du projet

MEDISCAN AI est une application web de recherche d’images par le contenu (CBIR) en imagerie médicale.

L’utilisateur dépose une image requête et obtient un top-k d’images similaires issues d’un référentiel ROCOv2 filtré radiologie.

⚠️ Le système est strictement non clinique.
Aucun diagnostic, interprétation médicale ou recommandation ne doit être produit.

---

# 2. Architecture globale

Le système repose sur une architecture en couches :

Frontend (Présentation)
→ Interface web
→ Gestion états : chargement, succès, absence, erreur

Backend (FastAPI)
→ Validation des entrées
→ Orchestration du pipeline
→ Gestion des erreurs
→ Retour JSON structuré

Moteur IA
→ ResNet50 (RadImageNet)
→ Extraction embedding 2048-D
→ Normalisation L2

Pipeline offline
→ Extraction batch embeddings
→ Construction index FAISS (IndexFlatIP)
→ Stockage métadonnées MongoDB
→ Alignement ids

Mode d’exécution : CPU-only obligatoire.

---

# 3. Pipeline fonctionnel nominal

Requête utilisateur :

Image upload
→ Prétraitement (224x224 + normalisation)
→ Embedding (ResNet50)
→ Normalisation L2
→ Recherche top-k via FAISS
→ Récupération métadonnées MongoDB
→ Restitution top-k (rang + score)

---

# 4. Contraintes absolues (CDCF)

Ces règles ne doivent jamais être violées :

• Formats acceptés : JPEG, PNG uniquement  
• Paramètre k borné (max 50)  
• Aucune persistance durable de l’image requête  
• Aucune donnée patient / identifiante  
• Aucun contenu clinique généré  
• Fonctionnement garanti en CPU-only  
• Reproductibilité des résultats (même requête = même top-k)

---

# 5. Modules du projet

Structure logique attendue :

/presentation  
/api  
/ai  
/offline  
/common  

Ne pas mélanger logique métier et interface.

---

# 6. Règles pour les agents IA / Codex

Avant toute modification :

1. Vérifier que la modification respecte le CDCF.
2. Vérifier qu’elle ne casse pas la traçabilité recette.
3. Vérifier qu’elle ne viole aucune contrainte FC.

Interdictions :

- Ajouter un diagnostic médical
- Ajouter un stockage persistant non prévu
- Modifier la dimension des embeddings sans adapter FAISS
- Introduire dépendance GPU obligatoire
- Modifier le comportement top-k sans justification

---

# 7. Performance (critères recette)

Objectifs :

• tsearch ≤ 2s sur 10k images
• te2e ≤ 3s
• Stabilité max-min ≤ 20%
• Gain indexation ≥ 20% si FSC1 activée

Toute modification impactant la performance doit être mesurable.

---

# 8. Évolutions autorisées

Autorisées si compatibles CDCF :

• Amélioration structure code
• Refactoring interne
• Optimisation FAISS
• Logging amélioré
• Ajout tests unitaires
• Amélioration UX sans altérer logique métier

Évolutions conditionnelles :

• Recherche texte→image (FSC3)
• Filtrage métadonnées (FSO1)
• Comparaison côte à côte (FSO3)

---

# 9. Traçabilité

Toute évolution doit maintenir :

CDCF → UML → Implémentation → Recette

Les fonctions FS / FSC / FSO doivent rester identifiables.

---

# 10. Philosophie du projet

Architecture simple.
Séparation claire des responsabilités.
Reproductibilité.
Non-clinique.
CPU-only.
Maintenabilité.

---

Fin du document.