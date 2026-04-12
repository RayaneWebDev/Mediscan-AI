export const en = {
  // Navigation
  nav: {
    home: "Home",
    scan: "Scan & Search",
    features: "Features",
    contact: "Contact",
    startFree: "Scan & Search",
    aboutUs: "About Us",
  },

  // Home Page
  home: {
    heroLabel: "IMAGE - TEXT GUIDED MEDICAL RETRIEVAL",
    badge: "Interpretive AI Analysis",
    headline1: "Reduce Uncertainty.",
    headline2: "Accelerate Diagnosis.",
    description: "Search medical imaging archives by image content or text description, retrieve visually or semantically related cases, and explore a university CBIR prototype through a structured similarity workflow.",
    cta1: "Scan & Search",
    cta1Link: "/search",
    cta2Link: "/features",
    cta2: "Learn More",

    stats: {
      title1: "Cases Searchable",
      value1: "100K+",
      title2: "Average Search Time",
      value2: "< 2s",
      title3: "Diagnostic Accuracy",
      value3: "95%+",
      title4: "Interpretive Support",
      value4: "24/7",
    },

    whyChoose: {
      headline: "Why MEDISCAN AI ?",
      description: "University prototype designed to explore medical image retrieval workflows for teaching, demos, and research experimentation.",
      features: [
        {
          icon: "route",
          title: "Intelligent Retrieval",
          desc: "Search by visual or semantic similarity through a fast, intuitive workflow across radiology data.",
        },
        {
          icon: "brain",
          title: "Diagnostic Support",
          desc: "Compare relevant cases and review similar examples through a clear retrieval workflow.",
        },
        {
          icon: "blocks",
          title: "Lightweight Research Stack",
          desc: "Runs locally with a simple FastAPI plus React stack and optional metadata enrichment.",
        },
      ],
    },

    howWorks: {
      headline: "How It Works",
      description: "Three intuitive steps to unlock your medical image archive.",
      steps: [
        {
          num: "1",
          title: "Upload",
          desc: "Select a medical image from your archive or upload a new case.",
        },
        {
          num: "2",
          title: "Analyze",
          desc: "MEDISCAN indexes visual and semantic features instantly.",
        },
        {
          num: "3",
          title: "Discover",
          desc: "Receive ranked similar results with scores and available metadata.",
        },
      ],
    },

    modes: {
      headline: "Two Complementary Retrieval Modes",
      description: "A visual pathway for structural similarity and an interpretive pathway for clinically meaningful case discovery.",
      rootLabel: "MEDISCAN Retrieval",
      visual: {
        title: "Visual Analysis",
        items: [
          "Visual Similarity Search",
        ],
        desc: "Find images with similar anatomical structures and visual characteristics.",
        use: "Use when: Comparative anatomy, morphology matching, or structural similarity.",
      },
      semantic: {
        title: "Interpretive Analysis",
        items: [
          "Semantic Similarity Search",
          "Text-Guided Search",
        ],
        desc: "Discover cases with comparable pathology and clinical significance.",
        use: "Use when: Disease finding, diagnostic reasoning, or evidence-based case selection.",
      },
    },

    useCases: {
      headline: "Built for Healthcare Professionals",
      audience: "Radiologists, pathologists, hospital systems, and research centers.",
      inlineDescription: "Retrieve precedent cases, compare similar specimens, reduce redundant imaging, and accelerate cohort discovery in a single workflow.",
      roles: [
        {
          icon: "stethoscope",
          title: "Radiologists",
          desc: "Find precedent cases instantly. Improve diagnostic confidence with historical data.",
        },
        {
          icon: "microscope",
          title: "Pathologists",
          desc: "Explore comparable specimens and tissue samples across your repository.",
        },
        {
          icon: "hospital",
          title: "Hospital Systems",
          desc: "Reduce redundant imaging studies. Improve clinical efficiency and outcomes.",
        },
        {
          icon: "search",
          title: "Research Centers",
          desc: "Accelerate studies by rapidly identifying relevant patient cohorts.",
        },
      ],
    },

    features: {
      headline: "Powerful Features",
      list: [
        { title: "Lightning Speed", desc: "Sub-second latency on millions of images" },
        { title: "Interpretive Intelligence", desc: "AI trained on annotated medical datasets" },
        { title: "Dual Retrieval", desc: "Visual and semantic search modes on the same dataset" },
        { title: "Research Prototype", desc: "Built for demos, experimentation, and code understanding" },
        { title: "Result Export", desc: "Export visible results as JSON, CSV, or PDF" },
        { title: "Open API", desc: "Simple REST endpoints for local integrations and testing" },
      ],
    },

    footer: {
      tagline: "University Medical Image Retrieval Prototype.",
      compliance: "University prototype · Non-clinical · Local demo",
      contact: "Contact Us",
      rights: "All rights reserved.",
      privacy : "Privacy",
      terms: "Terms",
      aboutus: "About Us",
      navigationTitle: "Navigation",
      supportTitle: "Support",
      legalTitle: "Legal",
      connectTitle: "Connect",
      builtWith: "Built with",
      documentation: "Documentation",
      faq: "FAQ",
    },
  },

  // Search Page
  search: {
    headline: "Scan & Search Medical Images",
    description: "Upload a medical image and discover similar cases instantly.",
    step1: "1. Upload Image",
    step1Desc: "JPEG or PNG format",
    step2: "2. Choose Analysis Mode",
    step3: "3. View Results",
    searching: "Analyzing your image...",
    error: "Error connecting to server.",
    analysisMode: "Analysis Mode",
    modeVisual: "Visual Analysis",
    modeSemantic: "Interpretive Analysis",
    numResults: "Results",
    search: "Search",
    howWorks: "Two Analysis Modes",
    visual: {
      name: "Visual Analysis",
      icon: "search",
      desc: "Find images with similar visual appearance and structure.",
      use: "Use when: Looking for anatomically similar cases",
    },
    semantic: {
      name: "Interpretive Analysis",
      icon: "hospital",
      desc: "Find cases with similar clinical significance and pathology.",
      use: "Use when: Looking for specific diseases or clinical conditions",
    },
    highlights: {
      title1: "Instant Results",
      desc1: "< 1 second search time",
      title2: "Interpretively Relevant",
      desc2: "AI-trained on medical datasets",
      title3: "Completely Free",
      desc3: "No signup, no limits",
    },
    footer: "University prototype · Non-clinical summary · No signup required",

    hub: {
      badge: "Medical image search engine",
      headline: "Medical Search",
      description: "Choose your search type.",
      imageCard: {
        title: "Visual Search",
        subtitle: "Visual & semantic analysis",
        desc: "Upload a radiograph or medical image to find the closest matching cases in the database.",
        features: [
          "Visual structure analysis",
          "Semantic image comparison",
        ],
        cta: "Analyse an image",
      },
      textCard: {
        title: "Text Guided Search",
        subtitle: "Natural language search",
        desc: "Describe a medical case in English and retrieve matching images by medical meaning.",
        features: [
          "Medical meaning search",
          "Semantically relevant results",
        ],
        cta: "Describe a case",
      },
      choose: {
        title: "Which approach to choose?",
        imageLabel: "By image — if you:",
        imageItems: [
          "Have a radiograph or scan to analyse",
          "Are looking for visually similar cases",
          "Want to compare anatomical structures",
        ],
        textLabel: "By description — if you:",
        textItems: [
          "Don't have an image available",
          "Know the diagnosis or pathology",
          "Want to explore a medical concept",
        ],
      },
    },

    image: {
      headline: "Image Search",
      back: "Back",
      invalidFileType: "Only JPEG and PNG files are accepted.",
      uploadPrompt: "Drag an image here or",
      browseAction: "browse",
      acceptedFormats: "JPEG or PNG only",
      previewAlt: "Selected image preview",
      legendEyebrow: "Quick Note",
      legendTitle: "Choose the right analysis mode for your goal",
      legendDescription: "The two modes do not serve the same purpose: one helps you compare what you see in the image, while the other helps you retrieve cases that are closer in medical meaning. Use this note to choose the most relevant mode before running the search.",
      legend: {
        visual: {
          label: "VISUAL ANALYSIS",
          title: "Structural and anatomical similarity",
          description: "Visual analysis is the right choice when you start from an image and want to retrieve cases that look similar on screen. It emphasizes overall appearance, visible structures, and anatomical resemblance.",
          note: "Useful for quickly comparing an X-ray, finding images with a similar visual rendering, or checking whether a case looks close to other examples in the dataset.",
        },
        interpretive: {
          label: "INTERPRETIVE ANALYSIS",
          title: "Medical and semantic similarity",
          description: "Interpretive analysis is more useful when your goal is to retrieve cases that are relevant for case reading, even if they do not look strictly identical. It prioritizes meaning and clinical relevance over pure visual resemblance.",
          note: "Useful for exploring cases that are closer in diagnostic intent, widening the search to medically relevant examples, or prioritizing clinical usefulness over simple visual similarity.",
        },
      },
      detailStep: "3. Details",
      readyStep: "3. Launch Search",
      readyTitle: "Start the retrieval",
      readyDescription: "Upload a medical image, choose the analysis mode, then run the search to surface the closest matching cases.",
      pendingStep: "3. Run Analysis",
      pendingTitle: "Your image is ready",
      pendingDescription: "Adjust the analysis settings, then click Search to retrieve the closest visual or interpretive matches.",
      modeChangeConfirm: "Switching modes will clear the current results. You will need to run the search again.",
      modeChangeConfirmAction: "Continue",
      modeChangeCancel: "Cancel",
      modeInfoLabel: "Open the quick note about analysis modes",
      selectionGuide: {
        label: "COMBINATION",
        title: "Combine filters with multi-selection relaunch",
        description: "Filters help tighten the visible list first. Multi-selection relaunch then lets you start again from a small group of already relevant images to run a more focused search.",
        note: "Example: caption keyword + minimum score to isolate a few cases, then use multi-selection relaunch to explore even closer neighbors.",
      },
    },

    text: {
      headline: "Medical Text Search",
      badge: "Interpretive Analysis · Natural Language",
      label: "Medical query",
      langNote: "in English",
      placeholder: "E.g.: chest X-ray bilateral pneumonia...",
      back: "Back",
      searching: "Analysing...",
      error: "An error occurred.",
      step1: "1. Medical Query",
      step1Desc: "Medical wording · English",
      step2: "2. Choose Number of Results",
      step3: "Results",
      readyStep: "3. Launch Search",
      pendingStep: "3. Run Analysis",
      emptyStep: "3. Launch Search",
      readyTitle: "Start the interpretive search",
      readyDescription: "Enter a medical description in English, then run the search to surface the images whose captions best match your query clinically.",
      pendingTitle: "Your query is ready",
      pendingDescription: "Adjust the number of results, then click Search to retrieve the closest interpretive matches.",
      modeInfoLabel: "Open the quick note about interpretive analysis",
      legendEyebrow: "Quick note",
      legendTitle: "Understand text-guided interpretive analysis",
      legendDescription: "This search does not start from an image but from a medical description. MediScan matches your English query against indexed clinical captions to retrieve cases that are close in medical meaning, not only in visual appearance.",
      legend: {
        interpretive: {
          label: "INTERPRETIVE ANALYSIS",
          title: "Search by medical meaning",
          description: "Text search compares your wording against captions and associated clinical concepts to retrieve cases that are close in medical interpretation.",
          note: "Use it when you start from a hypothesis, a diagnosis, a radiological finding, or a precise clinical formulation.",
        },
        writing: {
          label: "WORDING",
          title: "Describe the case effectively",
          description: "Prefer short, structured English wording: modality, anatomical region, main findings, and helpful clinical context. Example: chest X-ray with bilateral lower lobe opacities.",
          note: "Queries that are too vague usually broaden the result set; queries that are too long often dilute the strongest signals.",
        },
      },
      quickNoteEyebrow: "Quick note",
      quickNoteTitle: "Text-guided retrieval",
      quickNoteDescription: "Describe findings in English to query the semantic index.",
      quickNoteChip: "Interpretive analysis",
      quickNoteBody: "Use concise medical wording to find images whose captions express similar findings or pathology.",
      quickNoteExample: "E.g.: chest X-ray bilateral pneumonia",
    },
    conclusion: {
      title: "AI Summary",
      copy: "Copy",
      collapse: "Collapse",
      expand: "Expand",
      disclaimer: "Research summary only. It does not replace medical judgment or diagnosis.",
      generate: "Generate summary",
      loading: "Generating summary...",
      regenerate: "Generate again",
      error: "Unable to generate the summary right now.",
      noResults: "Run a search before requesting a summary.",
    },
    filters: {
      title: "Filters",
      refineHint: "Refine the visible results from your text search without leaving the page.",
      infoLabel: "Open the quick note about text-search filters",
      reset: "Reset",
      minScore: "Min Score",
      caption: "Caption",
      captionPlaceholder: "Filter by caption...",
      quickTerms: "Suggested terms",
      quickTermsHint: "Tap to refine",
      cui: "CUI Code",
      cuiPlaceholder: "e.g. C0018799",
      cuiPresence: "CUI Presence",
      all: "All",
      withCui: "With CUI",
      withoutCui: "Without CUI",
      cuiTypesTitle: "Filter by CUI type",
      cuiModalite: "Modality",
      cuiAnatomie: "Anatomy",
      cuiFinding: "Pathology / Finding",
      cuiTypeAll: "All",
      sort: "Sort",
      sortDesc: "Score ↓",
      sortAsc: "Score ↑",
      reference: "Image reference",
      referencePlaceholder: "e.g. ROCO_000123",
      referenceHint: "Find a specific image again using its identifier.",
      guide: {
        eyebrow: "Filter guide",
        title: "Refine results from your text search",
        description: "Filters act on the list already retrieved. They refine what is shown without rerunning the search.",
        caption: {
          label: "CAPTION, CUI, AND REFERENCE",
          title: "Find a specific kind of case within text results",
          description: "The caption filter searches within returned descriptions. CUI filters narrow by modality, anatomy, or pathology, and the reference field helps find a known identifier.",
          note: "Useful when moving from a broad query to a tighter subset.",
        },
        score: {
          label: "SCORE AND SORT",
          title: "Keep the matches closest to your text",
          description: "The minimum score removes weaker matches. Score ↓ keeps the strongest results first; score ↑ shows more borderline cases.",
          note: "Raise the threshold if you want a stricter list.",
        },
        order: {
          label: "COMBINATION",
          title: "Build a more targeted reading path",
          description: "The most effective approach is to combine filters to isolate the useful subset quickly.",
          note: "Example: caption keyword + minimum score + anatomy.",
        },
      },
      compare: "Compare",
      compareOn: "✓ Compare On",
      export: "Export",
    },
    results: {
      visualMode: "Visual analysis",
      semanticMode: "Interpretive analysis",
      textMode: "Text search",
      relaunchImage: "Search from this image",
      compareAction: "Compare",
      closeCompare: "Close comparison",
      compareTitle: "Comparison",
      queryImageLabel: "Query image",
      selectedImageLabel: "Matched result",
      resultMetadataHint: "The information below belongs to the selected result.",
      resultCaptionLabel: "Result caption",
      resultScoreLabel: "Result score",
      resultCuiLabel: "Result CUI code",
      openDetails: "View full-size image",
      closeDetails: "Close detail dialog",
      downloadImage: "Download image",
      detailsTitle: "Result details",
      paginationLabel: "Results pagination",
      pageLabel: "Page",
      previousPage: "Previous",
      nextPage: "Next",
      captionLabel: "Full caption",
      scoreLabel: "Score",
      rawScoreLabel: "Raw score",
      rankLabel: "Rank",
      identifierLabel: "Reference",
      cuiLabel: "CUI code",
      noCaption: "No caption is available for this image.",
      notAvailable: "Not available",
      resultsFoundSingular: "result found",
      resultsFoundPlural: "results found",
      selectedCount: "selected images",
      selectedImageSingular: "selected image",
      selectedImagePlural: "selected images",
      selectionPanelTitle: "Multi-selection relaunch",
      selectionHelpLabel: "Open the quick note about multi-selection relaunch",
      selectionSummaryEmpty: "No image selected yet",
      selectionHint: "Tick one or more result cards to build a tighter relaunch from a small group of reference images.",
      selectionReadySingle: "The selection is ready to rerun the search from one reference image.",
      selectionReadyPlural: "The selection is ready to rerun the search from several reference images.",
      removeSelectedImage: "Remove this image from the selection",
      selectionExpand: "Expand multi-selection relaunch",
      selectionCollapse: "Collapse multi-selection relaunch",
      clearSelection: "Clear selection",
      relaunchSelection: "Search from selection",
      selectionSearchSingle: "Search from image",
      selectionSearchPlural: "Search from images",
    },
  },

  // About Page
  about: {
    headline: "About MEDISCAN AI",
    description:
      "MEDISCAN AI is a university prototype focused on medical image retrieval, fast experimentation, and code transparency.",
    mission: {
      title: "Our Mission",
      text: "Make medical image search accessible and efficient — allowing clinicians and researchers to find relevant cases from large databases using either an image or a text description.",
    },
    vision: {
      title: "Our Goal",
      text: "Bridge the gap between raw medical image archives and practical retrieval experiments through a fast and understandable biomedical search stack.",
    },
    team: {
      title: "Meet the Team",
      members: [],
    },
    cta: {
      title: "Want to Learn More?",
      description: "Reach out to our team and discover how MEDISCAN AI can help your organization.",
      buttonText: "Contact Us",
    },
  },
  // Contact Page
  contact: {
    headline: "Contact Us",
    description: "A question, a bug, or just want to say hello? We read every message.",
    supportLabel: "Support",
    supportDesc: "For any technical question or feedback about MediScan.",
    supportAddr: "mediscanaisupport@gmail.com",
    responseLabel: "Response time",
    responseDesc: "We typically respond within 24 hours on business days.",
    sentTitle: "Message sent",
    sentDesc: "Your message has been sent to the MEDISCAN team. We will get back to you shortly.",
    sentAnother: "Send another message",
    formName: "Name",
    formEmail: "Email",
    formSubject: "Subject",
    formSubjectPlaceholder: "What is your message about?",
    formMessage: "Message",
    formPlaceholder1: "Your name",
    formPlaceholder2: "your@email.com",
    formPlaceholder4: "Tell us how we can help...",
    formSubmit: "Send Message",
    formSending: "Sending...",
    formPrivacy: "We respect your privacy. Your information will never be shared.",
    errorGeneric: "We could not send your message right now. Please try again later.",
  },

  // How It Works
  howItWorks: {
    headline: "How MEDISCAN AI Works",
    description: "Medical image retrieval powered by visual and semantic embeddings.",
    pipeline: {
      title: "The Search Pipeline",
      steps: [
        { label: "Interpretive Image", icon: "📋" },
        { label: "AI Analysis", icon: "⚙️" },
        { label: "Feature Extraction", icon: "📊" },
        { label: "Interpretive Index", icon: "🗄️" },
        { label: "Top Results", icon: "✅" },
      ],
    },
    modes: {
      title: "Two Complementary Analysis Approaches",
      visual: {
        name: "Visual Analysis",
        model: "Advanced Vision Encoding",
        desc: "Analyzes visual structures, patterns, and morphological features.",
        steps: [
          {
            title: "Visual Feature Extraction",
            desc: "Deep learning models extract meaningful visual patterns from the image.",
          },
          {
            title: "Interpretive Context Integration",
            desc: "Compares visual features against the indexed dataset.",
          },
          {
            title: "Similarity Scoring",
            desc: "Ranks images by visual and structural similarity.",
          },
          {
            title: "Result Ranking",
            desc: "Returns anatomically and visually similar cases.",
          },
        ],
      },
      semantic: {
        name: "Interpretive Analysis",
        model: "Biomedical Language Model",
        desc: "Aligns image captions and text queries through a biomedical embedding space.",
        steps: [
          {
            title: "Biomedical Encoding",
            desc: "Embeddings are generated from a biomedical model configured in the project.",
          },
          {
            title: "Interpretive Reasoning",
            desc: "Captures semantic relationships expressed in captions and text queries.",
          },
          {
            title: "Evidence Alignment",
            desc: "Matches cases based on semantic similarity in the shared embedding space.",
          },
          {
            title: "Confidence Scoring",
            desc: "Each result includes a similarity score, not a calibrated medical confidence.",
          },
        ],
      },
    },
    when: {
      title: "Choosing the Right Analysis Mode",
      visual: {
        title: "Use Visual Analysis when:",
        cases: [
          "You need anatomically similar cases",
          "Comparing imaging within the same modality",
          "Looking for structural patterns or morphological features",
        ],
      },
      semantic: {
        title: "Use Interpretive Analysis when:",
        cases: [
          "You're searching for a specific diagnosis or condition",
          "Images come from different modalities or sources",
          "Clinical significance matters more than appearance",
        ],
      },
    },
  },

  // FAQ
  faq: {
    headline: "Frequently Asked Questions",
    description: "Find answers about the current prototype, its scope, and its limitations.",
    categories: {
      general: "General",
      technical: "Technical",
      security: "Security & Privacy"
    },
    items: [
      { 
        category: "general",
        q: "What is the main purpose of MEDISCAN AI?", 
        r: "MEDISCAN AI is a university prototype for medical image retrieval. It helps explore visually or semantically similar cases from a dataset, but it is not a clinical decision system." 
      },
      { 
        category: "general",
        q: "Who can use the platform?", 
        r: "The current version is mainly suited for demos, student projects, technical exploration, and research prototyping around medical image retrieval." 
      },
      { 
        category: "general",
        q: "Is it a diagnostic tool?", 
        r: "No. It is a non-clinical prototype that returns similar cases and optional AI summaries for exploration only." 
      },
      
      { 
        category: "technical",
        q: "How does the 'Visual Search' differ from 'Interpretive Search'?", 
        r: "Visual Search focuses on structural similarity in the image. Interpretive Search relies on a semantic embedding space to retrieve cases with similar caption-level meaning." 
      },
      { 
        category: "technical",
        q: "Does it integrate with existing PACS/DICOM systems?", 
        r: "Not in the current version. The prototype exposes a simple REST API and works with JPEG/PNG inputs, but it does not provide PACS/DICOM integration out of the box." 
      },
      { 
        category: "technical",
        q: "What imaging modalities are supported?", 
        r: "The prototype works on a research dataset and accepts JPEG/PNG uploads through the UI. DICOM ingestion and production-grade modality coverage are not implemented here." 
      },

      // --- SECURITY & PRIVACY ---
      { 
        category: "security",
        q: "Is the platform HIPAA and GDPR compliant?", 
        r: "Not by default. Compliance depends on the way the project is deployed, hosted, secured, and governed. This repository should be treated as a non-clinical prototype." 
      },
      { 
        category: "security",
        q: "Where is the medical data stored?", 
        r: "Uploaded files are processed by the backend for retrieval, while result images are served from a public Hugging Face dataset. Optional MongoDB enrichment depends on your own environment." 
      },
      { 
        category: "security",
        q: "How is the data encrypted?", 
        r: "Encryption depends on your deployment. Local development does not by itself guarantee TLS, encrypted storage, or regulated hosting controls." 
      }
    ],
    contactTitle: "Still have questions?",
    contactBtn: "Contact our team"
  },
};
