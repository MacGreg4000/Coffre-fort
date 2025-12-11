"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full sm:w-auto pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="pointer-events-auto p-4 rounded-xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-2)] flex items-start gap-3 min-w-[300px]"
              style={{
                borderColor:
                  toast.type === "success"
                    ? "rgba(34, 197, 94, 0.3)"
                    : toast.type === "error"
                    ? "rgba(239, 68, 68, 0.3)"
                    : "rgba(160, 200, 220, 0.3)",
              }}
            >
              {toast.type === "success" && (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              )}
              {toast.type === "error" && (
                <XCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
              )}
              {toast.type === "info" && (
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              )}
              <p
                className="flex-1 text-sm"
                style={{
                  color:
                    toast.type === "success"
                      ? "#22c55e"
                      : toast.type === "error"
                      ? "#ef4444"
                      : "#a0c8dc",
                }}
              >
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}




