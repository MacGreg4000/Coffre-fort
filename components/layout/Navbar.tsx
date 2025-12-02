"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  User,
  Menu,
  X
} from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/caisse", icon: Wallet, label: "Caisse" },
    { href: "/historique", icon: History, label: "Historique" },
    ...(session?.user?.role === "ADMIN" 
      ? [{ href: "/admin", icon: Settings, label: "Admin" }]
      : [])
  ]

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="border-b border-blue-500/10 bg-cyber-dark-lighter/95 backdrop-blur-md sticky top-0 z-50 shadow-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Wallet className="h-8 w-8 text-blue-400" />
            </motion.div>
            <span className="text-xl sm:text-2xl font-bold text-blue-400">SafeGuard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="ghost" className="text-foreground/80 hover:text-blue-400 transition-all hover:scale-105">
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
            
            <div className="flex items-center space-x-2 border-l border-blue-500/10 pl-4">
              <User className="h-4 w-4 text-blue-400/70" />
              <span className="text-sm text-foreground hidden lg:inline">{session?.user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-foreground hover:text-destructive"
                aria-label="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-blue-400" />
            ) : (
              <Menu className="h-6 w-6 text-blue-400" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-blue-500/10 overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-3 px-4 py-3 text-foreground hover:bg-blue-500/10 rounded-lg transition-all hover:scale-105"
                      >
                        <Icon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  )
                })}
                
                <div className="border-t border-blue-500/10 pt-2 mt-2">
                  <div className="flex items-center space-x-3 px-4 py-2">
                    <User className="h-5 w-5 text-blue-400" />
                    <span className="text-sm text-foreground">{session?.user?.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut()
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Déconnexion</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}

