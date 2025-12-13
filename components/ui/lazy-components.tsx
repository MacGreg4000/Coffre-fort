"use client"

import { lazy, Suspense, ComponentType } from "react"
import { Spinner } from "@heroui/react"

// ============================================
// LAZY LOADING HELPERS
// ============================================

/**
 * Wrapper pour lazy loading avec fallback de chargement
 */
export function lazyWithSpinner<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn)
  
  return function LazyWrapper(props: any) {
    return (
      <Suspense
        fallback={
          fallback || (
            <div className="flex items-center justify-center p-8">
              <Spinner size="lg" label="Chargement..." />
            </div>
          )
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * Lazy load des charts (lourds)
 */
export const LazyDashboardCharts = lazyWithSpinner(
  () => import('@/components/dashboard/DashboardCharts')
)

/**
 * Lazy load de l'historique (liste potentiellement longue)
 */
export const LazyHistoriqueList = lazyWithSpinner(
  () => import('@/components/historique/HistoriqueList')
)

/**
 * Lazy load de l'admin panel
 */
export const LazyAdminPanel = lazyWithSpinner(
  () => import('@/components/admin/AdminPanel')
)

/**
 * Skeleton placeholder pour les cards
 */
export function CardSkeleton() {
  return (
    <div className="bg-card/70 backdrop-blur border border-border/60 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-foreground/10 rounded w-3/4 mb-4"></div>
      <div className="h-8 bg-foreground/10 rounded w-1/2"></div>
    </div>
  )
}

/**
 * Skeleton pour les listes
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card/70 backdrop-blur border border-border/60 rounded-xl p-4 animate-pulse"
        >
          <div className="h-4 bg-foreground/10 rounded w-1/4 mb-3"></div>
          <div className="h-3 bg-foreground/10 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-foreground/10 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton pour les charts
 */
export function ChartSkeleton() {
  return (
    <div className="bg-card/70 backdrop-blur border border-border/60 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-foreground/10 rounded w-1/3 mb-6"></div>
      <div className="h-64 bg-foreground/5 rounded-lg"></div>
    </div>
  )
}
