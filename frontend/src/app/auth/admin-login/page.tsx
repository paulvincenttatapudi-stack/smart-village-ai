"use client"

import { useState, FormEvent } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Shield, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  const validate = () => {
    const errors: { username?: string; password?: string } = {}
    if (!username.trim()) errors.username = "Email or username is required"
    if (!password) errors.password = "Password is required"
    else if (password.length < 6) errors.password = "Password must be at least 6 characters"
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validate()) return
    setLoading(true)
    try {
      await login(username.trim(), password)
      router.push("/admin/dashboard")
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String(err.message)
        : "Login failed. Please check your credentials."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <div className="relative min-h-screen flex items-center justify-center pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md mx-auto px-4"
        >
          <Card className="glass-card border-gray-200/50 dark:border-gray-800/50">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mx-auto mb-4 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center"
              >
                <Shield className="w-7 h-7 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Login
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Sign in to manage complaints and view analytics
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => ({ ...p, username: undefined })) }}
                      placeholder="Enter your email or username"
                      className={cn(
                        "w-full h-11 pl-10 pr-4 rounded-xl border bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                        fieldErrors.username
                          ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                          : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500"
                      )}
                      autoComplete="username"
                    />
                  </div>
                  {fieldErrors.username && (
                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.username}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })) }}
                      placeholder="Enter your password"
                      className={cn(
                        "w-full h-11 pl-10 pr-12 rounded-xl border bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                        fieldErrors.password
                          ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                          : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500"
                      )}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 text-base">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-400 bg-white/50 dark:bg-gray-950/50">or</span>
                </div>
              </div>

              <Link href="/auth/citizen-login" className="w-full">
                <Button variant="outline" className="w-full h-11">
                  <User className="mr-2 w-4 h-4" />
                  Citizen Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
