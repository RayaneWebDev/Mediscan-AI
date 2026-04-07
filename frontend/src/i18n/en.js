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
    description: "Search medical imaging archives by image content or text description, retrieve visually or clinically related cases, and support evidence-based interpretation through structured similarity search.",
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
      description: "Imaging AI platform designed to optimize workflows, diagnostic precision, and medical research through automated cohort identification.",
      features: [
        {
          icon: "route",
          title: "Intelligent Retrieval",
          desc: "Search by visual or semantic similarity through a fast, intuitive workflow across radiology data.",
        },
        {
          icon: "brain",
          title: "Diagnostic Support",
          desc: "Compare relevant cases, support interpretation, and strengthen diagnostic confidence with evidence-based retrieval.",
        },
        {
          icon: "blocks",
          title: "Scalable Research Infrastructure",
          desc: "Private, hardware-light, and ready to integrate with PACS, EMR, and hospital research environments.",
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
          desc: "MEDISCAN AI analyzes visual and clinical features instantly.",
        },
        {
          num: "3",
          title: "Discover",
          desc: "Receive ranked results with confidence scores and clinical metadata.",
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
        { title: "Multi-Modal", desc: "All imaging types and modalities supported" },
        { title: "Secure", desc: "Enterprise-grade security and compliance" },
        { title: "Analytics", desc: "Track usage patterns and clinical outcomes" },
        { title: "API Access", desc: "Integrate directly into your workflows" },
      ],
    },

    footer: {
      tagline: "AI at the Service of Diagnosis.",
      compliance: "HIPAA Compliant · Enterprise Secure · ISO 27001 Certified",
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
    footer: "HIPAA Compliant · Your data stays private · No advertisements",

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
          "Medical meaning search — English",
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
      legendTitle: "What each analysis mode represents in MEDISCAN AI",
      legendDescription: "This reference stays fixed: one mode reads visible structure, the other reads medically meaningful similarity.",
      legend: {
        visual: {
          label: "VISUAL ANALYSIS",
          title: "Structural and anatomical similarity",
          description: "Visual Analysis compares what is directly visible in the image: shapes, contours, textures, contrast patterns, and spatial organization.",
          note: "Use it to find visually or anatomically similar images.",
        },
        interpretive: {
          label: "INTERPRETIVE ANALYSIS",
          title: "Medical and semantic similarity",
          description: "Interpretive Analysis goes beyond appearance and focuses on medical meaning, pathology patterns, and semantic similarity.",
          note: "Use it to find medically or semantically similar cases.",
        },
      },
      readyStep: "3. Launch Search",
      readyTitle: "Start the retrieval",
      readyDescription: "Upload a medical image, choose the analysis mode, then run the search to surface the closest matching cases.",
      pendingStep: "3. Run Analysis",
      pendingTitle: "Your image is ready",
      pendingDescription: "Adjust the analysis settings, then click Search to retrieve the closest visual or interpretive matches.",
    },

    text: {
      headline: "Medical Text Search",
      badge: "Semantic Analysis · Natural Language",
      label: "Medical query",
      langNote: "in English",
      placeholder: "E.g.: chest X-ray bilateral pneumonia...",
      back: "Back",
      searching: "Analysing...",
      error: "An error occurred.",
      step3: "Results",
    },
    filters: {
      minScore: "Min Score",
      caption: "Caption",
      captionPlaceholder: "Filter by caption...",
      sort: "Sort",
      sortDesc: "Score ↓",
      sortAsc: "Score ↑",
      compare: "Compare",
      compareOn: "✓ Compare On",
      export: "Export",
    },
    results: {
      visualMode: "Visual (DINOv2)",
      semanticMode: "Semantic (BioMedCLIP)",
      textMode: "Text (BioMedCLIP)",
      relaunchImage: "Search from this image",
      resultsFoundSingular: "result found",
      resultsFoundPlural: "results found",
      selectedCount: "selected images",
      clearSelection: "Clear",
      relaunchSelection: "Search from selection",
    },
  },

  // About Page
  about: {
    headline: "About MEDISCAN AI",
    description:
      "MEDISCAN AI is dedicated to transforming medical imaging analysis with cutting-edge AI technology and clinical expertise.",
    mission: {
      title: "Our Mission",
      text: "Make medical image search accessible and efficient — allowing clinicians and researchers to find relevant cases from large databases using either an image or a text description.",
    },
    vision: {
      title: "Our Goal",
      text: "Bridge the gap between raw medical image archives and actionable clinical knowledge, by providing a fast, reliable retrieval system grounded in state-of-the-art biomedical AI.",
    },
    team: {
      title: "Meet the Team",
      members: [
        { name: "Dr. Sarah Johnson", role: "Chief Medical Officer", photo: "" },
        { name: "Alex Martinez", role: "Lead AI Engineer", photo: "" },
        { name: "Emily Wong", role: "Product Manager", photo: "" },
        { name: "Michael Lee", role: "UX Designer", photo: "" },
      ],
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
    supportAddr: "support@mediscan.ai",
    responseLabel: "Response time",
    responseDesc: "We typically respond within 24 hours on business days.",
    sentTitle: "Email draft ready",
    sentDesc: "Your email client opened with a prefilled message to the MEDISCAN team.",
    sentAnother: "Prepare another email",
    formName: "Name",
    formEmail: "Email",
    formSubject: "Subject",
    formSubjectPlaceholder: "What is your message about?",
    formMessage: "Message",
    formPlaceholder1: "Your name",
    formPlaceholder2: "your@email.com",
    formPlaceholder4: "Tell us how we can help...",
    formSubmit: "Send Message",
    formPrivacy: "We respect your privacy. Your information will never be shared.",
  },

  // How It Works
  howItWorks: {
    headline: "How MEDISCAN AI Works",
    description: "Clinical image search powered by advanced AI and clinical reasoning.",
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
            desc: "Combines visual features with anatomical and clinical knowledge.",
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
        desc: "Understands clinical context, pathology, and diagnostic significance.",
        steps: [
          {
            title: "Biomedical Encoding",
            desc: "Models trained on 100K+ clinically-annotated medical images.",
          },
          {
            title: "Interpretive Reasoning",
            desc: "Recognizes diseases, conditions, and clinical patterns.",
          },
          {
            title: "Evidence Alignment",
            desc: "Matches cases based on clinical similarity and diagnostic value.",
          },
          {
            title: "Confidence Scoring",
            desc: "Each result includes clinical confidence based on training data.",
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
    description: "Find answers to common questions about MEDISCAN AI's technology and integration.",
    categories: {
      general: "General",
      technical: "Technical",
      security: "Security & Privacy"
    },
    items: [
      { 
        category: "general",
        q: "What is the main purpose of MEDISCAN AI?", 
        r: "MEDISCAN AI is a specialized search engine designed for clinicians. It allows them to find similar medical cases from vast databases using both visual features and clinical metadata to assist in diagnostic decision-making." 
      },
      { 
        category: "general",
        q: "Who can use the platform?", 
        r: "The platform is built for radiologists, pathologists, and medical researchers who need to compare current cases with historically validated data." 
      },
      { 
        category: "general",
        q: "Is it a diagnostic tool?", 
        r: "No, MEDISCAN AI is a decision-support tool. it provides similar cases and relevant literature, but the final diagnostic responsibility remains with the healthcare professional." 
      },
      
      { 
        category: "technical",
        q: "How does the 'Visual Search' differ from 'Interpretive Search'?", 
        r: "Visual Search (Signature Search) analyzes pixel patterns to find similar shapes and textures. Clinical Search uses AI to understand the pathology and find cases with the same medical meaning, even if they look different." 
      },
      { 
        category: "technical",
        q: "Does it integrate with existing PACS/DICOM systems?", 
        r: "Yes, our API-first architecture supports DICOM standards for seamless integration with most hospital Picture Archiving and Communication Systems (PACS)." 
      },
      { 
        category: "technical",
        q: "What imaging modalities are supported?", 
        r: "Currently, we support MRI, CT scans, X-rays, and Digital Pathology. We are constantly expanding to new modalities through our modal-agnostic AI framework." 
      },

      // --- SECURITY & PRIVACY ---
      { 
        category: "security",
        q: "Is the platform HIPAA and GDPR compliant?", 
        r: "Absolutely. We implement strict data protection measures, ensuring that all processing meets international healthcare standards for privacy and security." 
      },
      { 
        category: "security",
        q: "Where is the medical data stored?", 
        r: "By default, MEDISCAN AI processes images in-memory (volatile) and does not store patient-identifiable information (PII) on our research servers without explicit institutional agreement." 
      },
      { 
        category: "security",
        q: "How is the data encrypted?", 
        r: "All data in transit is protected by TLS 1.3 encryption, and any data at rest is secured using AES-256 military-grade encryption." 
      }
    ],
    contactTitle: "Still have questions?",
    contactBtn: "Contact our team"
  },
};
