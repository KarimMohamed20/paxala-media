export const siteConfig = {
  name: "Paxala Media Production",
  shortName: "PMP",
  description:
    "Full-service creative production studio specializing in video production, photography, graphic design, 3D modeling, web development, and more.",
  url: "https://www.paxalamedia.com",
  email: "info@paxalamedia.com",
  phone: "+972 52-330-0119",
  address: "Sakhnin, Israel",
  social: {
    instagram: "https://instagram.com/paxalamedia",
    facebook: "https://facebook.com/paxalamedia",
    youtube: "https://youtube.com/paxalamedia",
    linkedin: "https://linkedin.com/company/paxalamedia",
  },
  businessHours: {
    weekdays: "08:00 - 17:00",
    sunday: "09:00 - 17:00",
    friday: "Closed",
    saturday: "Closed",
  },
};

export const services = [
  {
    id: "concept-strategy",
    name: "Concept & Strategy",
    icon: "Lightbulb",
    description:
      "Strategic creative consulting to help brands develop compelling concepts and campaigns.",
    features: [
      "Brand Strategy",
      "Creative Direction",
      "Campaign Planning",
      "Market Research",
      "Content Strategy",
    ],
  },
  {
    id: "video-production",
    name: "Video Production",
    icon: "Video",
    description:
      "Professional video production services including commercials, corporate videos, documentaries, and social media content.",
    features: [
      "Commercial Production",
      "Corporate Videos",
      "Event Coverage",
      "Drone Footage",
      "Post-Production",
    ],
  },
  {
    id: "photography",
    name: "Photography",
    icon: "Camera",
    description:
      "High-quality photography services for products, portraits, events, and commercial purposes.",
    features: [
      "Product Photography",
      "Portrait Sessions",
      "Event Photography",
      "Commercial Shoots",
      "Photo Editing",
    ],
  },
  {
    id: "social-media",
    name: "Social Media",
    icon: "Share2",
    description:
      "Comprehensive social media management and campaign strategies to grow your brand online.",
    features: [
      "Content Strategy",
      "Campaign Management",
      "Content Creation",
      "Analytics & Reporting",
      "Community Management",
    ],
  },
  {
    id: "graphic-design",
    name: "Graphic Design",
    icon: "Palette",
    description:
      "Creative graphic design solutions including branding, marketing materials, and digital assets.",
    features: [
      "Brand Identity",
      "Logo Design",
      "Marketing Materials",
      "Social Media Graphics",
      "Print Design",
    ],
  },
  {
    id: "3d-modeling",
    name: "3D Modeling",
    icon: "Box",
    description:
      "Professional 3D modeling and visualization for products, architecture, and animations.",
    features: [
      "Product Visualization",
      "Architectural Rendering",
      "Character Modeling",
      "Animation",
      "VFX",
    ],
  },
  {
    id: "web-development",
    name: "Web Development",
    icon: "Code",
    description:
      "Custom website development with modern technologies for businesses of all sizes.",
    features: [
      "Custom Websites",
      "E-commerce Solutions",
      "CMS Development",
      "Web Applications",
      "SEO Optimization",
    ],
  },
  {
    id: "app-development",
    name: "App Development",
    icon: "Smartphone",
    description:
      "Mobile and web application development for iOS, Android, and cross-platform solutions.",
    features: [
      "iOS Development",
      "Android Development",
      "Cross-Platform Apps",
      "UI/UX Design",
      "App Maintenance",
    ],
  },
];

