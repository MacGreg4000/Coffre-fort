"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { PremiumBadge } from "./premium-badge"

interface PageHeaderProps {
  title: string
  description?: string
  badge?: {
    icon: ReactNode
    text: string
  }
  actions?: ReactNode
  children?: ReactNode
}

export function PageHeader({ title, description, badge, actions, children }: PageHeaderProps) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3 flex-1">
            {badge && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PremiumBadge variant="primary" icon={badge.icon} size="md">
                  {badge.text}
                </PremiumBadge>
              </motion.div>
            )}
            
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold"
            >
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                {title}
              </span>
            </motion.h1>
            
            {description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-base sm:text-lg text-foreground/70 max-w-3xl leading-relaxed"
              >
                {description}
              </motion.p>
            )}
          </div>

          {actions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex-shrink-0"
            >
              {actions}
            </motion.div>
          )}
        </div>

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {children}
          </motion.div>
        )}
      </motion.div>

      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="h-px bg-gradient-to-r from-transparent via-border to-transparent origin-left"
      />
    </div>
  )
}



