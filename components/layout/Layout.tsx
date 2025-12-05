"use client"

import { SessionProvider } from "next-auth/react"
import { Navbar } from "./Navbar"
import { PageTransition } from "./PageTransition"
import { ToastProvider } from "@/components/ui/toast"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className="min-h-screen">
          <Navbar />
          <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </ToastProvider>
    </SessionProvider>
  )
}

