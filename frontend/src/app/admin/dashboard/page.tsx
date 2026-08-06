"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard, FileText, Users, CheckCircle2, Clock,
  AlertTriangle, BarChart3, RefreshCw, PlusCircle, ListOrdered,
  TrendingUp, Activity
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { cn, formatDate, formatStatus, formatCategory, formatPriority, getStatusColor, getPriorityColor, truncate } from "@/lib/utils"
import api from "@/lib/api"

interface DashboardStats {
  total_complaints: number
  total_users: number
  resolved: number
  pending: number
  critical: number
}

interface CategoryItem {
  name: string
  count: number
}

interface StatusItem {
  status: string
  count: number
}

interface Complaint {
  id: number
  title: string
  category: string
  status: string
  priority: string
  department: string
  village: string
  created_at: string
}

interface AnalyticsData {
  category_distribution: CategoryItem[]
  status_distribution: StatusItem[]
  recent_complaints: Complaint[]
}

const statCards = [
  { key: "total_complaints", label: "Total Complaints", icon: FileText, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/25" },
  { key: "total_users", label: "Total Users", icon: Users, gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/25" },
  { key: "resolved", label: "Resolved", icon: CheckCircle2, gradient: "from-emerald-500 to-green-500", shadow: "shadow-emerald-500/25" },
  { key: "pending", label: "Pending", icon: Clock, gradient: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/25" },
  { key: "critical", label: "Critical", icon: AlertTriangle, gradient: "from-rose-500 to-red-500", shadow: "shadow-rose-500/25" },
]

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"]
const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  under_review: "#3b82f6",
  in_progress: "#6366f1",
  resolved: "#10b981",
  rejected: "#ef4444",
  closed: "#6b7280",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-60 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
      </CardContent>
    </Card>
  )
}

function SkeletonTable() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statsData, analyticsData] = await Promise.all([
          api.get<DashboardStats>("/api/admin/dashboard"),
          api.get<AnalyticsData>("/api/admin/analytics"),
        ])
        if (!cancelled) {
          setStats(statsData)
          setAnalytics(analyticsData)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const [statsData, analyticsData] = await Promise.all([
        api.get<DashboardStats>("/api/admin/dashboard"),
        api.get<AnalyticsData>("/api/admin/analytics"),
      ])
      setStats(statsData)
      setAnalytics(analyticsData)
      toast.success("Dashboard refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard data"
      toast.error(message)
    } finally {
      setRefreshing(false)
    }
  }

  const formatChartData = (data: CategoryItem[] | StatusItem[], nameKey: string) => {
    if (!data) return []
    return data.map((item, index) => {
      const count = "count" in item ? item.count : 0
      const label = nameKey === "status"
        ? formatStatus((item as StatusItem).status)
        : formatCategory((item as CategoryItem).name)
      const color = nameKey === "status"
        ? STATUS_COLORS[(item as StatusItem).status] || CHART_COLORS[index % CHART_COLORS.length]
        : CHART_COLORS[index % CHART_COLORS.length]
      return { name: label, value: count, color, fill: color }
    })
  }

  const categoryData = formatChartData(analytics?.category_distribution || [], "category")
  const statusData = formatChartData(analytics?.status_distribution || [], "status")

  const quickActions = [
    {
      label: "New Complaint",
      icon: PlusCircle,
      href: "/complaints/new",
      gradient: "from-indigo-500 to-purple-500",
      description: "Register a new citizen complaint",
    },
    {
      label: "View All Complaints",
      icon: ListOrdered,
      href: "/admin/complaints",
      gradient: "from-emerald-500 to-teal-500",
      description: "Manage and review all complaints",
    },
    {
      label: "Analytics Dashboard",
      icon: TrendingUp,
      href: "/admin/analytics",
      gradient: "from-amber-500 to-orange-500",
      description: "Deep dive into data insights",
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Overview of your smart village platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <SkeletonCard />
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonChart />
                <SkeletonChart />
              </div>
              <SkeletonTable />
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Stats Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {statCards.map((card) => {
                  const Icon = card.icon
                  const value = stats ? stats[card.key as keyof DashboardStats] : 0
                  return (
                    <Card key={card.key} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                            <p className="text-3xl font-bold tracking-tight">{value}</p>
                          </div>
                          <div className={cn(
                            "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
                            card.gradient,
                            card.shadow,
                          )}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className={cn("mt-4 h-1 w-full rounded-full bg-gradient-to-r opacity-60", card.gradient)} />
                      </CardContent>
                    </Card>
                  )
                })}
              </motion.div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Category Distribution
                          </CardTitle>
                          <CardDescription>Complaints grouped by category</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {categoryData.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => truncate(v, 10)} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "12px",
                                  border: "1px solid var(--border)",
                                  background: "var(--card)",
                                }}
                              />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {categoryData.map((entry, index) => (
                                  <Cell key={index} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No category data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Status Distribution */}
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-purple-500" />
                            Status Distribution
                          </CardTitle>
                          <CardDescription>Complaints grouped by current status</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {statusData.length > 0 ? (
                        <div className="h-72 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {statusData.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill} stroke="transparent" />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "12px",
                                  border: "1px solid var(--border)",
                                  background: "var(--card)",
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value: string) => (
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                                )}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <Activity className="w-12 h-12 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No status data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Quick Actions + Recent Complaints */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-amber-500" />
                        Quick Actions
                      </CardTitle>
                      <CardDescription>Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {quickActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <Link key={action.href} href={action.href}>
                            <div className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
                                action.gradient,
                              )}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{action.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{action.description}</p>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Recent Complaints */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="w-5 h-5 text-indigo-500" />
                          Recent Complaints
                        </CardTitle>
                        <CardDescription>Latest 10 complaints across the platform</CardDescription>
                      </div>
                      <Link href="/admin/complaints">
                        <Button variant="ghost" size="sm">
                          View All
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent>
                      {analytics?.recent_complaints && analytics.recent_complaints.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800">
                                <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">ID</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Title</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Category</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Priority</th>
                                <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.recent_complaints.map((complaint, i) => (
                                <motion.tr
                                  key={complaint.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                >
                                  <td className="py-3 px-2 font-mono text-xs text-gray-500">#{complaint.id}</td>
                                  <td className="py-3 px-2">
                                    <span className="font-medium">{truncate(complaint.title, 35)}</span>
                                  </td>
                                  <td className="py-3 px-2">
                                    <span className="text-xs text-gray-500">{formatCategory(complaint.category)}</span>
                                  </td>
                                  <td className="py-3 px-2">
                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(complaint.status))}>
                                      {formatStatus(complaint.status)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2">
                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getPriorityColor(complaint.priority))}>
                                      {formatPriority(complaint.priority)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">
                                    {formatDate(complaint.created_at)}
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No recent complaints</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
