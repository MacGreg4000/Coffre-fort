"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
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
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-center h-16 sm:h-20 md:h-24 relative">
          {/* Navigation - icônes carrées flottantes centrées, responsive */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.3, y: -8 }}
                    whileTap={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl bg-default-100 hover:bg-default-200 border border-divider flex items-center justify-center transition-all shadow-sm hover:shadow-lg cursor-pointer"
                    style={{ transformOrigin: "center center" }}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-foreground" />
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
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl bg-default-100 hover:bg-default-200 border border-divider flex items-center justify-center transition-all shadow-sm hover:shadow-lg cursor-pointer"
                style={{ transformOrigin: "center center" }}
                title={session?.user?.name || "Utilisateur"}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-foreground" />
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
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl border border-divider hover:bg-danger/10 hover:border-danger/30"
                  aria-label="Déconnexion"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-foreground/70 hover:text-danger" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
