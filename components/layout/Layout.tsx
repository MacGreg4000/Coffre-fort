"use client"

import { SessionProvider } from "next-auth/react"
import { Navbar } from "./Navbar"
import { PageTransition } from "./PageTransition"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen relative overflow-hidden">
        {/* Décor lumineux */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute left-10 bottom-0 h-80 w-80 rounded-full bg-success/10 blur-[140px]" />
        </div>

        <Navbar />
        <main className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
          <div className="backdrop-blur-md bg-card/60 border border-border/60 rounded-[22px] shadow-[var(--shadow-1)] sm:shadow-[var(--shadow-2)] p-4 sm:p-6 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}

