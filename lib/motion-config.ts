// Configuration optimisée pour Framer Motion
// Réduit le nombre de calculs en mode dev

export const reducedMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
}

export const fastSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
}

export const standardSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 20,
}

// Optimisation: désactiver les animations complexes si préférence utilisateur
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Variants optimisés pour les cartes
export const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: fastSpring
  },
  exit: { opacity: 0, y: -20 }
}

// Variants pour les listes (stagger)
export const listVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  }
}

export const listItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: fastSpring
  }
}

// Hover effects optimisés (will-change: transform pour GPU)
export const hoverScale = {
  whileHover: { 
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  whileTap: { scale: 0.98 }
}

export const hoverLift = {
  whileHover: { 
    y: -4,
    transition: { duration: 0.2 }
  }
}


