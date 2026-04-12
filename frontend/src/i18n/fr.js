export const fr = {
  // Navigation
  nav: {
    home: "Accueil",
    scan: "Scanner & Chercher",
    features: "Fonctionnalités",
    contact: "Contact",
    startFree: "Scanner & Chercher",
    aboutUs: "À propos",
  },

  // Home Page
  home: {
    heroLabel: "IMAGE - TEXT GUIDED MEDICAL RETRIEVAL",
    badge: "Analyse Médicale par IA",
    headline1: "Réduire l'incertitude.",
    headline2: "Accélérer le diagnostic.",
    description: "Explorer des archives d'imagerie médicale par contenu visuel ou par description textuelle, retrouver des cas visuellement ou sémantiquement apparentés, et découvrir un prototype universitaire de CBIR via un workflow de similarité structuré.",
    cta1: "Scanner & Chercher",
    cta1Link: "/search",
    cta2Link: "/features",
    cta2: "En Savoir Plus",

    stats: {
      title1: "Cas Consultables",
      value1: "100K+",
      title2: "Temps de Recherche",
      value2: "< 2s",
      title3: "Précision Diagnostique",
      value3: "95%+",
      title4: "Support Interprétatif",
      value4: "24/7",
    },

    whyChoose: {
      headline: "Pourquoi MEDISCAN AI ?",
      description: "Prototype universitaire conçu pour explorer des workflows de recherche d'images médicales pour la démonstration, l'enseignement et l'expérimentation.",
      features: [
        {
          icon: "route",
          title: "Intelligent Retrieval",
          desc: "Recherche par similarité visuelle ou sémantique dans un workflow rapide et lisible sur données radiologiques.",
        },
        {
          icon: "brain",
          title: "Diagnostic Support",
          desc: "Comparez des cas pertinents, soutenez l’interprétation et renforcez la confiance diagnostique.",
        },
        {
          icon: "blocks",
          title: "Scalable Research Infrastructure",
          desc: "Fonctionne localement avec une pile FastAPI plus React simple et un enrichissement de métadonnées optionnel.",
        },
      ],
    },

    howWorks: {
      headline: "Comment Ça Marche",
      description: "Trois étapes intuitives pour déverrouiller votre archive d'images médicales.",
      steps: [
        {
          num: "1",
          title: "Télécharger",
          desc: "Sélectionnez une image médicale de votre archive ou téléchargez un nouveau cas.",
        },
        {
          num: "2",
          title: "Analyser",
          desc: "MEDISCAN indexe instantanément des caractéristiques visuelles et sémantiques.",
        },
        {
          num: "3",
          title: "Découvrir",
          desc: "Recevez des résultats similaires classés avec scores et métadonnées disponibles.",
        },
      ],
    },

    modes: {
      headline: "Deux modes de recherche complementaires",
      description: "Une voie visuelle pour la similarite structurelle et une voie interpretative pour l'exploration de cas cliniquement pertinents.",
      rootLabel: "Recherche MEDISCAN",
      visual: {
        title: "Analyse Visuelle",
        items: [
          "Recherche par similarité visuelle",
        ],
        desc: "Trouvez les images avec des structures anatomiques et des caractéristiques visuelles similaires.",
        use: "Utiliser quand : Anatomie comparative, correspondance morphologique, similarité structurelle.",
      },
      semantic: {
        title: "Analyse Interprétative",
        items: [
          "Recherche par similarité sémantique",
          "Recherche guidée par texte",
        ],
        desc: "Découvrez les cas avec pathologie et signification clinique comparables.",
        use: "Utiliser quand : Découverte de maladie, raisonnement diagnostique, sélection basée sur les preuves.",
      },
    },

    useCases: {
      headline: "Conçu pour les Professionnels de Santé",
      audience: "Radiologues, anatomopathologistes, systèmes hospitaliers et centres de recherche.",
      inlineDescription: "Retrouvez des cas antérieurs, comparez des spécimens similaires, réduisez les examens redondants et accélérez l’identification de cohortes dans un même workflow.",
      roles: [
        {
          icon: "stethoscope",
          title: "Radiologues",
          desc: "Trouvez instantanément des cas antérieurs. Renforcez la confiance diagnostique grâce aux données historiques.",
        },
        {
          icon: "microscope",
          title: "Anatomopathologistes",
          desc: "Explorez des spécimens et des échantillons tissulaires comparables dans votre référentiel.",
        },
        {
          icon: "hospital",
          title: "Systèmes Hospitaliers",
          desc: "Réduisez les examens d’imagerie redondants. Améliorez l’efficacité clinique et les résultats.",
        },
        {
          icon: "search",
          title: "Centres de Recherche",
          desc: "Accélérez les études en identifiant rapidement les cohortes de patients pertinentes.",
        },
      ],
    },

    features: {
      headline: "Fonctionnalités Puissantes",
      list: [
        { title: "Vitesse Éclair", desc: "Latence inférieure à la seconde sur des millions d'images" },
        { title: "Intelligence Interprétative", desc: "IA entraînée sur des ensembles de données médicales annotées" },
        { title: "Recherche Duale", desc: "Modes de recherche visuel et sémantique sur le même jeu de données" },
        { title: "Prototype de Recherche", desc: "Conçu pour la démonstration, l'expérimentation et la lecture du code" },
        { title: "Export des Résultats", desc: "Exporter les résultats visibles en JSON, CSV ou PDF" },
        { title: "API Ouverte", desc: "Endpoints REST simples pour intégrations locales et tests" },
      ],
    },

    footer: {
      tagline: "Prototype universitaire de recherche d'images médicales.",
      compliance: "Prototype universitaire · Non clinique · Démo locale",
      contact: "Contactez-nous",
      rights: "Tous droits réservés.",
      privacy : "Confidentialité",
      terms: "Mentions légales",
      aboutus: "À propos",
      navigationTitle: "Navigation",
      supportTitle: "Support",
      legalTitle: "Mentions légales",
      connectTitle: "Liens",
      builtWith: "Construit avec",
      documentation: "Documentation",
      faq: "FAQ",
    },
  },

  // Search Page
  search: {
    headline: "Scanner & Chercher des Images Médicales",
    description: "Téléchargez une image médicale et découvrez les cas similaires instantanément.",
    step1: "1. Télécharger l'Image",
    step1Desc: "Format JPEG ou PNG",
    step2: "2. Choisir le Mode d'Analyse",
    step3: "3. Voir les Résultats",
    searching: "Analyse de votre image...",
    error: "Erreur de connexion au serveur.",
    analysisMode: "Mode d'analyse",
    modeVisual: "Analyse Visuelle",
    modeSemantic: "Analyse Interprétative",
    numResults: "Résultats",
    search: "Chercher",
    howWorks: "Deux Modes d'Analyse",
    visual: {
      name: "Analyse Visuelle",
      icon: "search",
      desc: "Trouvez les images avec une apparence et une structure visuelles similaires.",
      use: "Utiliser quand : Chercher des cas anatomiquement similaires",
    },
    semantic: {
      name: "Analyse Interprétative",
      icon: "hospital",
      desc: "Trouvez les cas avec une signification clinique et une pathologie similaires.",
      use: "Utiliser quand : Chercher des maladies ou conditions cliniques spécifiques",
    },
    highlights: {
      title1: "Résultats Instantanés",
      desc1: "< 1 seconde de temps de recherche",
      title2: "Interprétativement Pertinent",
      desc2: "IA entraînée sur des ensembles de données médicales",
      title3: "Complètement Gratuit",
      desc3: "Aucune inscription, aucune limite",
    },
    footer: "Prototype universitaire · Synthèse non clinique · Sans inscription",

    hub: {
      badge: "Moteur de recherche d'images médicales",
      headline: "Recherche médicale",
      description: "Choisissez votre type de recherche.",
      imageCard: {
        title: "Recherche visuelle",
        subtitle: "Analyse visuelle & sémantique",
        desc: "Importez une radiographie ou image médicale pour retrouver les cas les plus proches dans la base.",
        features: [
          "Analyse des structures visuelles",
          "Comparaison sémantique des images",
        ],
        cta: "Analyser une image",
      },
      textCard: {
        title: "Recherche guidée par texte",
        subtitle: "Recherche en langage naturel",
        desc: "Décrivez un cas médical en anglais et retrouvez les images correspondantes par signification médicale.",
        features: [
          "Recherche par signification médicale",
          "Résultats sémantiquement pertinents",
        ],
        cta: "Décrire un cas",
      },
      choose: {
        title: "Quelle approche choisir ?",
        imageLabel: "Par image — si vous :",
        imageItems: [
          "Avez une radiographie ou un scan à analyser",
          "Cherchez des cas visuellement similaires",
          "Voulez comparer des structures anatomiques",
        ],
        textLabel: "Par description — si vous :",
        textItems: [
          "N'avez pas d'image disponible",
          "Connaissez le diagnostic ou la pathologie",
          "Voulez explorer un concept médical",
        ],
      },
    },

    image: {
      headline: "Recherche par image",
      back: "Retour",
      invalidFileType: "Seuls les fichiers JPEG et PNG sont acceptés.",
      uploadPrompt: "Glissez une image ici ou",
      browseAction: "parcourir",
      acceptedFormats: "JPEG ou PNG uniquement",
      previewAlt: "Aperçu de l'image sélectionnée",
      legendEyebrow: "À lire",
      legendTitle: "Choisir le bon mode d’analyse selon votre objectif",
      legendDescription: "Les deux modes n’ont pas la même utilité : l’un aide à comparer rapidement ce que vous voyez dans l’image, l’autre aide à retrouver des cas proches par leur sens médical. Utilisez cette note pour choisir le mode le plus pertinent avant de lancer la recherche.",
      legend: {
        visual: {
          label: "ANALYSE VISUELLE",
          title: "Similarité structurelle et anatomique",
          description: "L’analyse visuelle est le bon choix quand vous partez d’une image et que vous voulez retrouver des cas qui se ressemblent à l’écran. Elle met l’accent sur l’apparence globale, les structures visibles et les ressemblances anatomiques.",
          note: "Utile pour comparer rapidement une radio, retrouver des images au rendu proche, ou vérifier si un cas ressemble visuellement à d’autres exemples de la base.",
        },
        interpretive: {
          label: "ANALYSE INTERPRÉTATIVE",
          title: "Similarité médicale et sémantique",
          description: "L’analyse interprétative est plus utile quand votre objectif est de retrouver des cas pertinents pour la lecture du cas, même si leur apparence n’est pas strictement identique. Elle privilégie la proximité de sens et la pertinence clinique.",
          note: "Utile pour explorer des cas proches dans leur intention diagnostique, élargir la recherche à des exemples médicalement pertinents, ou privilégier l’utilité clinique plutôt que la simple ressemblance visuelle.",
        },
      },
      detailStep: "3. Détails",
      readyStep: "3. Lancer la recherche",
      readyTitle: "Démarrer la recherche visuelle",
      readyDescription: "Importez une image médicale, choisissez le mode d’analyse, puis lancez la recherche pour faire remonter les cas les plus proches.",
      pendingStep: "3. Lancer l’analyse",
      pendingTitle: "Votre image est prête",
      pendingDescription: "Ajustez les paramètres d’analyse, puis cliquez sur Chercher pour retrouver les correspondances visuelles ou interprétatives les plus proches.",
      modeChangeConfirm: "Changer de mode supprimera les résultats actuels. Vous devrez relancer la recherche.",
      modeChangeConfirmAction: "Continuer",
      modeChangeCancel: "Annuler",
      modeInfoLabel: "Voir l’aide rapide sur les modes d’analyse",
      selectionGuide: {
        label: "COMBINAISON",
        title: "Combiner filtres et relance multi-sélection",
        description: "Les filtres servent à resserrer la liste visible. La relance multi-sélection permet ensuite de repartir d’un petit groupe d’images déjà pertinentes pour lancer une nouvelle recherche plus ciblée.",
        note: "Exemple : légende + score minimum pour isoler quelques cas, puis relance multi-sélection pour explorer des voisins encore plus proches.",
      },
    },

    text: {
      headline: "Recherche par texte médical",
      badge: "Analyse interprétative · Langage naturel",
      label: "Requête médicale",
      langNote: "en anglais",
      placeholder: "Ex : chest X-ray bilateral pneumonia...",
      back: "Retour",
      searching: "Analyse en cours...",
      error: "Une erreur est survenue.",
      step1: "1. Requête médicale",
      step1Desc: "Formulation médicale · Anglais",
      step2: "2. Choisir le nombre de résultats",
      step3: "Résultats",
      readyStep: "3. Lancer la recherche",
      pendingStep: "3. Lancer l'analyse",
      emptyStep: "3. Lancer la recherche",
      readyTitle: "Démarrer la recherche interprétative",
      readyDescription: "Saisissez une description médicale en anglais, puis lancez la recherche pour retrouver les images dont les légendes correspondent le mieux sur le plan clinique.",
      pendingTitle: "Votre requête est prête",
      pendingDescription: "Ajustez le nombre de résultats, puis cliquez sur Chercher pour retrouver les correspondances interprétatives les plus proches.",
      modeInfoLabel: "Voir l’aide rapide sur l’analyse interprétative",
      legendEyebrow: "À lire",
      legendTitle: "Comprendre l’analyse interprétative guidée par texte",
      legendDescription: "Ici, la recherche ne part pas d’une image mais d’une description médicale. MediScan rapproche votre requête en anglais des légendes cliniques indexées pour retrouver des cas proches par leur sens médical, pas uniquement par leur apparence visuelle.",
      legend: {
        interpretive: {
          label: "ANALYSE INTERPRÉTATIVE",
          title: "Recherche par sens médical",
          description: "La requête texte compare vos mots aux légendes et aux concepts cliniques associés pour faire remonter des cas proches dans leur signification médicale.",
          note: "À utiliser quand vous partez d’une hypothèse, d’un diagnostic, d’un finding radiologique ou d’une formulation clinique précise.",
        },
        writing: {
          label: "FORMULATION",
          title: "Décrire le cas de façon utile",
          description: "Privilégiez une formulation courte et structurée en anglais : modalité, région anatomique, findings principaux et contexte clinique utile. Exemple : chest X-ray with bilateral lower lobe opacities.",
          note: "Les requêtes trop vagues élargissent beaucoup les résultats ; les requêtes trop longues diluent souvent les signaux importants.",
        },
      },
      quickNoteEyebrow: "À lire",
      quickNoteTitle: "Recherche guidée par texte",
      quickNoteDescription: "Décrivez des observations en anglais pour interroger l'index sémantique.",
      quickNoteChip: "Analyse interprétative",
      quickNoteBody: "Utilisez une formulation médicale concise pour retrouver des images dont les légendes expriment des constats ou pathologies similaires.",
      quickNoteExample: "Ex : chest X-ray bilateral pneumonia",
    },
    conclusion: {
      title: "Synthèse IA",
      copy: "Copier",
      collapse: "Réduire",
      expand: "Développer",
      disclaimer: "Résumé de recherche uniquement. Ne remplace ni un jugement médical ni un diagnostic.",
      generate: "Générer la synthèse",
      loading: "Génération de la synthèse...",
      regenerate: "Générer à nouveau",
      error: "Impossible de générer la synthèse pour le moment.",
      noResults: "Lancez une recherche avant de demander une synthèse.",
    },
    filters: {
      title: "Filtres",
      refineHint: "Affinez les résultats visibles de votre recherche texte sans quitter la page.",
      infoLabel: "Voir l’aide sur les filtres de recherche texte",
      reset: "Réinitialiser",
      minScore: "Score min.",
      caption: "Légende",
      captionPlaceholder: "Filtrer par légende...",
      quickTerms: "Mots suggérés",
      quickTermsHint: "Cliquez pour affiner",
      cui: "Code CUI",
      cuiPlaceholder: "Ex. C0018799",
      cuiPresence: "Présence CUI",
      all: "Tous",
      withCui: "Avec CUI",
      withoutCui: "Sans CUI",
      cuiTypesTitle: "Filtres par type CUI",
      cuiModalite: "Modalité",
      cuiAnatomie: "Anatomie",
      cuiFinding: "Pathologie / Finding",
      cuiTypeAll: "Tous",
      sort: "Tri",
      sortDesc: "Score ↓",
      sortAsc: "Score ↑",
      reference: "Référence image",
      referencePlaceholder: "Ex. ROCO_000123",
      referenceHint: "Retrouvez une image précise à partir de son identifiant.",
      guide: {
        eyebrow: "Aide filtres",
        title: "Affiner les résultats de votre recherche par texte",
        description: "Les filtres agissent sur la liste déjà trouvée. Ils affinent l’affichage sans relancer la recherche.",
        caption: {
          label: "LÉGENDE, CUI ET RÉFÉRENCE",
          title: "Retrouver un type de cas dans les résultats textuels",
          description: "Le filtre légende cherche dans les descriptions déjà remontées. Les filtres CUI resserrent ensuite par modalité, anatomie ou pathologie, et la référence permet de retrouver un identifiant précis.",
          note: "Pratique pour passer d’une requête large à une sélection plus ciblée.",
        },
        score: {
          label: "SCORE ET TRI",
          title: "Garder les correspondances les plus proches de votre texte",
          description: "Le score minimum retire les résultats les moins proches de votre description. Score ↓ garde les meilleurs en tête ; score ↑ montre les cas plus limites.",
          note: "Montez le seuil si vous voulez une liste plus stricte.",
        },
        order: {
          label: "COMBINAISON",
          title: "Construire une lecture plus ciblée",
          description: "Le plus efficace est de combiner plusieurs filtres pour isoler rapidement le sous-ensemble utile.",
          note: "Exemple : mot-clé de légende + score minimum + anatomie.",
        },
      },
      compare: "Comparer",
      compareOn: "✓ Comparaison active",
      export: "Exporter",
    },
    results: {
      visualMode: "Analyse visuelle",
      semanticMode: "Analyse interprétative",
      textMode: "Recherche texte",
      relaunchImage: "Rechercher depuis cette image",
      compareAction: "Compare",
      closeCompare: "Fermer la comparaison",
      compareTitle: "Comparaison",
      queryImageLabel: "Image requete",
      selectedImageLabel: "Resultat correspondant",
      resultMetadataHint: "Les informations ci-dessous correspondent au resultat selectionne.",
      resultCaptionLabel: "Caption du resultat",
      resultScoreLabel: "Score du resultat",
      resultCuiLabel: "Code CUI du resultat",
      openDetails: "Voir l'image en grand",
      closeDetails: "Fermer la fenêtre de détail",
      downloadImage: "Télécharger l'image",
      detailsTitle: "Détails du résultat",
      paginationLabel: "Pagination des résultats",
      pageLabel: "Page",
      previousPage: "Précédent",
      nextPage: "Suivant",
      captionLabel: "Légende complète",
      scoreLabel: "Score",
      rawScoreLabel: "Score brut",
      rankLabel: "Rang",
      identifierLabel: "Référence",
      cuiLabel: "Code CUI",
      noCaption: "Aucune légende disponible pour cette image.",
      notAvailable: "Non disponible",
      resultsFoundSingular: "résultat trouvé",
      resultsFoundPlural: "résultats trouvés",
      selectedCount: "images sélectionnées",
      selectedImageSingular: "image sélectionnée",
      selectedImagePlural: "images sélectionnées",
      selectionPanelTitle: "Relance multi-sélection",
      selectionHelpLabel: "Voir l’aide sur la relance multi-sélection",
      selectionSummaryEmpty: "Aucune image sélectionnée",
      selectionHint: "Cochez une ou plusieurs cartes résultat pour composer une nouvelle recherche à partir d’un petit groupe d’images.",
      selectionReadySingle: "La sélection est prête pour relancer la recherche à partir d’une image de référence.",
      selectionReadyPlural: "La sélection est prête pour relancer la recherche à partir de plusieurs images de référence.",
      removeSelectedImage: "Retirer cette image de la sélection",
      selectionExpand: "Développer la relance multi-sélection",
      selectionCollapse: "Réduire la relance multi-sélection",
      clearSelection: "Vider la sélection",
      relaunchSelection: "Rechercher depuis la sélection",
      selectionSearchSingle: "Rechercher depuis l'image",
      selectionSearchPlural: "Rechercher depuis les images",
    },
  },

  // Contact Page
  contact: {
    headline: "Nous Contacter",
    description: "Une question, un bug ou juste envie de dire bonjour ? On lit chaque message.",
    supportLabel: "Support",
    supportDesc: "Pour toute question technique ou retour sur MediScan.",
    supportAddr: "mediscanaisupport@gmail.com",
    responseLabel: "Temps de réponse",
    responseDesc: "Nous répondons généralement sous 24h les jours ouvrés.",
    sentTitle: "Message envoyé",
    sentDesc: "Votre message a bien été transmis à l'équipe MEDISCAN. Nous revenons vers vous rapidement.",
    sentAnother: "Envoyer un autre message",
    formName: "Nom",
    formEmail: "Email",
    formSubject: "Objet",
    formSubjectPlaceholder: "De quoi s'agit-il ?",
    formMessage: "Message",
    formPlaceholder1: "Votre nom",
    formPlaceholder2: "votre@email.com",
    formPlaceholder4: "Comment pouvons-nous vous aider ?",
    formSubmit: "Envoyer",
    formSending: "Envoi en cours...",
    formPrivacy: "Vos informations ne seront jamais partagées.",
    errorGeneric: "Impossible d'envoyer votre message pour le moment. Merci de réessayer plus tard.",
  },
  about: {
    headline: "À propos de MEDISCAN AI",
    description:
      "MEDISCAN AI est un prototype universitaire centré sur la recherche d'images médicales, l'expérimentation rapide et la transparence du code.",
    mission: {
      title: "Notre Mission",
      text: "Rendre la recherche d'images médicales accessible et efficace — permettre aux cliniciens et chercheurs de retrouver des cas pertinents dans de grandes bases de données, à partir d'une image ou d'une description textuelle.",
    },
    vision: {
      title: "Notre Objectif",
      text: "Réduire l'écart entre des archives d'images médicales brutes et des expérimentations concrètes de recherche grâce à une pile biomédicale rapide et compréhensible.",
    },
    team: {
      title: "Rencontrez l'Équipe",
      members: [],
    },
    cta: {
      title: "Vous voulez en savoir plus ?",
      description: "Contactez notre équipe et découvrez comment MEDISCAN AI peut aider votre organisation.",
      buttonText: "Nous Contacter",
    },
  },

  // How It Works
  howItWorks: {
    headline: "Comment Fonctionne MEDISCAN AI",
    description: "Recherche d'images médicales alimentée par des embeddings visuels et sémantiques.",
    pipeline: {
      title: "Le Pipeline de Recherche",
      steps: [
        { label: "Image Interprétative", icon: "📋" },
        { label: "Analyse IA", icon: "⚙️" },
        { label: "Extraction de Caractéristiques", icon: "📊" },
        { label: "Index Interprétatif", icon: "🗄️" },
        { label: "Meilleurs Résultats", icon: "✅" },
      ],
    },
    modes: {
      title: "Deux Approches d'Analyse Complémentaires",
      visual: {
        name: "Analyse Visuelle",
        model: "Codage Visuel Avancé",
        desc: "Analyse les structures visuelles, les motifs et les caractéristiques morphologiques.",
        steps: [
          {
            title: "Extraction de Caractéristiques Visuelles",
            desc: "Les modèles d'apprentissage profond extraient les motifs visuels significatifs.",
          },
          {
            title: "Intégration du Contexte Interprétatif",
            desc: "Compare les caractéristiques visuelles à celles du jeu de données indexé.",
          },
          {
            title: "Notation de Similarité",
            desc: "Classe les images par similarité visuelle et structurelle.",
          },
          {
            title: "Classement des Résultats",
            desc: "Retourne les cas anatomiquement et visuellement similaires.",
          },
        ],
      },
      semantic: {
        name: "Analyse Interprétative",
        model: "Modèle de Langage Biomédical",
        desc: "Aligne les légendes d'images et les requêtes texte dans un espace d'embedding biomédical.",
        steps: [
          {
            title: "Codage Biomédical",
            desc: "Les embeddings sont produits par un modèle biomédical configuré dans le projet.",
          },
          {
            title: "Raisonnement Interprétatif",
            desc: "Capture des relations sémantiques exprimées dans les légendes et les requêtes texte.",
          },
          {
            title: "Alignement des Preuves",
            desc: "Associe les cas selon leur similarité sémantique dans un espace d'embedding partagé.",
          },
          {
            title: "Notation de Confiance",
            desc: "Chaque résultat inclut un score de similarité, pas une confiance médicale calibrée.",
          },
        ],
      },
    },
    when: {
      title: "Choisir le Bon Mode d'Analyse",
      visual: {
        title: "Utiliser l'Analyse Visuelle quand :",
        cases: [
          "Vous avez besoin de cas anatomiquement similaires",
          "Comparer l'imagerie dans la même modalité",
          "Vous cherchez des motifs structurels ou des caractéristiques morphologiques",
        ],
      },
      semantic: {
        title: "Utiliser l'Analyse Interprétative quand :",
        cases: [
          "Vous recherchez un diagnostic ou une condition spécifique",
          "Les images proviennent de modalités ou de sources différentes",
          "La signification clinique compte plus que l'apparence",
        ],
      },
    },
  },

  // FAQ
  faq: {
    headline: "Questions Fréquentes",
    description: "Trouvez des réponses sur le prototype actuel, son périmètre et ses limites.",
    categories: {
      general: "Général",
      technical: "Technique",
      security: "Sécurité et Confidentialité"
    },
    items: [
      // --- GÉNÉRAL ---
      { 
        category: "general",
        q: "Quel est l'objectif principal de MEDISCAN AI ?", 
        r: "MEDISCAN AI est un prototype universitaire de recherche d'images médicales. Il permet d'explorer des cas visuellement ou sémantiquement similaires dans un jeu de données, sans constituer un système de décision clinique." 
      },
      { 
        category: "general",
        q: "Qui peut utiliser la plateforme ?", 
        r: "La version actuelle est surtout adaptée aux démonstrations, projets étudiants, explorations techniques et prototypes de recherche autour de la recherche d'images médicales." 
      },
      { 
        category: "general",
        q: "S'agit-il d'un outil de diagnostic ?", 
        r: "Non. C'est un prototype non clinique qui retourne des cas similaires et des synthèses IA optionnelles à titre exploratoire uniquement." 
      },
      
      // --- TECHNIQUE ---
      { 
        category: "technical",
        q: "Quelle est la différence entre la recherche 'Visuelle' et la recherche 'Interprétative' ?", 
        r: "La recherche visuelle se concentre sur la similarité structurelle de l'image. La recherche interprétative s'appuie sur un espace sémantique pour retrouver des cas dont la légende exprime un sens proche." 
      },
      { 
        category: "technical",
        q: "S'intègre-t-il aux systèmes PACS/DICOM existants ?", 
        r: "Pas dans la version actuelle. Le prototype expose une API REST simple et fonctionne avec des entrées JPEG/PNG, mais n'intègre pas PACS/DICOM nativement." 
      },
      { 
        category: "technical",
        q: "Quelles modalités d'imagerie sont prises en charge ?", 
        r: "Le prototype s'appuie sur un jeu de données de recherche et accepte des uploads JPEG/PNG via l'interface. L'ingestion DICOM et une couverture complète des modalités ne sont pas implémentées ici." 
      },

      // --- SÉCURITÉ ---
      { 
        category: "security",
        q: "La plateforme est-elle conforme au RGPD et à la loi HIPAA ?", 
        r: "Pas par défaut. La conformité dépend de la façon dont le projet est déployé, hébergé, sécurisé et gouverné. Ce dépôt doit être considéré comme un prototype non clinique." 
      },
      { 
        category: "security",
        q: "Où sont stockées les données médicales ?", 
        r: "Les fichiers envoyés sont traités par le backend pour la recherche, tandis que les images de résultats proviennent d'un jeu de données public hébergé sur Hugging Face. L'enrichissement MongoDB reste optionnel et dépend de votre environnement." 
      },
      { 
        category: "security",
        q: "Comment les données sont-elles cryptées ?", 
        r: "Le chiffrement dépend de votre déploiement. Un environnement local de développement ne garantit pas à lui seul TLS, stockage chiffré ou hébergement conforme." 
      }
    ],
    contactTitle: "Vous avez encore des questions ?",
    contactBtn: "Contactez notre équipe"
  },
};
