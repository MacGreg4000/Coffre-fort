"use client"

import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface PremiumCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  children: ReactNode
  variant?: "default" | "glass" | "gradient" | "bordered"
  hover3D?: boolean
  glow?: boolean
  shimmer?: boolean
  className?: string
}

export function PremiumCard({
  children,
  variant = "default",
  hover3D = false,
  glow = false,
  shimmer = false,
  className,
  ...props
}: PremiumCardProps) {
  const baseClasses = "rounded-2xl overflow-hidden relative transition-all duration-300"
  
  const variantClasses = {
    default: "bg-card border border-border/60 shadow-[var(--shadow-1)]",
    glass: "glass-card",
    gradient: "bg-gradient-to-br from-card/95 via-card/90 to-card/80 backdrop-blur border border-primary/20",
    bordered: "border-gradient bg-card shadow-[var(--shadow-2)]",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover3D ? { 
        scale: 1.02, 
        y: -8,
        rotateX: 2,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      } : undefined}
      className={cn(
        baseClasses,
        variantClasses[variant],
        hover3D && "card-3d",
        shimmer && "gradient-shimmer",
        className
      )}
      {...props}
    >
      {/* Glow effect */}
      {glow && (
        <motion.div
          className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/15 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 -z-10"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      
      {/* Shimmer overlay */}
      {shimmer && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 1,
            }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

// Stats Card spécifique
interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
  return (
    <PremiumCard 
      variant="glass" 
      hover3D 
      glow
      className={cn("p-5 sm:p-6 group", className)}
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div 
          className="p-3 rounded-xl bg-primary/15 border border-primary/20"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {icon}
        </motion.div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
            trend.isPositive 
              ? "bg-success/15 text-success" 
              : "bg-danger/15 text-danger"
          )}>
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-xs text-foreground/60 font-medium">{title}</p>
        <motion.p 
          className="text-2xl sm:text-3xl font-bold text-foreground"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {value}
        </motion.p>
      </div>
      
      {/* Decorative gradient */}
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/10 to-transparent rounded-tl-[100px] -z-10" />
    </PremiumCard>
  )
}

// Feature Card
interface FeatureCardProps {
  title: string
  description: string
  icon: ReactNode
  action?: ReactNode
  className?: string
}

export function FeatureCard({ title, description, icon, action, className }: FeatureCardProps) {
  return (
    <PremiumCard
      variant="gradient"
      hover3D
      shimmer
      className={cn("p-6 group", className)}
    >
      <div className="flex items-start gap-4">
        <motion.div
          className="flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30"
          whileHover={{ scale: 1.1, rotate: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {icon}
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-foreground/70 mb-4">
            {description}
          </p>
          {action && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {action}
            </motion.div>
          )}
        </div>
      </div>
    </PremiumCard>
  )
}

