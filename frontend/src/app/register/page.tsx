"use client"

import { useState, FormEvent } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Home,
  ArrowRight, Loader2, AlertCircle, CheckCircle, Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import api, { ApiError } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FieldErrors {
  email?: string
  username?: string
  password?: string
  confirm_password?: string
  full_name?: string
  phone?: string
  ward_number?: string
  village?: string
  district?: string
  state?: string
}

const fieldBackendMap: Record<string, keyof FieldErrors> = {
  email: "email",
  username: "username",
  password: "password",
  full_name: "full_name",
  phone: "phone",
  ward_number: "ward_number",
  village: "village",
  district: "district",
  state: "state",
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirm_password: "",
    full_name: "",
    phone: "",
    ward_number: "",
    village: "",
    district: "",
    state: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!form.email.trim()) errors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email address"
    if (!form.username.trim()) errors.username = "Username is required"
    else if (form.username.length < 3) errors.username = "Username must be at least 3 characters"
    if (!form.password) errors.password = "Password is required"
    else if (form.password.length < 8) errors.password = "Password must be at least 8 characters"
    else if (!/[A-Z]/.test(form.password)) errors.password = "Password must contain an uppercase letter"
    else if (!/[0-9]/.test(form.password)) errors.password = "Password must contain a digit"
    if (!form.confirm_password) errors.confirm_password = "Please confirm your password"
    else if (form.password !== form.confirm_password) errors.confirm_password = "Passwords do not match"
    if (!form.full_name.trim()) errors.full_name = "Full name is required"
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) errors.phone = "Invalid phone number"
    if (form.ward_number && (isNaN(Number(form.ward_number)) || Number(form.ward_number) < 1))
      errors.ward_number = "Ward number must be a positive number"
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validate()) return
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
      }
      if (form.phone.trim()) payload.phone = form.phone.trim()
      if (form.ward_number.trim()) payload.ward_number = Number(form.ward_number)
      if (form.village.trim()) payload.village = form.village.trim()
      if (form.district.trim()) payload.district = form.district.trim()
      if (form.state.trim()) payload.state = form.state.trim()
      await api.post("/api/auth/register", payload)
      toast.success("Registration successful! Please sign in to continue.")
      router.push("/auth/citizen-login")
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err && err.fieldErrors) {
        const mapped: FieldErrors = {}
        for (const [backendField, message] of Object.entries(err.fieldErrors as Record<string, unknown>)) {
          const formField = fieldBackendMap[backendField]
          if (formField) {
            mapped[formField] = typeof message === "string" ? message : ""
          }
        }
        setFieldErrors(mapped)
        const errMessage = (err as Record<string, unknown>).message
        setError(typeof errMessage === "string" ? errMessage : "Please fix the errors below.")
      } else if (err instanceof Error) {
        setError(err.message)
      } else if (err && typeof err === "object" && "message" in err) {
        setError(String(err.message))
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field: keyof FieldErrors) =>
    cn(
      "w-full h-11 pl-10 pr-4 rounded-xl border bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
      fieldErrors[field]
        ? "border-red-300 dark:border-red-700 focus:ring-red-500"
        : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500"
    )

  const inputIcon = (icon: React.ReactNode) => (
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
      {icon}
    </div>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <div className="relative min-h-screen flex items-center justify-center pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
          <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-lg mx-auto px-4"
        >
          <Card className="glass-card border-gray-200/50 dark:border-gray-800/50">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mx-auto mb-4 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center"
              >
                <User className="w-7 h-7 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Account
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Join the Smart Village platform to report and track complaints
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      {inputIcon(<User className="w-4 h-4" />)}
                      <input
                        id="full_name"
                        type="text"
                        value={form.full_name}
                        onChange={(e) => updateField("full_name", e.target.value)}
                        placeholder="John Doe"
                        className={inputClass("full_name")}
                        autoComplete="name"
                      />
                    </div>
                    {fieldErrors.full_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.full_name}</p>}
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      {inputIcon(<User className="w-4 h-4" />)}
                      <input
                        id="username"
                        type="text"
                        value={form.username}
                        onChange={(e) => updateField("username", e.target.value)}
                        placeholder="johndoe"
                        className={inputClass("username")}
                        autoComplete="username"
                      />
                    </div>
                    {fieldErrors.username && <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    {inputIcon(<Mail className="w-4 h-4" />)}
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="john@example.com"
                      className={inputClass("email")}
                      autoComplete="email"
                    />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      {inputIcon(<Lock className="w-4 h-4" />)}
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        placeholder="Min. 8 chars, uppercase + digit"
                        className={cn(inputClass("password"), "pr-12")}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      {inputIcon(<Lock className="w-4 h-4" />)}
                      <input
                        id="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirm_password}
                        onChange={(e) => updateField("confirm_password", e.target.value)}
                        placeholder="Repeat password"
                        className={cn(inputClass("confirm_password"), "pr-12")}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirm_password && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirm_password}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone
                    </label>
                    <div className="relative">
                      {inputIcon(<Phone className="w-4 h-4" />)}
                      <input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                        className={inputClass("phone")}
                        autoComplete="tel"
                      />
                    </div>
                    {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="ward_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Ward Number
                    </label>
                    <div className="relative">
                      {inputIcon(<Home className="w-4 h-4" />)}
                      <input
                        id="ward_number"
                        type="number"
                        value={form.ward_number}
                        onChange={(e) => updateField("ward_number", e.target.value)}
                        placeholder="e.g. 5"
                        className={inputClass("ward_number")}
                        min="1"
                      />
                    </div>
                    {fieldErrors.ward_number && <p className="mt-1 text-xs text-red-500">{fieldErrors.ward_number}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="village" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Village
                    </label>
                    <div className="relative">
                      {inputIcon(<MapPin className="w-4 h-4" />)}
                      <input
                        id="village"
                        type="text"
                        value={form.village}
                        onChange={(e) => updateField("village", e.target.value)}
                        placeholder="Your village"
                        className={inputClass("village")}
                        autoComplete="address-level2"
                      />
                    </div>
                    {fieldErrors.village && <p className="mt-1 text-xs text-red-500">{fieldErrors.village}</p>}
                  </div>

                  <div>
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      District
                    </label>
                    <div className="relative">
                      {inputIcon(<Building2 className="w-4 h-4" />)}
                      <input
                        id="district"
                        type="text"
                        value={form.district}
                        onChange={(e) => updateField("district", e.target.value)}
                        placeholder="Your district"
                        className={inputClass("district")}
                        autoComplete="address-level1"
                      />
                    </div>
                    {fieldErrors.district && <p className="mt-1 text-xs text-red-500">{fieldErrors.district}</p>}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      State
                    </label>
                    <div className="relative">
                      {inputIcon(<MapPin className="w-4 h-4" />)}
                      <input
                        id="state"
                        type="text"
                        value={form.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        placeholder="Your state"
                        className={inputClass("state")}
                        autoComplete="address-level1"
                      />
                    </div>
                    {fieldErrors.state && <p className="mt-1 text-xs text-red-500">{fieldErrors.state}</p>}
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 text-base mt-2">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <CheckCircle className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center pt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/auth/citizen-login"
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  Sign in
                </Link>
              </span>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
