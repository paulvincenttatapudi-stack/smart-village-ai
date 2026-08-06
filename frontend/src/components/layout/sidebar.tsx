"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, FileText, BarChart3, Map, Bot, ChevronLeft,
  MessageSquare, Bell, Users, Settings, LogOut, Home
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

const sidebarLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/complaints", label: "Complaints", icon: FileText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/map", label: "GIS Map", icon: Map },
  { href: "/admin/assistant", label: "AI Assistant", icon: Bot },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">SV</span>
              </div>
              <span className="font-bold text-lg">Admin Panel</span>
            </Link>
            <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 text-indigo-700 dark:text-indigo-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-indigo-600 dark:text-indigo-400")} />
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
