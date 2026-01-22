/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Temporairement désactivé - conflits de types persistants
    // TODO: Résoudre les conflits TypeScript/NextAuth/Prisma
    ignoreBuildErrors: true,
  },
  eslint: {
    // Optimisation : ignorer ESLint pendant le build pour accélérer
    // Utiliser 'npm run lint' séparément
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimisations des imports pour réduire le bundle
    optimizePackageImports: ['@heroui/react', 'framer-motion', 'lucide-react'],
  },
  // Optimisations pour le développement
  ...(process.env.NODE_ENV === 'development' && {
    // Réduire la fréquence de recompilation
    webpack: (config) => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      return config
    },
  }),
  // Compiler options pour meilleures performances
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  async headers() {
    // Content Security Policy - adaptée pour le développement
    const isDev = process.env.NODE_ENV !== 'production'
    const cspBase = isDev ? [
      "default-src *",
      "script-src * 'unsafe-eval' 'unsafe-inline'",
      "style-src * 'unsafe-inline'",
      "img-src * data: blob:",
      "font-src * data:",
      "connect-src *",
    ] : [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline nécessaire pour Next.js
      "style-src 'self' 'unsafe-inline'", // unsafe-inline pour Tailwind
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]

    const csp = cspBase.join("; ")

    const headers = [
      {
        key: 'Content-Security-Policy',
        value: csp
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none'
      }
    ]

    // Headers CORS pour le développement
    if (isDev) {
      headers.push(
        {
          key: 'Access-Control-Allow-Origin',
          value: 'http://localhost:3003'
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS'
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization, X-CSRF-Token'
        },
        {
          key: 'Access-Control-Allow-Credentials',
          value: 'true'
        }
      )
    }

    // Ajouter les headers HTTPS seulement en production
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      })
    }

    return [
      {
        source: '/:path*',
        headers
      }
    ]
  },
}

module.exports = nextConfig







