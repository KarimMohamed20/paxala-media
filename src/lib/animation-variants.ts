import { Variants } from "framer-motion";

// === TRANSITION PRESETS ===
export const transitions = {
  spring: { type: "spring", stiffness: 300, damping: 30 },
  springBouncy: { type: "spring", stiffness: 400, damping: 20 },
  smooth: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  easeOut: { duration: 0.5, ease: "easeOut" },
  easeInOut: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 1, ease: [0.25, 0.1, 0.25, 1] },
  cinematic: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
} as const;

// === PAGE TRANSITIONS ===
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 40,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    y: -30,
    transition: { duration: 0.4, ease: "easeIn" }
  },
};

// === CINEMATIC SECTION ANIMATIONS ===
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

export const fadeUpSpring: Variants = {
  hidden: { opacity: 0, y: 80 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    }
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut" }
  },
};

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    }
  },
};

export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -100,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

export const slideInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

export const slideInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 100,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

// === STAGGER CONTAINERS ===
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.15,
    },
  },
};

// === TEXT REVEAL ANIMATIONS ===
export const textRevealContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

export const letterReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    rotateX: -90,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 15,
    }
  },
};

export const wordReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

export const lineReveal: Variants = {
  hidden: {
    opacity: 0,
    y: "100%",
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

// === MICRO-INTERACTIONS ===
export const buttonHover = {
  scale: 1.05,
  y: -2,
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

export const buttonTap = {
  scale: 0.95,
};

export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    rotateX: 0,
    rotateY: 0,
  },
  hover: {
    scale: 1.02,
    y: -12,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
};

export const card3DHover = {
  rest: {
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.3 },
  },
};

export const linkHover = {
  x: 8,
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

export const iconHover = {
  scale: 1.2,
  rotate: 5,
  transition: { type: "spring", stiffness: 400, damping: 15 },
};

// === IMAGE ANIMATIONS ===
export const imageReveal: Variants = {
  hidden: {
    scale: 1.3,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

export const imageMaskReveal: Variants = {
  hidden: {
    clipPath: "inset(100% 0 0 0)",
  },
  visible: {
    clipPath: "inset(0% 0 0 0)",
    transition: {
      duration: 1,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

// === PARALLAX HELPERS ===
export const parallaxY = (distance: number = 100): Variants => ({
  hidden: { y: distance },
  visible: {
    y: 0,
    transition: {
      duration: 1,
      ease: "linear",
    }
  },
});

// === LOADING STATES ===
export const shimmer: Variants = {
  initial: {
    backgroundPosition: "-200% 0",
  },
  animate: {
    backgroundPosition: "200% 0",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  },
};

export const pulse: Variants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: 1,
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    }
  },
};

export const spin: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    }
  },
};

// === SPECIAL EFFECTS ===
export const floatAnimation: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }
  },
};

export const glowPulse: Variants = {
  initial: {
    boxShadow: "0 0 20px rgba(226, 12, 12, 0.3)",
  },
  animate: {
    boxShadow: [
      "0 0 20px rgba(226, 12, 12, 0.3)",
      "0 0 40px rgba(226, 12, 12, 0.6)",
      "0 0 20px rgba(226, 12, 12, 0.3)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }
  },
};

// === DRAW LINE ANIMATION ===
export const drawLine: Variants = {
  hidden: { pathLength: 0 },
  visible: {
    pathLength: 1,
    transition: {
      duration: 1.5,
      ease: "easeInOut",
    }
  },
};

// === MARQUEE ===
export const marquee = (duration: number = 20): Variants => ({
  animate: {
    x: [0, -1000],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: "loop",
        duration,
        ease: "linear",
      },
    },
  },
});

// === COUNT UP HELPER ===
export const countUpTransition = {
  duration: 2,
  ease: [0.25, 0.1, 0.25, 1],
};

// === VIEWPORT SETTINGS ===
export const defaultViewport = {
  once: true,
  amount: 0.3,
  margin: "-100px",
};

export const eagerViewport = {
  once: true,
  amount: 0.1,
};
