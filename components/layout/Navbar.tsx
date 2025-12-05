"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@heroui/react"
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
    <nav className="sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-24 relative">
          {/* Desktop Navigation - icônes carrées flottantes centrées */}
          <div className="hidden md:flex items-center gap-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.3, y: -8 }}
                    whileTap={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="w-16 h-16 rounded-xl bg-default-100 hover:bg-default-200 border border-divider flex items-center justify-center shadow-sm hover:shadow-lg cursor-pointer"
                    style={{ transformOrigin: "center center" }}
                    title={item.label}
                  >
                    <Icon className="h-6 w-6 text-foreground" />
                  </motion.div>
                </Link>
              )
            })}
            
            {/* Icône utilisateur flottante */}
            <div className="flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.3, y: -8 }}
                whileTap={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-sm hover:shadow-lg cursor-pointer"
                style={{ transformOrigin: "center center" }}
                title={session?.user?.name || "Utilisateur"}
              >
                <User className="h-6 w-6 text-primary" />
              </motion.div>
            </div>
            
            {/* Bouton déconnexion */}
            <div className="flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.3, y: -8 }}
                whileTap={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                style={{ transformOrigin: "center center" }}
              >
                <Button
                  variant="light"
                  isIconOnly
                  onPress={() => signOut()}
                  className="w-16 h-16 rounded-xl border border-divider hover:bg-danger/10 hover:border-danger/30"
                  aria-label="Déconnexion"
                >
                  <LogOut className="h-6 w-6 text-foreground/70 hover:text-danger" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Mobile Menu Button - positionné à droite */}
          <Button
            variant="light"
            isIconOnly
            className="md:hidden absolute right-0 w-10 h-10 rounded-xl"
            onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-divider overflow-hidden bg-background/95 backdrop-blur-sm"
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
                      <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-default-100 hover:bg-default-200 transition-colors">
                        <Icon className="h-5 w-5 text-foreground" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </Link>
                  )
                })}
                
                <div className="border-t border-divider pt-2 mt-2">
                  <div className="flex items-center space-x-3 px-4 py-2">
                    <User className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground/60">{session?.user?.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut()
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-danger hover:bg-danger/10 rounded-xl transition-colors"
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
    </nav>
  )
}
