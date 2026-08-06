"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Navbar } from "@/components/layout/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText, Search, MapPin, Bell, ArrowRight,
  ClipboardList, Activity, CheckCircle, Clock,
} from "lucide-react"
import { api } from "@/lib/api"

interface Stats {
  total: number
  resolved: number
  in_progress: number
  pending: number
}

const quickActions = [
  {
    title: "Report a Complaint",
    description: "Submit a new issue with AI-powered analysis",
    icon: FileText,
    href: "/complaints/report",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    title: "View My Complaints",
    description: "Track all your submitted complaints",
    icon: ClipboardList,
    href: "/complaints/view",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Track Complaint",
    description: "Check status by complaint ID",
    icon: Search,
    href: "/complaints/track",
    gradient: "from-emerald-500 to-teal-500",
  },
]

export default function CitizenPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ total: 0, resolved: 0, in_progress: 0, pending: 0 })

  useEffect(() => {
    api.get<Stats>("/api/complaints/my/stats").then(setStats).catch(() => {})
  }, [])

  const statItems = [
    { label: "Total Filed", value: stats.total, icon: FileText },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle },
    { label: "In Progress", value: stats.in_progress, icon: Clock },
    { label: "Pending", value: stats.pending, icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.full_name?.split(" ")[0] || "Citizen"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your complaints and stay updated with the latest status.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {statItems.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mb-10"
          >
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} href={action.href}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group relative h-full"
                  >
                    <Card className="p-6 h-full">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} p-2.5 mb-4`}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{action.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{action.description}</p>
                      <div className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
                        Get Started <ArrowRight className="w-4 h-4" />
                      </div>
                    </Card>
                  </motion.div>
                </Link>
              )
            })}
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">AI-Powered Complaint Management</h2>
                  <p className="text-indigo-100 text-sm max-w-xl">
                    Your complaints are automatically analyzed by AI for classification, priority assignment,
                    and department routing. This ensures faster resolution and better governance.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => window.open("/complaints/report", "_self")}
                    className="bg-white text-indigo-700 hover:bg-indigo-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
