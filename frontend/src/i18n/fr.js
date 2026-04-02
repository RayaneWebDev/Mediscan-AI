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
    badge: "Analyse Médicale par IA",
    headline1: "Réduire l'incertitude.",
    headline2: "Accélérer le diagnostic.",
    description: "Déverrouiller les archives visuelles de la médecine avec MEDISCAN AI. Rechercher par contenu, trouver des cas similaires instantanément, et élever la précision clinique.",
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
          title: "Flux de Travail Rapide et Intuitif",
          desc: "Ajoutez une image, choisissez un mode de recherche et explorez des cas similaires.",
        },
        {
          icon: "between-horizontal-start",
          title: "Explorer Sous Différents Angles",
          desc: "Utilisez un mode pour trouver des images visuellement proches, et un autre pour découvrir des cas médicaux apparentés.",
        },
        {
          icon: "brain",
          title: "Support Multi-Modalités",
          desc: "Permet la recherche sur différents types d’images radiologiques au sein d’un système structuré unique.",
        },
        {
          icon: "user-key",
          title: "Vos Images Restent Privées",
          desc: "Les images de recherche ne sont pas stockées de manière permanente et sont utilisées uniquement pendant la requête.",
        },
        {
          icon: "hard-drive",
          title: "Aucun Matériel Spécialisé Requis",
          desc: "Fonctionne sans matériel spécialisé, ce qui rend la plateforme plus accessible et plus simple à utiliser.",
        },
        {
          icon: "blocks",
          title: "Intégration Transparente",
          desc: "Fonctionne avec votre PACS, EMR et infrastructure hospitalière. Conception API-first.",
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
      headline: "Deux Modes d'Analyse Intelligents",
      description: "Choisissez l'approche qui correspond à votre question clinique.",
      visual: {
        title: "Analyse Visuelle",
        desc: "Trouvez les images avec des structures anatomiques et des caractéristiques visuelles similaires.",
        use: "Utiliser quand : Anatomie comparative, correspondance morphologique, similarité structurelle.",
      },
      semantic: {
        title: "Analyse Interprétative",
        desc: "Découvrez les cas avec pathologie et signification clinique comparables.",
        use: "Utiliser quand : Découverte de maladie, raisonnement diagnostique, sélection basée sur les preuves.",
      },
    },

    useCases: {
      headline: "Conçu pour les Professionnels de Santé",
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
        title: "Par l'image",
        subtitle: "Analyse visuelle & sémantique",
        desc: "Importez une radiographie ou image médicale pour retrouver les cas les plus proches dans la base.",
        features: [
          "Analyse des structures visuelles",
          "Comparaison sémantique des images",
          "Résultats classés par similarité",
        ],
        cta: "Analyser une image",
      },
      textCard: {
        title: "Par description",
        subtitle: "Recherche en langage naturel",
        desc: "Décrivez un cas médical en anglais et retrouvez les images correspondantes par signification médicale.",
        features: [
          "Recherche par signification médicale",
          "Langage naturel — en anglais",
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
  },

  // Features Page
  features: {
    headline: "Fonctionnalités Puissantes",
    description: "Tout ce qu’il faut pour l’analyse et l’exploration d’images de grade clinique.",
    items: [
      {
        title: "Recherche en Moins d’une Seconde",
        desc: "Interrogez des millions d’images en moins d’une seconde. Optimisé pour les workflows cliniques.",
        features: ["Latence sub-milliseconde", "Indexation distribuée", "Mises à jour en temps réel"],
      },
      {
        title: "Support Multi-Modalités",
        desc: "Fonctionne sur tous les principaux types d’imagerie — TDM, IRM, radiographie, échographie, anatomopathologie.",
        features: ["10+ modalités d’imagerie", "Recherche intermodalités", "Agnostique au format"],
      },
      {
        title: "Validation Interprétative",
        desc: "IA entraînée sur plus de 100K images médicales annotées cliniquement issues d’ensembles de données évalués par les pairs.",
        features: ["Modèles IA biomédicaux", "Scores de confiance cliniques", "Étayé par des preuves"],
      },
      {
        title: "Sécurité Entreprise",
        desc: "Conforme HIPAA. Déploiement sur site ou dans le cloud. Vos données restent sous votre contrôle.",
        features: ["Conformité HIPAA", "Chiffrement de bout en bout", "Journalisation d’audit"],
      },
      {
        title: "Intégration PACS & EMR",
        desc: "Intégration fluide avec l’infrastructure hospitalière existante. Sans disruption.",
        features: ["Support DICOM", "API REST", "Flux de travail personnalisés"],
      },
      {
        title: "Analyses Avancées",
        desc: "Suivez l’utilisation, mesurez l’impact et tirez des enseignements des schémas de recherche.",
        features: ["Analyses de recherche", "Métriques de résultats", "Tableaux de bord d’utilisation"],
      },
    ],
  },

  // Contact Page
  contact: {
    headline: "Nous Contacter",
    description: "Vous avez des questions ? Notre équipe clinique et technique est là pour vous aider.",
    email: "Email",
    sales: "Ventes",
    support: "Support",
    emailAddr: "hello@mediscan.ai",
    salesAddr: "sales@mediscan.ai",
    supportAddr: "support@mediscan.ai",
    responses: "Temps de Réponse",
    resp1: "Demande générale : Dans les 24 heures",
    resp2: "Demande de démo : Dans les 2 heures",
    resp3: "Support technique : Réponse prioritaire",
    formName: "Nom Complet",
    formEmail: "Email",
    formOrg: "Hôpital / Organisation",
    subject: {
      formSubject: "Objet",
      subjectPlaceholder: "Sélectionnez un sujet...",
      subjectDemo: "Demander une démonstration",
      subjectSupport: "Support Technique",
      subjectPartnership: "Partenariats / Presse",
      subjectOther: "Autre"
    },
    formMessage: "Message",
    formPlaceholder1: "Dr. Sarah Johnson",
    formPlaceholder2: "sarah@hospital.com",
    formPlaceholder3: "Nom du Centre Médical",
    formPlaceholder4: "Parlez-nous de vos besoins...",
    formSubmit: "Envoyer le Message",
    formAccept: "J'ai lu et j'accepte la",
    formPrivacyLink: "politique de confidentialité",
    formPrivacy: "Nous respectons votre confidentialité. Vos informations ne seront jamais partagées.",
  },
  about: {
    headline: "À propos de MEDISCAN AI",
    description:
      "MEDISCAN AI est dédié à transformer l'analyse d'imagerie médicale grâce à l'IA de pointe et à l'expertise clinique.",
    mission: {
      title: "Notre Mission",
      text: "Permettre aux professionnels de santé d'accéder à une recherche d'images rapide, précise et intuitive, soutenue par l'IA.",
    },
    vision: {
      title: "Notre Vision",
      text: "Être la plateforme IA de référence pour l'imagerie médicale, afin d'améliorer les résultats pour les patients dans le monde entier.",
    },
    team: {
      title: "Rencontrez l'Équipe",
      members: [
        { name: "Dr. Sarah Johnson", role: "Directrice Médicale", photo: "/team/sarah.jpg" },
        { name: "Alex Martinez", role: "Ingénieur IA Principal", photo: "/team/alex.jpg" },
        { name: "Emily Wong", role: "Chef de Produit", photo: "/team/emily.jpg" },
        { name: "Michael Lee", role: "Designer UX", photo: "/team/michael.jpg" },
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
