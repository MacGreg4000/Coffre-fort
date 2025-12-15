"use client"

import { Input, InputProps } from "@heroui/react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface PremiumInputProps extends InputProps {
  icon?: React.ReactNode
}

export function PremiumInput({ icon, className, ...props }: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className="relative">
      {/* Glow effect on focus */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/15 to-primary/20 rounded-2xl blur opacity-0 -z-10"
        animate={{ opacity: isFocused ? 0.6 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      <Input
        {...props}
        className={cn("transition-all duration-300", className)}
        classNames={{
          base: "transition-all",
          inputWrapper: cn(
            "bg-card/60 backdrop-blur border-2 transition-all duration-300",
            "data-[hover=true]:bg-card/80 data-[hover=true]:border-primary/30",
            isFocused && "border-primary/60 bg-card/80 shadow-[var(--shadow-2)]"
          ),
          input: "text-foreground placeholder:text-foreground/40",
        }}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
        startContent={icon && (
          <motion.div
            animate={{ scale: isFocused ? 1.1 : 1, color: isFocused ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.6)" }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}
      />
    </div>
  )
}

