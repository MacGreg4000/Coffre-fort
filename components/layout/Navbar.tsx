"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@heroui/react"
import {
  LayoutDashboard as LayoutDashboardIcon,
  Wallet,
  History,
  Settings,
  LogOut,
  SunMedium,
  Moon,
} from "lucide-react"
import { useTheme } from "@/components/theme/theme-provider"
import { cn } from "@/lib/utils"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboardIcon, label: "Dashboard" },
    { href: "/caisse", icon: Wallet, label: "Caisse" },
    { href: "/historique", icon: History, label: "Historique" },
    ...(session?.user?.role === "ADMIN"
      ? [{ href: "/admin", icon: Settings, label: "Admin" }]
      : [])
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="sticky top-0 z-50 backdrop-enhanced">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-center h-16 sm:h-20 md:h-24 relative">
          {/* Navigation - icônes carrées flottantes centrées, responsive */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link key={item.href} href={item.href} className="flex items-center justify-center relative group">
                  <motion.div
                    whileHover={{ scale: 1.25, y: -10 }}
                    whileTap={{ scale: 1.05 }}
                    animate={active ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={cn(
                      "relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-2xl",
                      "flex items-center justify-center transition-all duration-300",
                      "shadow-sm hover:shadow-xl cursor-pointer",
                      active 
                        ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/40" 
                        : "bg-card/60 border border-border/60 hover:border-primary/30 hover:bg-card/80"
                    )}
                    style={{ transformOrigin: "center center" }}
                    title={item.label}
                  >
                    {/* Glow effect pour page active */}
                    {active && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl -z-10"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    
                    <Icon 
                      className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-colors",
                        active ? "text-primary" : "text-foreground/70 group-hover:text-foreground"
                      )} 
                    />
                    
                    {/* Indicateur actif en bas */}
                    {active && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.div>
                  
                  {/* Tooltip au hover */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover border border-border rounded-lg text-xs whitespace-nowrap pointer-events-none"
                  >
                    {item.label}
                  </motion.div>
                </Link>
              )
            })}

            {/* Séparateur visuel */}
            <div className="w-px h-8 sm:h-10 md:h-12 bg-border/50 mx-1" />

            {/* Boutons utilitaires */}
            <div className="flex items-center justify-center gap-2">
              <motion.div
                whileHover={{ scale: 1.2, y: -6, rotate: 180 }}
                whileTap={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{ transformOrigin: "center center" }}
              >
                <Button
                  variant="light"
                  isIconOnly
                  onPress={toggleTheme}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/10 transition-all"
                  aria-label="Changer de thème"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={theme}
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 180, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {theme === "dark" ? (
                        <SunMedium className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-warning" />
                      ) : (
                        <Moon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.25, y: -10 }}
                whileTap={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{ transformOrigin: "center center" }}
              >
                <Button
                  variant="light"
                  isIconOnly
                  onPress={() => signOut()}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-2xl border border-border/60 hover:bg-danger/10 hover:border-danger/40 transition-all"
                  aria-label="Déconnexion"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-foreground/70 hover:text-danger transition-colors" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
