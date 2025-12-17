"use client"

import { Button, ButtonProps } from "@heroui/react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PremiumButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: "primary" | "secondary" | "success" | "danger" | "gradient"
  glow?: boolean
}

export function PremiumButton({
  variant = "primary",
  glow = false,
  className,
  children,
  isDisabled,
  isLoading,
  ...props
}: PremiumButtonProps) {
  const variantClasses = {
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
    secondary: "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
    success: "bg-success hover:bg-success/90 text-success-foreground",
    danger: "bg-danger hover:bg-danger/90 text-danger-foreground",
    gradient: "bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-size-200 hover:bg-pos-100 text-white",
  }

  return (
    <motion.div
      className="relative inline-block"
      whileHover={!isDisabled && !isLoading ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled && !isLoading ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Glow effect */}
      {glow && !isDisabled && (
        <motion.div
          className={cn(
            "absolute -inset-1 rounded-2xl blur-lg -z-10 opacity-0 group-hover:opacity-60",
            variant === "primary" && "bg-primary/40",
            variant === "secondary" && "bg-secondary/40",
            variant === "success" && "bg-success/40",
            variant === "danger" && "bg-danger/40",
            variant === "gradient" && "bg-gradient-to-r from-primary via-primary/80 to-primary/60"
          )}
          animate={{
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <Button
        {...props}
        variant="solid"
        isDisabled={isDisabled}
        isLoading={isLoading}
        className={cn(
          "relative overflow-hidden font-semibold shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] transition-all duration-300",
          variantClasses[variant],
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
          className
        )}
      >
        {children}
      </Button>
    </motion.div>
  )
}



