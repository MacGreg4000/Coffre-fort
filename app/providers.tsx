"use client"

import { HeroUIProvider } from "@heroui/react"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { ToastProvider } from "@/components/ui/toast"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </HeroUIProvider>
  )
}




