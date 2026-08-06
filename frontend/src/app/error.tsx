"use client"

import { motion } from "framer-motion"
import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/layout/navbar"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-950 dark:to-red-950/20" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center px-4 max-w-lg mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950/50 dark:to-orange-950/50 rounded-3xl flex items-center justify-center"
          >
            <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
          </motion.div>

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            Something went wrong
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-8 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          {!error.digest && <div className="mb-8" />}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={reset} className="group">
              <RefreshCw className="mr-2 w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Try Again
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              <Home className="mr-2 w-4 h-4" />
              Home Page
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
