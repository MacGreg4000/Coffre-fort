import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { env } from "@/lib/env"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          // Pause pour ralentir les attaques par timing
          await new Promise(resolve => setTimeout(resolve, 1000))
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.isActive) {
          // Pause pour ralentir les attaques par timing
          await new Promise(resolve => setTimeout(resolve, 1000))
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          // Log tentative échouée pour monitoring
          await prisma.log.create({
            data: {
              action: "LOGIN_FAILED",
              description: `Tentative de connexion échouée pour ${credentials.email}`,
              metadata: JSON.stringify({ email: credentials.email }),
              ipAddress: (req as any)?.headers?.["x-forwarded-for"]?.split(",")[0] || "unknown",
              userAgent: (req as any)?.headers?.["user-agent"] || "unknown",
            },
          }).catch(() => {}) // Ignorer les erreurs de log
          
          // Pause pour ralentir les attaques par timing
          await new Promise(resolve => setTimeout(resolve, 1000))
          return null
        }

        // Log connexion réussie
        await prisma.log.create({
          data: {
            userId: user.id,
            action: "LOGIN_SUCCESS",
            description: `Connexion réussie pour ${user.name}`,
            ipAddress: (req as any)?.headers?.["x-forwarded-for"]?.split(",")[0] || "unknown",
            userAgent: (req as any)?.headers?.["user-agent"] || "unknown",
          },
        }).catch(() => {}) // Ignorer les erreurs de log

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
  // Utiliser l'URL de base si NEXTAUTH_URL n'est pas défini
  ...(env.NEXTAUTH_URL && { url: env.NEXTAUTH_URL }),
}

