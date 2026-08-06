"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Menu, X, ChevronDown, LogOut, User, Settings, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface NavbarProps {
  onMenuToggle?: () => void
  isSidebarOpen?: boolean
}

export function Navbar({ onMenuToggle, isSidebarOpen }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const closeUserMenu = useCallback(() => setShowUserMenu(false), [])

  useEffect(() => {
    if (!showUserMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        closeUserMenu()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUserMenu()
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [showUserMenu, closeUserMenu])

  const isLanding = pathname === "/"
  const isAdminPage = pathname.startsWith("/admin")

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || !isLanding
          ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <div className="flex items-center gap-3">
            {(isAdminPage || (user && !isLanding)) && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            <Link href={isAdmin ? "/admin/dashboard" : "/"} className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">SV</span>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Smart Village
              </span>
            </Link>
          </div>

          {isLanding && !user && (
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="#about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                About
              </Link>
              <Link href="/demo" className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Live Demo
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{user.full_name.split(" ")[0]}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <div className="p-1">
                        {isAdmin && (
                          <button
                            onClick={() => { router.push("/admin/dashboard"); setShowUserMenu(false) }}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Admin Dashboard
                          </button>
                        )}
                        <button
                          onClick={() => { router.push("/complaints/view"); setShowUserMenu(false) }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          My Complaints
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push("/auth/citizen-login")}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => router.push("/register")}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
