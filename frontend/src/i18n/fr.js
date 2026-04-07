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
    description: "Explorer des archives d'imagerie médicale par contenu visuel ou par description textuelle, retrouver des cas visuellement ou cliniquement apparentés, et soutenir l'interprétation par une recherche structurée de similarité.",
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
      description: "Plateforme d'IA d'imagerie conçu pour optimiser les workflows, la précision diagnostique et la recherche médicale par l'identification automatisée de cohortes.",
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
          desc: "Privé, léger en infrastructure, et prêt à s’intégrer au PACS, EMR et environnements de recherche.",
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
          desc: "MEDISCAN AI analyse les caractéristiques visuelles et cliniques instantanément.",
        },
        {
          num: "3",
          title: "Découvrir",
          desc: "Recevez les résultats classés avec scores de confiance et métadonnées cliniques.",
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
        { title: "Multi-Modal", desc: "Tous les types et modalités d'imagerie supportés" },
        { title: "Sécurisé", desc: "Sécurité et conformité de classe entreprise" },
        { title: "Analyse", desc: "Suivre les modèles d'utilisation et les résultats cliniques" },
        { title: "Accès API", desc: "Intégrer directement dans vos flux de travail" },
      ],
    },

    footer: {
      tagline: "L'IA au service du diagnostic.",
      compliance: "Conforme HIPAA · Sécurité Entreprise · ISO 27001 Certifié",
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
    footer: "Conforme HIPAA · Vos données restent privées · Aucune publicité",

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
          "Recherche par signification médicale — en anglais",
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
      legendTitle: "Ce que représente chaque mode d’analyse dans MEDISCAN AI",
      legendDescription: "Cette légende reste fixe : un mode lit la structure visible, l’autre lit la similarité médicalement pertinente.",
      legend: {
        visual: {
          label: "ANALYSE VISUELLE",
          title: "Similarité structurelle et anatomique",
          description: "Visual Analysis compare ce qui est directement visible dans l’image : formes, contours, textures, contrastes et organisation spatiale.",
          note: "À utiliser pour rechercher des images visuellement ou anatomiquement proches.",
        },
        interpretive: {
          label: "ANALYSE INTERPRÉTATIVE",
          title: "Similarité médicale et sémantique",
          description: "Interpretive Analysis va au-delà de l’apparence visuelle pour se concentrer sur le sens médical, les patterns pathologiques et la similarité sémantique.",
          note: "À utiliser pour retrouver des cas médicalement ou sémantiquement similaires.",
        },
      },
      readyStep: "3. Lancer la recherche",
      readyTitle: "Démarrer la recherche visuelle",
      readyDescription: "Importez une image médicale, choisissez le mode d’analyse, puis lancez la recherche pour faire remonter les cas les plus proches.",
      pendingStep: "3. Lancer l’analyse",
      pendingTitle: "Votre image est prête",
      pendingDescription: "Ajustez les paramètres d’analyse, puis cliquez sur Chercher pour retrouver les correspondances visuelles ou interprétatives les plus proches.",
    },

    text: {
      headline: "Recherche par texte médical",
      badge: "Analyse sémantique · Langage naturel",
      label: "Requête médicale",
      langNote: "en anglais",
      placeholder: "Ex : chest X-ray bilateral pneumonia...",
      back: "Retour",
      searching: "Analyse en cours...",
      error: "Une erreur est survenue.",
      step3: "Résultats",
    },
    filters: {
      minScore: "Score min.",
      caption: "Légende",
      captionPlaceholder: "Filtrer par légende...",
      sort: "Tri",
      sortDesc: "Score ↓",
      sortAsc: "Score ↑",
      compare: "Comparer",
      compareOn: "✓ Comparaison active",
      export: "Exporter",
    },
    results: {
      visualMode: "Visuel (DINOv2)",
      semanticMode: "Sémantique (BioMedCLIP)",
      textMode: "Texte (BioMedCLIP)",
      relaunchImage: "Rechercher depuis cette image",
      resultsFoundSingular: "résultat trouvé",
      resultsFoundPlural: "résultats trouvés",
      selectedCount: "images sélectionnées",
      clearSelection: "Annuler",
      relaunchSelection: "Rechercher depuis la sélection",
    },
  },

  // Contact Page
  contact: {
    headline: "Nous Contacter",
    description: "Une question, un bug ou juste envie de dire bonjour ? On lit chaque message.",
    supportLabel: "Support",
    supportDesc: "Pour toute question technique ou retour sur MediScan.",
    supportAddr: "support@mediscan.ai",
    responseLabel: "Temps de réponse",
    responseDesc: "Nous répondons généralement sous 24h les jours ouvrés.",
    sentTitle: "Brouillon d'email prêt",
    sentDesc: "Votre messagerie s'est ouverte avec un message prérempli pour l'équipe MEDISCAN.",
    sentAnother: "Préparer un autre email",
    formName: "Nom",
    formEmail: "Email",
    formSubject: "Objet",
    formSubjectPlaceholder: "De quoi s'agit-il ?",
    formMessage: "Message",
    formPlaceholder1: "Votre nom",
    formPlaceholder2: "votre@email.com",
    formPlaceholder4: "Comment pouvons-nous vous aider ?",
    formSubmit: "Envoyer",
    formPrivacy: "Vos informations ne seront jamais partagées.",
  },
  about: {
    headline: "À propos de MEDISCAN AI",
    description:
      "MEDISCAN AI est dédié à transformer l'analyse d'imagerie médicale grâce à l'IA de pointe et à l'expertise clinique.",
    mission: {
      title: "Notre Mission",
      text: "Rendre la recherche d'images médicales accessible et efficace — permettre aux cliniciens et chercheurs de retrouver des cas pertinents dans de grandes bases de données, à partir d'une image ou d'une description textuelle.",
    },
    vision: {
      title: "Notre Objectif",
      text: "Combler le fossé entre les archives d'images médicales brutes et la connaissance clinique exploitable, grâce à un système de recherche rapide et fiable fondé sur l'IA biomédicale de pointe.",
    },
    team: {
      title: "Rencontrez l'Équipe",
      members: [
        { name: "Dr. Sarah Johnson", role: "Directrice Médicale", photo: "" },
        { name: "Alex Martinez", role: "Ingénieur IA Principal", photo: "" },
        { name: "Emily Wong", role: "Chef de Produit", photo: "" },
        { name: "Michael Lee", role: "Designer UX", photo: "" },
      ],
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
    description: "Recherche d'images cliniques alimentée par l'IA avancée et le raisonnement clinique.",
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
            desc: "Combine les caractéristiques visuelles avec les connaissances anatomiques et cliniques.",
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
        desc: "Comprend le contexte clinique, la pathologie et la signification diagnostique.",
        steps: [
          {
            title: "Codage Biomédical",
            desc: "Modèles entraînés sur 100K+ images médicales annotées cliniquement.",
          },
          {
            title: "Raisonnement Interprétatif",
            desc: "Reconnaît les maladies, conditions et motifs cliniques.",
          },
          {
            title: "Alignement des Preuves",
            desc: "Associe les cas en fonction de la similarité clinique et de la valeur diagnostique.",
          },
          {
            title: "Notation de Confiance",
            desc: "Chaque résultat inclut la confiance clinique basée sur les données d'entraînement.",
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
    description: "Trouvez des réponses aux questions courantes sur la technologie et l'intégration de MEDISCAN AI.",
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
        r: "MEDISCAN AI est un moteur de recherche spécialisé conçu pour les cliniciens. Il leur permet de trouver des cas médicaux similaires dans de vastes bases de données en utilisant à la fois des caractéristiques visuelles et des métadonnées cliniques pour faciliter la prise de décision diagnostique." 
      },
      { 
        category: "general",
        q: "Qui peut utiliser la plateforme ?", 
        r: "La plateforme est conçue pour les radiologues, les pathologistes et les chercheurs médicaux qui ont besoin de comparer des cas actuels avec des données historiquement validées." 
      },
      { 
        category: "general",
        q: "S'agit-il d'un outil de diagnostic ?", 
        r: "Non, MEDISCAN AI est un outil d'aide à la décision. Il fournit des cas similaires et la littérature pertinente, mais la responsabilité diagnostique finale incombe exclusivement au professionnel de santé." 
      },
      
      // --- TECHNIQUE ---
      { 
        category: "technical",
        q: "Quelle est la différence entre la recherche 'Visuelle' et la recherche 'Interprétative' ?", 
        r: "La recherche visuelle (Signature Search) analyse les motifs de pixels pour trouver des formes et des textures similaires. La recherche clinique utilise l'IA pour comprendre la pathologie et trouver des cas ayant la même signification médicale, même s'ils semblent visuellement différents." 
      },
      { 
        category: "technical",
        q: "S'intègre-t-il aux systèmes PACS/DICOM existants ?", 
        r: "Oui, notre architecture 'API-first' supporte les standards DICOM pour une intégration fluide avec la plupart des systèmes d'archivage et de transmission d'images (PACS) hospitaliers." 
      },
      { 
        category: "technical",
        q: "Quelles modalités d'imagerie sont prises en charge ?", 
        r: "Actuellement, nous prenons en charge l'IRM, le scanner (TDM), la radiographie et la pathologie numérique. Nous élargissons constamment nos capacités à de nouvelles modalités grâce à notre framework d'IA agnostique." 
      },

      // --- SÉCURITÉ ---
      { 
        category: "security",
        q: "La plateforme est-elle conforme au RGPD et à la loi HIPAA ?", 
        r: "Absolument. Nous mettons en œuvre des mesures strictes de protection des données, garantissant que tout le traitement respecte les normes de santé internationales en matière de confidentialité et de sécurité." 
      },
      { 
        category: "security",
        q: "Où sont stockées les données médicales ?", 
        r: "Par défaut, MEDISCAN AI traite les images en mémoire (volatiles) et ne stocke pas d'informations d'identification personnelle (PII) sur nos serveurs de recherche sans un accord institutionnel explicite." 
      },
      { 
        category: "security",
        q: "Comment les données sont-elles cryptées ?", 
        r: "Toutes les données en transit sont protégées par un cryptage TLS 1.3, et toutes les données au repos sont sécurisées par un cryptage de grade militaire AES-256." 
      }
    ],
    contactTitle: "Vous avez encore des questions ?",
    contactBtn: "Contactez notre équipe"
  },
};
