"use client"

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
          "bg-default-100 border-2 border-divider",
          "hover:border-primary/70 hover:bg-default-200 hover:shadow-md",
          "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:shadow-lg",
          "data-[open=true]:border-primary data-[open=true]:ring-2 data-[open=true]:ring-primary/30",
          "transition-all duration-200",
          "shadow-sm",
          classNames?.trigger
        ),
        value: cn(
          "text-base font-semibold text-foreground",
          "group-data-[placeholder=true]:text-foreground/40 group-data-[placeholder=true]:font-normal",
          classNames?.value
        ),
        label: cn(
          "text-sm font-bold text-foreground/90 mb-1.5",
          classNames?.label
        ),
        popoverContent: cn(
          "bg-default-100 border-2 border-divider shadow-xl",
          classNames?.popoverContent
        ),
        ...classNames,
      }}
      {...props}
    />
  )
}

export function SelectItem(props: SelectItemProps) {
  return (
    <HeroUISelectItem
      classNames={{
        base: "hover:bg-primary/10 focus:bg-primary/10",
        title: "font-medium",
        ...props.classNames,
      }}
      {...props}
    />
  )
}




