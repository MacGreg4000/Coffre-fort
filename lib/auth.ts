// Authentication utilities - NextAuth v4 with improved architecture
import { NextAuthOptions, getServerSession as originalGetServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export interface User {
  id: string
  email: string
  name: string
  role: string
}

// Configuration NextAuth optimisée
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user || !user.isActive) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        } catch (error) {
          console.error('Erreur lors de l\'authentification:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 heures
    updateAge: 60 * 60 // 1 heure
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  }
}

// Helper function compatible avec Next.js 15
export async function getServerSession(options?: Parameters<typeof originalGetServerSession>[0]) {
  try {
    // Pour Next.js 15, nous devons nous assurer que les headers/cookies sont disponibles
    if (options) {
      return await originalGetServerSession(options)
    } else {
      return await originalGetServerSession(authOptions)
    }
  } catch (error) {
    // En cas d'erreur avec les APIs asynchrones, retourner null
    console.warn('Session error (Next.js 15 compatibility):', error)
    return null
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user as any).role || 'USER'
  }
}

export const requireAuth = () => {
  // Placeholder for future middleware enhancements
}