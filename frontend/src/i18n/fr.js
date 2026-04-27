/**
 * @fileoverview French interface translation dictionary for MediScan.
 * @module i18n/fr
 */

/**
 * French translations organized by application feature area.
 */
export const fr = {
  // Navigation
  nav: {
    home: "Accueil",
    scan: "Scanner & Chercher",
    contact: "Contact",
    startFree: "Scanner & Chercher",
    aboutUs: "À propos",
  },

  // Home Page
  home: {
    heroLabel: "RECHERCHE MÉDICALE GUIDÉE PAR IMAGE ET TEXTE",
    badge: "Analyse Médicale par IA",
    headline1: "Réduire l'incertitude.",
    headline2: "Accélérer le diagnostic.",
    description: "MEDISCAN vous permet d'explorer des examens médicaux en quelques secondes. Identifiez des cas similaires, accédez aux bons cas au bon moment.",
    cta1: "Scanner & Chercher",
    cta1Link: "/search",
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
      description: "Servir la santé et la recherche, image par image, pas à pas.",
      features: [
        {
          icon: "route",
          title: "Recherche Intelligente",
          desc: "Recherche par similarité visuelle ou sémantique dans un workflow rapide et lisible sur données radiologiques.",
        },
        {
          icon: "brain",
          title: "Soutien Diagnostique",
          desc: "Comparez des cas pertinents, soutenez l’interprétation et renforcez la confiance diagnostique.",
        },
        {
          icon: "blocks",
          title: "Infrastructure de Recherche Scalable",
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
      headline: "Deux entrées. Une seule mission.",
      description: "Commencez par une image ou une phrase clinique. MEDISCAN trouve ce qui compte.",
      rootLabel: "Recherche MEDISCAN",
      visual: {
        title: "Analyse Visuelle",
        items: ["Recherche par similarité visuelle"],
        desc: "Trouvez les images avec des structures anatomiques et des caractéristiques visuelles similaires.",
        use: "Utiliser quand : Anatomie comparative, correspondance morphologique, similarité structurelle.",
      },
      semantic: {
        title: "Analyse Interprétative",
        items: ["Recherche par similarité sémantique", "Recherche guidée par texte"],
        desc: "Découvrez les cas avec pathologie et signification clinique comparables.",
        use: "Utiliser quand : Découverte de maladie, raisonnement diagnostique, sélection basée sur les preuves.",
      },
      imageEntry: {
        badge: "ENTRÉE IMAGE",
        title: "Recherche par Glisser-Déposer",
        desc: "Déposez une image médicale, puis choisissez votre profondeur d'analyse. Deux modes, un seul dépôt.",
        visual: {
          label: "Analyse Visuelle",
          caption: "Forme · Structure · Texture",
        },
        semantic: {
          label: "Analyse Sémantique",
          caption: "Pathologie · Diagnostic · Sens",
        },
      },
      textEntry: {
        badge: "ENTRÉE TEXTE",
        title: "Recherche par Texte",
        desc: "Décrivez une anomalie ou un diagnostic. Langage naturel, précision clinique.",
        semantic: {
          label: "Recherche Sémantique",
          caption: "Clinique · Contextuelle · Directe",
        },
      },
    },

    hub: {
      headline: "Recherche médicale",
      description: "Choisissez l'approche la plus pertinente pour explorer des cas proches.",
      centerLabel: "Propulsé par",
      centerName: "MEDISCAN AI",
      cards: [
        {
          title: "Analyse Visuelle",
          desc: "Correspondance par forme anatomique, texture tissulaire et motifs structurels.",
        },
        {
          title: "Recherche Contextuelle",
          desc: "Remontez les cas avec une pathologie et une signification clinique comparables.",
        },
        {
          title: "Entrée par Image",
          desc: "Déposez n'importe quelle image DICOM ou médicale. Traitement instantané.",
        },
        {
          title: "Requête Textuelle",
          desc: "Décrivez un signe clinique en langage naturel. Obtenez des résultats classés sémantiquement.",
        },
        {
          title: "Analyse Interprétative",
          desc: "Recherche par image pour retrouver des cas médicalement et sémantiquement proches.",
        },
      ],
    },

    useCases: {
      headline: "Conçu pour les personnes s'intéressant au domaine médical",
      audience: "Personnel médical, étudiants en médecine, systèmes hospitaliers et centres de recherche.",
      inlineDescription: "",
      roles: [
        {
          icon: "stethoscope",
          title: "Personnel médical",
          desc: "Retrouvez plus vite des cas comparables et appuyez l'interprétation avec des données historiques pertinentes.",
        },
        {
          icon: "book",
          title: "Étudiants en médecine",
          desc: "Apprenez à partir de cas comparables et renforcez le raisonnement diagnostique avec des exemples concrets.",
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

    footer: {
      tagline: "Plateforme de recherche en imagerie médicale.",
      compliance: "Usage recherche uniquement · Non clinique",
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
      desc2: "BioMedCLIP fine-tuné sur ROCOv2 radiology",
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
      legendEyebrow: "Guide des modes d'analyse",
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
        title: "Filtres et relance multi-sélection",
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
      legendEyebrow: "Guide des modes d'analyse",
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
          label: "LÉGENDE ET CUI",
          title: "Retrouver un type de cas",
          description: "Le filtre légende cherche dans les descriptions déjà remontées. Les filtres CUI resserrent ensuite par modalité, anatomie ou pathologie, et la référence permet de retrouver un identifiant précis.",
          note: "Pratique pour passer d’une requête large à une sélection plus ciblée, en resserrant progressivement les résultats les plus utiles.",
        },
        score: {
          label: "SCORE ET TRI",
          title: "Garder les meilleurs résultats",
          description: "Le score minimum fixe un seuil de similarité : en l’augmentant, vous masquez les résultats les moins pertinents. Le tri Score ↓ affiche d’abord les correspondances les plus fortes, tandis que Score ↑ fait remonter les résultats les plus faibles parmi ceux qui restent.",
          note: "Augmentez le seuil pour une sélection plus stricte ; baissez-le pour élargir la liste.",
        },
        order: {
          label: "COMBINAISON",
          title: "Construire une lecture plus ciblée",
          description: "Le plus efficace est de combiner plusieurs filtres pour isoler rapidement le sous-ensemble utile.",
          note: "Exemple : mot-clé de légende + score minimum + anatomie, pour isoler plus vite un sous-ensemble réellement pertinent.",
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
      resultMetadataHint: "Les informations ci-dessous correspondent au résultat selectionné.",
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
    responseDesc: "Réponse sous 24h (jours ouvrés)",
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

  //About Page
  about: {
    headline: "À propos de MEDISCAN AI",
    eyebrow: "Notre but ?",
    description: "Faciliter l'exploration d'images médicales et l'interprétation assistée par IA.",
    missionVision: "Engagement & Vision",
    mission: {
      title: "Notre engagement",
      image: "/mission.png",
      image_d: "/mission_d.png",
      text: "Rendre la recherche d'images médicales accessible, rapide et utile pour ceux qui soignent, cherchent et apprennent.",
    },
    vision: {
      title: "Notre vision",
      image: "/goal.png",
      image_d: "/goal_d.png",
      text: "Un outil médical intelligent, éthique et conçu dans le respect des données patients.",
    },
    team: {
      title: "L’équipe",
      members: [
        { name: "Taouache Rayane", color: "semantic", photo : "/photo-rayane.jpeg", github: "https://github.com/RayaneWebDev" },
        { name: "Ozan Taskin",     color: "visual", photo : "/photo-ozan.jpeg", github: "https://github.com/OzanTaskin" },
        { name: "Ales Ferhani",    color: "semantic", photo : "/photo-ales.jpeg", github: "https://github.com/ales-frhn" },
        { name: "Maxime Huang",    color: "visual", photo : "/photo-maxime.jpeg", github: "https://github.com/Somixe" },
      ],
    },
    disclaimer: {
      note : "Remarque:",
      text: "Ce système est un outil d’assistance destiné aux professionnels de santé qualifiés. Il ne remplace pas le jugement clinique et n’est pas un dispositif médical certifié.",
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
      security: "Sécurité"
    },
    items: [
      // --- GENERAL ---
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

      { 
        category: "general", 
        q: "Quel jeu de données est utilisé ?", 
        r: "Le prototype utilise ROCO v2, un jeu de données public d'imagerie médicale (rayons X, scanners, IRM), filtré et annoté pour des expériences de recherche par similitude. La base contient environ 60 000 images stockées et servies depuis Hugging Face.",
        link: { 
          label: "En savoir plus sur ROCO v2", 
          url: "https://huggingface.co/datasets/eltorio/ROCO-radiology" 
        }
      },
      { 
        category: "general", 
        q: "Le projet est-il open source ?", 
        r: "Oui, le code source est disponible sur GitHub. Le projet est développé dans un cadre universitaire.",
        link: { 
          label: "Voir sur GitHub", 
          url: "https://github.com/MediscanAI-cbir/mediscan-cbir"
        }
      },
      
      // --- TECHNIQUE ---
      { 
        category: "technical",
        q: "Quelle est la différence entre la recherche 'Visuelle' et la recherche 'Interprétative' ?", 
        r: "La recherche visuelle se concentre sur la similarité structurelle de l'image. La recherche interprétative s'appuie sur un espace sémantique pour retrouver des cas dont la légende exprime un sens proche." 
      },

      { category: "technical", 
        q: "Quel modèle IA est utilisé pour la recherche visuelle ?", 
        r: "La recherche visuelle utilise DINOv2 (Meta AI), un Vision Transformer auto-supervisé entraîné sur 142 millions d'images. Il produit des embeddings de haute qualité pour la similarité visuelle sans nécessiter de fine-tuning.",
        link: { label: "En savoir plus sur DINOv2", url: "https://ai.meta.com/blog/dino-v2-computer-vision-self-supervised-learning/" }
      },

      { category: "technical", 
        q: "Quel modèle IA est utilisé pour la recherche sémantique et texte-image ?", 
        r: "La recherche interprétative utilise BiomedCLIP (Microsoft Research), un modèle entraîné sur 15 millions de paires image-texte médicales issues de PubMed Central. Il offre une représentation sémantique riche pour les images radiologiques.",
        link: { label: "En savoir plus sur BiomedCLIP", url: "https://www.microsoft.com/en-us/research/publication/biomedclip-a-multimodal-biomedical-foundation-model-pretrained-from-fifteen-million-scientific-image-text-pairs/" }
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

      // --- SECURITY ---
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
      },

      { 
        category: "security", 
        q: "Le jeu de données contient-il des données patients ?", 
        r: "Non. Le jeu de données d'images ne contient aucune donnée directement identifiable." 
      },
    ],
    contactTitle: "Vous avez encore des questions ?",
    contactBtn: "Contactez notre équipe"
  },

  // Features page
  features: {
    heroEyebrow: "Fonctionnalités",
    heroHeadline: "Des fonctionnalités claires pour des usages cliniques exigeants.",
    heroDescription: "MEDISCAN rassemble la recherche de cas similaires, la comparaison visuelle et la lecture des résultats dans une interface sobre, fiable et directement exploitable.",
    heroCta: "Accéder à la recherche",
    heroNote: "Un appui produit pour comparer, explorer et documenter des cas proches sans surpromesse.",
    heroPanelEyebrow: "Valeur produit",
    heroPanelCaption: "Usage professionnel",
    heroSignals: [
      {
        icon: "search",
        title: "Recherche immédiate",
        desc: "Lancer une recherche à partir d'une image de référence, sans friction inutile.",
      },
      {
        icon: "compare",
        title: "Comparaison lisible",
        desc: "Mettre rapidement en regard plusieurs cas proches pour gagner du temps à la lecture.",
      },
      {
        icon: "frame",
        title: "Cadre d'usage clair",
        desc: "Un outil d'appui conçu pour rester à sa juste place dans le workflow clinique.",
      },
    ],

    showcaseEyebrow: "Potentiels d'usage",
    showcaseHeadline: "Des fonctionnalités concrètes pour lire plus vite, avec plus de clarté.",
    showcaseDescription: "Des fonctionnalités claires pour trouver, comparer et exploiter des cas proches plus sereinement.",
    showcaseCards: [
      {
        icon: "visual",
        label: "Similarité visuelle",
        title: "Similarité visuelle",
        desc: "Retrouvez les radiographies, scanners et IRM les plus proches de votre cas, à partir de données d'imagerie réelles.",
        points: [
          "Données d'imagerie réelles",
          "Recherche par apparence visuelle",
        ],
      },
      {
        icon: "semantic",
        label: "Similarité sémantique",
        title: "Similarité sémantique",
        desc: "Identifiez les cas partageant le même contexte diagnostique à partir d'une description textuelle.",
        points: [
          "Index d'embeddings BioMedCLIP",
          "Recherche par sens clinique",
        ],
      },
      {
        icon: "upload",
        label: "Entrée image",
        title: "Upload image",
        desc: "Glissez-déposez une image ou sélectionnez un fichier pour lancer votre recherche.",
        points: [
          "Upload sécurisé en API",
          "Prise en charge image locale ou URL",
        ],
      },
      {
        icon: "text",
        label: "Requête texte",
        title: "Recherche texte",
        desc: "Saisissez une description ou collez un texte pour lancer votre recherche.",
        points: [
          "Entrée textuelle directe",
          "Recherche text-to-image",
        ],
      },
      {
        icon: "filter",
        label: "Filtre intelligent",
        title: "Filtre intelligent",
        desc: "Ciblez anatomie, modalité ou pathologie grâce à un vocabulaire médical structuré avec CUI, normes de similarité et suggestions intelligentes.",
        points: [
          "Filtrage par CUI et normes",
          "Suggestions contextuelles",
        ],
      },
      {
        icon: "relaunch",
        label: "Multi-relance",
        title: "Multi-relance",
        desc: "Relancez une recherche depuis un ou plusieurs résultats sélectionnés pour affiner l'exploration.",
        points: [
          "Endpoint search-by-id",
          "Endpoint search-by-ids",
        ],
      },
      {
        icon: "ai",
        label: "Synthèse IA",
        title: "Synthèse clinique IA",
        desc: "Générez une synthèse des cas similaires pour appuyer vos entretiens, votre triage et vos décisions médicales.",
        points: [
          "Analyse basée sur top résultats",
          "Intégration Groq configurable",
        ],
      },
      {
        icon: "api",
        label: "API stable",
        title: "API stable",
        desc: "Des endpoints robustes avec validation des entrées et des réponses cohérentes pour une intégration fiable.",
        points: [
          "Santé service monitorée",
          "Ressources chargées à la demande",
        ],
      },
    ],

    trustEyebrow: "Robustesse et sécurité",
    trustHeadline: "Un cadre d'usage conçu pour durer dans des environnements exigeants.",
    trustDescription: "La page met l'accent sur ce qu'un produit de ce type doit vraiment apporter : des résultats lisibles, un usage sécurisé, une confidentialité claire et une continuité d'utilisation sérieuse.",
    trustCalloutEyebrow: "Positionnement",
    trustCalloutTitle: "Un outil d'appui, pas un raccourci",
    trustCalloutDescription: "MEDISCAN aide à comparer, explorer et documenter des cas proches. L'interprétation et la décision clinique restent entre les mains des professionnels de santé.",
    trustCards: [
      {
        icon: "robust",
        title: "Robustesse des réponses",
        desc: "Présenter des résultats cohérents et ordonnés pour limiter les variations inutiles d'une recherche à l'autre.",
        detail: "Une expérience plus stable, donc plus simple à relire et à partager.",
      },
      {
        icon: "secure",
        title: "Sécurité des usages",
        desc: "Proposer un cadre de travail qui reste sobre dans ses promesses et respecte le rôle du professionnel de santé.",
        detail: "Le produit appuie la lecture de cas, sans se présenter comme un diagnostic.",
      },
      {
        icon: "privacy",
        title: "Confidentialité",
        desc: "Garder une approche claire de la gestion des données pour favoriser la confiance dans les contextes sensibles.",
        detail: "Une page qui met la discrétion et la maîtrise d'usage au premier plan.",
      },
      {
        icon: "continuity",
        title: "Continuité d'usage",
        desc: "Maintenir une interface lisible et régulière, y compris lorsque l'outil s'inscrit dans une routine clinique exigeante.",
        detail: "Une expérience pensée pour rester constante au quotidien.",
      },
    ],

    prevLabel: "Précédent",
    nextLabel: "Suivant",
    carouselLabel: "Carrousel des fonctionnalités produit",
    disclaimerLabel: "Cadre d'usage",
    disclaimer: "Outil d'assistance destiné aux professionnels de santé qualifiés. Ne remplace pas le jugement clinique et n'est pas présenté comme un dispositif de diagnostic.",
  },
  demos: {
    demoEyebrow: "Démos",
    tryLabel: "Tester",
    demoDescription: "Découvrez MediScan en action à travers des cas d'usage réels.",
    prevLabel: "Précédent",
    nextLabel: "Suivant",
    carouselLabel: "Carrousel de démos",
    demoCards: [
      { type: "image", srcs: ["/Visual_Dark1.png", "/Visual_Dark2.png"], alt: "Démo 1", label: "Similarité visuelle", desc: "Recherche d'examens similaires à partir d'une image de référence, par comparaison visuelle.", interval: 3500 },
      { type: "image", srcs: ["/Sem_Dark1.png", "/Sem_Dark2.png"], alt: "Démo 2", label: "Similarité sémantique", desc: "Recherche d'examens correspondants à partir d'une description textuelle en langage médical.", interval: 3500 },
      { type: "image", src: null, alt: "Démo texte", label: "Recherche textuelle", desc: "Exploration de cas proches à partir d'une requête clinique rédigée en texte libre.", interval: 3500 },
    ],
  },
};
