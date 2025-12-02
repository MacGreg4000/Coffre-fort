"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  User
} from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="border-b border-cyber-gold/20 bg-cyber-dark-lighter/80 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Wallet className="h-8 w-8 text-cyber-gold" />
            </motion.div>
            <span className="text-2xl font-bold text-cyber-gold">SafeGuard</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-foreground hover:text-cyber-gold">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/caisse">
              <Button variant="ghost" className="text-foreground hover:text-cyber-gold">
                <Wallet className="h-4 w-4 mr-2" />
                Caisse
              </Button>
            </Link>
            <Link href="/historique">
              <Button variant="ghost" className="text-foreground hover:text-cyber-gold">
                <History className="h-4 w-4 mr-2" />
                Historique
              </Button>
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin">
                <Button variant="ghost" className="text-foreground hover:text-cyber-gold">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            
            <div className="flex items-center space-x-2 border-l border-cyber-gold/20 pl-4">
              <User className="h-4 w-4 text-cyber-gold" />
              <span className="text-sm text-foreground">{session?.user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

