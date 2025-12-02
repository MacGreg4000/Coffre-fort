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
      className="p-4 rounded-lg bg-cyber-dark border border-cyber-gold/20 hover:border-cyber-gold/50 transition-all"
    >
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">Billet de</p>
        <p className="text-xl font-bold text-cyber-gold">
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
        className="text-center text-lg font-semibold"
        placeholder="0"
      />
      {quantity > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-2 text-sm text-foreground"
        >
          = {formatCurrency(total)}
        </motion.p>
      )}
    </motion.div>
  )
}

