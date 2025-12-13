"use client"

import React from "react"
import { Select as HeroUISelect, SelectItem as HeroUISelectItem, SelectProps, SelectItemProps } from "@heroui/react"
import { cn } from "@/lib/utils"

// Composant Select uniformisé avec style plus visible
export function Select({ 
  className, 
  classNames,
  ...props 
}: SelectProps) {
  return (
    <HeroUISelect
      className={cn("w-full", className)}
      classNames={{
        trigger: cn(
          "min-h-[56px] px-4 py-3",
          "rounded-2xl border border-primary/25 bg-gradient-to-br from-card/95 via-card/90 to-card/80 backdrop-blur",
          "shadow-[var(--shadow-2)]",
          "hover:border-primary/50 hover:shadow-[0_12px_35px_rgba(0,0,0,0.08)] hover:bg-primary/6",
          "focus:border-primary focus:ring-2 focus:ring-primary/35 focus:shadow-[0_16px_40px_rgba(0,0,0,0.12)]",
          "data-[open=true]:border-primary data-[open=true]:ring-2 data-[open=true]:ring-primary/40 data-[open=true]:shadow-[0_16px_40px_rgba(0,0,0,0.12)]",
          "transition-all duration-200",
          classNames?.trigger
        ),
        value: cn(
          "text-base font-semibold text-foreground",
          "pl-1.5 pr-0",
          "group-data-[placeholder=true]:text-foreground/55 group-data-[placeholder=true]:font-medium",
          classNames?.value
        ),
        label: cn(
          "text-sm font-semibold text-foreground/85 mb-1.5 pl-0.5 pr-0",
          classNames?.label
        ),
        popoverContent: cn(
          "bg-card/95 backdrop-blur-2xl border border-primary/20 shadow-[var(--shadow-2)]",
          "p-2 rounded-2xl",
          "data-[slot=base]:px-3 data-[slot=base]:py-2.5 data-[slot=base]:rounded-lg",
          classNames?.popoverContent
        ),
        listbox: cn(
          "p-1.5 gap-1",
          "[&>li]:px-3 [&>li]:py-2.5 [&>li]:rounded-lg",
          "[&>li]:hover:bg-primary/10 [&>li]:focus:bg-primary/12",
          "[&>li]:transition-all [&>li]:text-foreground/90",
          "[&>li]:font-semibold",
          classNames?.listbox
        ),
        selectorIcon: cn(
          "text-foreground/60",
          classNames?.selectorIcon
        ),
        ...classNames,
      }}
      {...props}
    />
  )
}

// Export direct de SelectItem pour éviter les problèmes avec getCollectionNode
export { SelectItem } from "@heroui/react"




