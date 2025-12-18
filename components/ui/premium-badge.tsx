"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PremiumBadgeProps {
  children: React.ReactNode
  variant?: "primary" | "success" | "warning" | "danger" | "info" | "neutral"
  size?: "sm" | "md" | "lg"
  icon?: React.ReactNode
  pulse?: boolean
  className?: string
}

export function PremiumBadge({
  children,
  variant = "primary",
  size = "md",
  icon,
  pulse = false,
  className,
}: PremiumBadgeProps) {
  const variantClasses = {
    primary: "bg-primary/15 text-primary border-primary/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    info: "bg-primary/15 text-primary border-primary/30",
    neutral: "bg-muted/80 text-muted-foreground border-border/60",
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border backdrop-blur font-semibold",
        "shadow-sm hover:shadow-md transition-all duration-300",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {icon && (
        <motion.span
          animate={pulse ? { scale: [1, 1.2, 1] } : {}}
          transition={pulse ? { duration: 2, repeat: Infinity } : {}}
        >
          {icon}
        </motion.span>
      )}
      {children}
    </motion.div>
  )
}

// Status Badge spécifique
interface StatusBadgeProps {
  status: "active" | "pending" | "completed" | "error" | "warning"
  text?: string
}

export function StatusBadge({ status, text }: StatusBadgeProps) {
  const config = {
    active: {
      variant: "success" as const,
      icon: <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />,
      text: text || "Actif",
    },
    pending: {
      variant: "warning" as const,
      icon: <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />,
      text: text || "En attente",
    },
    completed: {
      variant: "success" as const,
      icon: "✓",
      text: text || "Terminé",
    },
    error: {
      variant: "danger" as const,
      icon: "✕",
      text: text || "Erreur",
    },
    warning: {
      variant: "warning" as const,
      icon: "⚠",
      text: text || "Attention",
    },
  }

  const { variant, icon, text: defaultText } = config[status]

  return (
    <PremiumBadge variant={variant} icon={icon} pulse={status === "active" || status === "pending"}>
      {defaultText}
    </PremiumBadge>
  )
}




