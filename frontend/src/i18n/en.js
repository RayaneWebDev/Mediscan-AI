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
    badge: "Clinical AI Analysis",
    headline1: "Reduce Uncertainty.",
    headline2: "Accelerate Diagnosis.",
    description: "Unlocking the visual archives of medicine with MediScan AI. Search by content, find similar cases instantly, and elevate clinical precision.",
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
      title4: "Clinical Support",
      value4: "24/7",
    },

    whyChoose: {
      headline: "Why MEDISCAN AI ?",
      description: "Imaging AI platform designed to optimize workflows, diagnostic precision, and medical research through automated cohort identification.",
      features: [
        {
          icon: "route",
          title: "Fast, Intuitive Workflow",
          desc: "Add an image, select a search mode, and explore similar cases",
        },
        {
          icon: "between-horizontal-start",
          title: "Explore from Different Angles",
          desc: "Use one search mode to find images that look similar, and another to uncover related medical cases.",
        },
        {
          icon: "brain",
          title: "Multi-Modality Support",
          desc: "Enables retrieval across varied radiology image types within a single structured system.",
        },
        {
          icon: "user-key",
          title: "Your Images Stay Private",
          desc: "Search images are not stored permanently and are used only during the query process.",
        },
        {
          icon: "hard-drive",
          title: "No Special Hardware Needed",
          desc: "Runs without specialized hardware, making the platform easier to access and use.",
        },
        {
          icon: "blocks",
          title: "Seamless Integration",
          desc: "Works with your PACS, EMR, and hospital infrastructure. API-first design.",
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
          desc: "MediScan AI analyzes visual and clinical features instantly.",
        },
        {
          num: "3",
          title: "Discover",
          desc: "Receive ranked results with confidence scores and clinical metadata.",
        },
      ],
    },

    modes: {
      headline: "Two Intelligent Search Modes",
      description: "Choose the approach that matches your clinical question.",
      visual: {
        title: "Visual Analysis",
        desc: "Find images with similar anatomical structures and visual characteristics.",
        use: "Use when: Comparative anatomy, morphology matching, or structural similarity.",
      },
      semantic: {
        title: "Clinical Analysis",
        desc: "Discover cases with comparable pathology and clinical significance.",
        use: "Use when: Disease finding, diagnostic reasoning, or evidence-based case selection.",
      },
    },

    useCases: {
      headline: "Built for Healthcare Professionals",
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
        { title: "Clinical Intelligence", desc: "AI trained on annotated medical datasets" },
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
    modeVisual: "Visual Analysis",
    modeSemantic: "Clinical Analysis",
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
      name: "Clinical Analysis",
      icon: "hospital",
      desc: "Find cases with similar clinical significance and pathology.",
      use: "Use when: Looking for specific diseases or clinical conditions",
    },
    highlights: {
      title1: "Instant Results",
      desc1: "< 1 second search time",
      title2: "Clinically Relevant",
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
        title: "By image",
        subtitle: "Visual & semantic analysis",
        desc: "Upload a radiograph or medical image to find the closest matching cases in the database.",
        features: [
          "Visual structure analysis",
          "Semantic image comparison",
          "Results ranked by similarity",
        ],
        cta: "Analyse an image",
      },
      textCard: {
        title: "By description",
        subtitle: "Natural language search",
        desc: "Describe a medical case in English and retrieve matching images by medical meaning.",
        features: [
          "Search by medical meaning",
          "Natural language — English",
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
  },

  // Features Page
  features: {
    headline: "Powerful Features",
    description: "Everything needed for clinical-grade image analysis and discovery.",
    items: [
      {
        title: "Sub-Second Search",
        desc: "Query millions of images in under 1 second. Optimized for clinical workflows.",
        features: ["Sub-millisecond latency", "Distributed indexing", "Real-time updates"],
      },
      {
        title: "Multi-Modal Support",
        desc: "Works across all major imaging types—CT, MRI, X-Ray, Ultrasound, Pathology.",
        features: ["10+ imaging modalities", "Cross-modality search", "Format agnostic"],
      },
      {
        title: "Clinical Validation",
        desc: "AI trained on 100K+ clinically-annotated images from peer-reviewed datasets.",
        features: ["Biomedical AI models", "Clinical confidence scores", "Evidence-backed"],
      },
      {
        title: "Enterprise Security",
        desc: "HIPAA compliant. On-premise or cloud. Your data remains under your control.",
        features: ["HIPAA compliance", "End-to-end encryption", "Audit logging"],
      },
      {
        title: "PACS & EMR Integration",
        desc: "Seamless integration with existing hospital infrastructure. No disruption.",
        features: ["DICOM support", "REST API", "Custom workflows"],
      },
      {
        title: "Advanced Analytics",
        desc: "Track usage, measure impact, and extract insights from search patterns.",
        features: ["Search analytics", "Outcome metrics", "Usage dashboards"],
      },
    ],
  },

  // About Page
  about: {
    headline: "About MediScan AI",
    description:
      "MediScan AI is dedicated to transforming medical imaging analysis with cutting-edge AI technology and clinical expertise.",
    mission: {
      title: "Our Mission",
      text: "To empower healthcare professionals with fast, accurate, and intuitive AI-driven image search and diagnostic support.",
    },
    vision: {
      title: "Our Vision",
      text: "To be the leading AI platform for medical imaging, enabling better outcomes for patients worldwide.",
    },
    team: {
      title: "Meet the Team",
      members: [
        { name: "Dr. Sarah Johnson", role: "Chief Medical Officer", photo: "/team/sarah.jpg" },
        { name: "Alex Martinez", role: "Lead AI Engineer", photo: "/team/alex.jpg" },
        { name: "Emily Wong", role: "Product Manager", photo: "/team/emily.jpg" },
        { name: "Michael Lee", role: "UX Designer", photo: "/team/michael.jpg" },
      ],
    },
    cta: {
      title: "Want to Learn More?",
      description: "Reach out to our team and discover how MediScan AI can help your organization.",
      buttonText: "Contact Us",
    },
  },
  // Contact Page
  contact: {
    headline: "Get in Touch",
    description: "Have questions? Our clinical and technical team is here to help.",
    email: "Email",
    sales: "Sales",
    support: "Support",
    emailAddr: "hello@mediscan.ai",
    salesAddr: "sales@mediscan.ai",
    supportAddr: "support@mediscan.ai",
    responses: "Response Times",
    resp1: "General inquiry: Within 24 hours",
    resp2: "Sales demo request: Within 2 hours",
    resp3: "Technical support: Priority response",
    formName: "Full Name",
    formEmail: "Email",
    formOrg: "Hospital / Organization",
    subject: {
      formSubject: "Subject",
      subjectPlaceholder: "Select a subject...",
      subjectDemo: "Request a demonstration",
      subjectSupport: "Technical Support",
      subjectPartnership: "Partnerships / Press",
      subjectOther: "Other"
    },
    formMessage: "Message",
    formPlaceholder1: "Dr. Sarah Johnson",
    formPlaceholder2: "sarah@hospital.com",
    formPlaceholder3: "Medical Center Name",
    formPlaceholder4: "Tell us about your needs...",
    formSubmit: "Send Message",
    formAccept: "I've read and accept",
    formPrivacyLink: "privacy policy",
    formPrivacy: "We respect your privacy. Your information will never be shared.",
  },

  // How It Works
  howItWorks: {
    headline: "How MediScan AI Works",
    description: "Clinical image search powered by advanced AI and clinical reasoning.",
    pipeline: {
      title: "The Search Pipeline",
      steps: [
        { label: "Clinical Image", icon: "📋" },
        { label: "AI Analysis", icon: "⚙️" },
        { label: "Feature Extraction", icon: "📊" },
        { label: "Clinical Index", icon: "🗄️" },
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
            title: "Clinical Context Integration",
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
        name: "Clinical Analysis",
        model: "Biomedical Language Model",
        desc: "Understands clinical context, pathology, and diagnostic significance.",
        steps: [
          {
            title: "Biomedical Encoding",
            desc: "Models trained on 100K+ clinically-annotated medical images.",
          },
          {
            title: "Clinical Reasoning",
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
        title: "Use Clinical Analysis when:",
        cases: [
          "You're searching for a specific diagnosis or condition",
          "Images come from different modalities or sources",
          "Clinical significance matters more than appearance",
        ],
      },
    },


  // FAQ
  faq: {
    headline: "Frequently Asked Questions",
    description: "Find answers to common questions about MediScan AI's technology and integration.",
    categories: {
      general: "General",
      technical: "Technical",
      security: "Security & Privacy"
    },
    items: [
      { 
        category: "general",
        q: "What is the main purpose of MediScan AI?", 
        r: "MediScan AI is a specialized search engine designed for clinicians. It allows them to find similar medical cases from vast databases using both visual features and clinical metadata to assist in diagnostic decision-making." 
      },
      { 
        category: "general",
        q: "Who can use the platform?", 
        r: "The platform is built for radiologists, pathologists, and medical researchers who need to compare current cases with historically validated data." 
      },
      { 
        category: "general",
        q: "Is it a diagnostic tool?", 
        r: "No, MediScan AI is a decision-support tool. it provides similar cases and relevant literature, but the final diagnostic responsibility remains with the healthcare professional." 
      },
      
      { 
        category: "technical",
        q: "How does the 'Visual Search' differ from 'Clinical Search'?", 
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
        r: "By default, MediScan AI processes images in-memory (volatile) and does not store patient-identifiable information (PII) on our research servers without explicit institutional agreement." 
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
},
};
