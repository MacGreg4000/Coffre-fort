"use client"

import { SessionProvider } from "next-auth/react"
import { Navbar } from "./Navbar"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-b from-cyber-dark to-cyber-dark-lighter">
        <Navbar />
        <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}

