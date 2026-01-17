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
    maxAge: 30 * 24 * 60 * 60, // 30 jours (par défaut)
    updateAge: 24 * 60 * 60, // Rotation toutes les 24 heures
  },
  callbacks: {
    async jwt({ token, user }) {
      // Lors de la création initiale de la session
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.iat = Math.floor(Date.now() / 1000) // Issued at
        token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // Expire dans 30 jours
        token.lastUpdate = Math.floor(Date.now() / 1000)
      }

      // Rotation de session (toutes les 24h) - seulement si le token existe déjà
      if (token.id && token.lastUpdate) {
        const now = Math.floor(Date.now() / 1000)
        const lastUpdate = (token.lastUpdate as number) || (token.iat as number) || now
        const updateInterval = 24 * 60 * 60 // 24 heures

        if (now - lastUpdate > updateInterval) {
          try {
            // Vérifier que l'utilisateur existe toujours et est actif
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { isActive: true },
            })

            if (!dbUser || !dbUser.isActive) {
              // Utilisateur désactivé, invalider la session
              throw new Error("UserInactive")
            }

            // Mettre à jour le timestamp de dernière mise à jour
            token.lastUpdate = now
            token.iat = now // Mettre à jour l'issued at pour la rotation
          } catch (error) {
            // En cas d'erreur, invalider la session
            token.error = "UserInactive"
          }
        }

        // Vérifier l'expiration
        if (token.exp && now > (token.exp as number)) {
          token.error = "TokenExpired"
        }
      }

      return token
    },
    async session({ session, token }) {
      // Si le token a une erreur, invalider la session
      if ((token as any).error) {
        return {
          ...session,
          user: null as any,
        }
      }

      if (session.user && token.id) {
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

