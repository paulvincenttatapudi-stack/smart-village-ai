"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/layout/navbar"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
          <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
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
            className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-3xl flex items-center justify-center"
          >
            <Search className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
          </motion.div>

          <h1 className="text-7xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            Page Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => router.back()} className="group">
              <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Go Back
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push("/")}>
              <Home className="mr-2 w-4 h-4" />
              Home Page
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
