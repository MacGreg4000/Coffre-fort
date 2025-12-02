"use client"

import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

interface BilletInputProps {
  denomination: number
  quantity: number
  onChange: (denomination: number, quantity: number) => void
}

export function BilletInput({
  denomination,
  quantity,
  onChange,
}: BilletInputProps) {
  const total = denomination * quantity

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-3 sm:p-4 rounded-lg bg-cyber-dark border border-cyber-gold/20 hover:border-cyber-gold/50 transition-all"
    >
      <div className="text-center mb-2">
        <p className="text-xs sm:text-sm text-muted-foreground">Billet de</p>
        <p className="text-lg sm:text-xl font-bold text-cyber-gold">
          {formatCurrency(denomination)}
        </p>
      </div>
      <Input
        type="number"
        min="0"
        value={quantity || ""}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 0
          onChange(denomination, value)
        }}
        className="text-center text-base sm:text-lg font-semibold"
        placeholder="0"
        inputMode="numeric"
      />
      {quantity > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-2 text-xs sm:text-sm text-foreground font-medium"
        >
          = {formatCurrency(total)}
        </motion.p>
      )}
    </motion.div>
  )
}

