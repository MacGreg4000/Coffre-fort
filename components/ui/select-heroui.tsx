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
          "h-12 min-h-12",
          "px-4",
          "bg-default-100 border-2 border-divider rounded-lg",
          "hover:border-primary/70 hover:bg-default-200 hover:shadow-md",
          "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:shadow-lg",
          "data-[open=true]:border-primary data-[open=true]:ring-2 data-[open=true]:ring-primary/30",
          "transition-all duration-200",
          "shadow-sm",
          classNames?.trigger
        ),
        value: cn(
          "text-base font-semibold text-foreground",
          "px-0",
          "group-data-[placeholder=true]:text-foreground/40 group-data-[placeholder=true]:font-normal",
          classNames?.value
        ),
        label: cn(
          "text-sm font-bold text-foreground/90 mb-1.5",
          "px-0",
          classNames?.label
        ),
        popoverContent: cn(
          "bg-default-100 border-2 border-divider shadow-xl",
          "p-2",
          classNames?.popoverContent
        ),
        listbox: cn(
          "p-2 gap-1",
          classNames?.listbox
        ),
        selectorIcon: cn(
          "text-foreground/50",
          classNames?.selectorIcon
        ),
        ...classNames,
      }}
      itemClasses={{
        base: "px-3 py-2.5 rounded-md hover:bg-primary/10 focus:bg-primary/10 transition-colors",
        title: "font-medium px-0",
      }}
      {...props}
    />
  )
}

// Export direct de SelectItem pour éviter les problèmes avec getCollectionNode
export { SelectItem } from "@heroui/react"




