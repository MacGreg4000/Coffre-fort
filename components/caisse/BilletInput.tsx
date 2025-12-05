"use client"

import { Input } from "@heroui/react"
import { Card, CardBody } from "@heroui/react"
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
    <Card className="bg-default-100">
      <CardBody className="p-3">
        <div className="text-center mb-2">
          <p className="text-xs text-foreground/50 mb-1">Billet de</p>
          <p className="text-base font-semibold text-primary">
            {formatCurrency(denomination)}
          </p>
        </div>
        <Input
          type="number"
          min="0"
          value={quantity.toString()}
          onValueChange={(value) => {
            const numValue = parseInt(value) || 0
            onChange(denomination, numValue)
          }}
          className="text-center"
          placeholder="0"
          size="sm"
        />
        {quantity > 0 && (
          <p className="text-center mt-2 text-xs text-foreground/60 font-medium">
            = {formatCurrency(total)}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