export const team = {
  production: [
    {
      id: "ahmed-hajuj",
      name: "Ahmed Hajuj",
      role: "Founder",
      skills: ["Photographer", "Videographer"],
      image: "/images/team/Ahmed Hajuj.png",
    },
    {
      id: "basel-hajuj",
      name: "Basel Hajuj",
      role: "Photographer",
      skills: ["Photographer", "Videographer"],
      image: "/images/team/Basel Hajuj.png",
    },
    {
      id: "ahmed-khalil",
      name: "Ahmed Khalil",
      role: "Drone Specialist",
      skills: ["Drone Pilot/FPV", "Videographer", "Photographer"],
      image: "/images/team/Ahmed Khalil.png",
    },
    {
      id: "ahmed-hassan",
      name: "Ahmed Hassan",
      role: "Video Editor",
      skills: ["Video Editing", "Color Grading", "Motion Graphics"],
      image: "/images/team/Ahmed Hassan.jpeg",
    },
  ],
  itDev: [
    {
      id: "karim-mohamed",
      name: "Karim Mohamed",
      role: "Developer",
      skills: ["Full Stack Development", "Web Applications"],
      image: "/images/team/Karim Mohamed.jpg",
    },
    {
      id: "mustafa-khalil",
      name: "Mustafa Khalil",
      role: "Developer",
      skills: ["Full Stack Development", "Web Applications"],
      image: "/images/team/Mustafa Khalil.png",
    },
    {
      id: "mahmoud-khalil",
      name: "Mahmoud Khalil",
      role: "Developer",
      skills: ["Full Stack Development", "Mobile Apps"],
      image: "/images/team/Mahmoud Khalil.png",
    },
  ],
};

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export const projectCategories = [
  { value: "all", label: "All Projects" },
  { value: "VIDEO_PRODUCTION", label: "Video Production" },
  { value: "PHOTOGRAPHY", label: "Photography" },
  { value: "GRAPHIC_DESIGN", label: "Graphic Design" },
  { value: "WEB_DEVELOPMENT", label: "Web Development" },
  { value: "APP_DEVELOPMENT", label: "App Development" },
  { value: "THREE_D_MODELING", label: "3D Modeling" },
  { value: "ANIMATION", label: "Animation" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
];

export const packages = [
  {
    id: "package-01",
    tier: "bronze",
    name: "Brand 360 - Package 01",
    subtitle: "Visual & Digital Marketing Retainer",
    price: "10,000",
    currency: "NIS",
    period: "per month",
    minimumCommitment: "Minimum 3 months",
    description: "Perfect for restaurants and businesses that want strong brand presence, consistent content, and measurable marketing results.",
    features: [
      {
        category: "Video Production",
        items: ["3 professional Reels videos per month"],
      },
      {
        category: "Photography",
        items: ["Monthly professional photography session"],
      },
      {
        category: "Drone",
        items: ["Drone footage (exterior shots - based on creative needs)"],
      },
      {
        category: "Graphic Design",
        items: ["Social media posts", "Stories design"],
      },
      {
        category: "Paid Ads Management",
        items: [
          "Meta platforms (Instagram & Facebook)",
          "Audience targeting & ad copywriting",
          "Performance optimization & summary reports",
        ],
      },
      {
        category: "Full Production Services",
        items: [
          "Professional production team",
          "Lighting & equipment",
          "Creative direction, editing, and color grading",
        ],
      },
    ],
    note: "Ad budget is not included",
    idealFor: [
      "Restaurants",
      "Businesses wanting strong brand presence",
      "Consistent content needs",
      "Measurable marketing results",
    ],
    popular: false,
  },
  {
    id: "package-02",
    tier: "silver",
    name: "Brand 360 - Package 02",
    subtitle: "Visual, Marketing & Web Development",
    price: "Custom",
    currency: "",
    period: "based on website scope",
    minimumCommitment: null,
    description: "Ideal for businesses that need a complete digital identity with a strong website that supports advertising and a professional online presence.",
    features: [
      {
        category: "Everything in Package 01",
        items: ["All visual & digital marketing services included"],
      },
      {
        category: "Professional Website Development",
        items: [
          "Custom UI/UX design",
          "Mobile responsive",
          "Services / Menu / Contact pages",
          "Social media integration",
        ],
      },
      {
        category: "Technical Setup",
        items: [
          "Speed optimization",
          "Basic SEO",
          "Google Analytics integration",
        ],
      },
    ],
    note: null,
    idealFor: [
      "Complete digital identity",
      "Strong website that supports advertising",
      "Professional online presence",
    ],
    caseStudy: null,
    popular: true,
  },
  {
    id: "package-03",
    tier: "gold",
    name: "Brand 360 - Package 03",
    subtitle: "Full Digital Ecosystem (Web + Management + App)",
    price: "Custom",
    currency: "",
    period: "fully customized project",
    minimumCommitment: null,
    description: "The complete digital ecosystem for enterprise-level businesses, chains, and digital platforms requiring full integration across all channels.",
    features: [
      {
        category: "Everything in Package 01 & 02",
        items: ["All visual, marketing & web development services included"],
      },
      {
        category: "Full Digital Management",
        items: [
          "Website management",
          "Content updates",
          "Technical maintenance",
        ],
      },
      {
        category: "Mobile App Development",
        items: [
          "iOS & Android development",
          "App UI/UX design",
          "Website/system integration",
          "Booking, ordering, or service-based functionality",
        ],
      },
      {
        category: "Complete Ecosystem Integration",
        items: [
          "Website",
          "Mobile app",
          "Social media",
          "Paid advertising",
        ],
      },
    ],
    note: null,
    idealFor: [
      "Enterprise-level businesses",
      "Restaurant & retail chains",
      "Digital platforms",
      "Full integration requirements",
    ],
    caseStudy: null,
    popular: false,
  },
];
