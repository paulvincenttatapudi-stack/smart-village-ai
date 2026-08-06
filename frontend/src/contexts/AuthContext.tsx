"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import api from "@/lib/api"

interface User {
  id: number
  email: string
  username: string
  full_name: string
  phone?: string
  role: string
  ward_number?: number
  village?: string
  district?: string
  is_active: boolean
  created_at: string
}

interface RegisterData {
  email: string
  username: string
  password: string
  full_name: string
  phone?: string
  ward_number?: number
  village?: string
  district?: string
  state?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isCitizen: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const me = await api.get<User>("/api/auth/me")
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          localStorage.removeItem("user_role")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; refresh_token: string }>("/api/auth/login", {
      username,
      password,
    })
    localStorage.setItem("access_token", res.access_token)
    localStorage.setItem("refresh_token", res.refresh_token)
    const me = await api.get<User>("/api/auth/me")
    localStorage.setItem("user_role", me.role)
    setUser(me)
  }

  const register = async (data: RegisterData) => {
    await api.post("/api/auth/register", data)
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_role")
    setUser(null)
  }

  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const isCitizen = user?.role === "citizen"

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isCitizen }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
