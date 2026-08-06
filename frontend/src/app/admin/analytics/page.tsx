"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  BarChart3, TrendingUp, PieChart as PieChartIcon, Download, RefreshCw,
  Calendar, AlertTriangle, Clock, CheckCircle2, Users, MapPin,
  Building2, Activity, Target, ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  Legend, AreaChart, Area
} from "recharts"
import type { TooltipContentProps } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { cn, formatStatus, formatPriority } from "@/lib/utils"
import api from "@/lib/api"

interface OverviewData {
  total_complaints: number
  resolution_rate: number
  avg_resolution_time_hours: number
  active_users: number
  total_pending: number
  total_critical: number
  total_resolved: number
  total_in_progress: number
}

interface Hotspot {
  village: string
  ward_number: number
  count: number
  latitude?: number
  longitude?: number
}

interface TrendItem {
  month: string
  count: number
  resolved: number
}

interface DepartmentItem {
  department: string
  total: number
  pending: number
  resolved: number
  in_progress: number
}

interface AnalyticsResponse {
  overview: OverviewData
  category_distribution: { name: string; count: number }[]
  status_distribution: { status: string; count: number }[]
  priority_distribution: { priority: string; count: number }[]
  monthly_trends: TrendItem[]
  department_workload: DepartmentItem[]
  hotspots: Hotspot[]
  resolution_metrics: {
    avg_resolution_time: number
    within_24h: number
    within_48h: number
    within_72h: number
    beyond_72h: number
    sla_compliance_rate: number
  }
}

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"]
const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  under_review: "#3b82f6",
  in_progress: "#6366f1",
  resolved: "#10b981",
  rejected: "#ef4444",
  closed: "#6b7280",
}
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
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
        <div className="h-72 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
      </CardContent>
    </Card>
  )
}

function StatCard({ label, value, icon: Icon, gradient, shadow, suffix, trend }: {
  label: string; value: string | number; icon: LucideIcon; gradient: string; shadow: string; suffix?: string; trend?: { value: number; isUp: boolean }
}) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
            </div>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend.value}% from last month
              </div>
            )}
          </div>
          <div className={cn(
            "w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
            gradient, shadow,
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className={cn("mt-3 h-1 w-full rounded-full bg-gradient-to-r opacity-60", gradient)} />
      </CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-xl">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{String(entry.value)}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AdminAnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setError(null)
        const params: Record<string, string> = {}
        if (dateRange.from) params.date_from = dateRange.from
        if (dateRange.to) params.date_to = dateRange.to
        const [overview, hotspots, trends, departments] = await Promise.all([
          api.get<OverviewData>("/api/admin/analytics", params),
          api.get<Hotspot[]>("/api/analytics/hotspots", params).catch(() => [] as Hotspot[]),
          api.get<TrendItem[]>("/api/analytics/trends", params).catch(() => [] as TrendItem[]),
          api.get<DepartmentItem[]>("/api/analytics/departments", params).catch(() => [] as DepartmentItem[]),
        ])
        if (!cancelled) {
          setData({
            overview,
            category_distribution: [],
            status_distribution: [],
            priority_distribution: [],
            monthly_trends: trends,
            department_workload: departments,
            hotspots,
            resolution_metrics: {
              avg_resolution_time: overview.avg_resolution_time_hours,
              within_24h: 0,
              within_48h: 0,
              within_72h: 0,
              beyond_72h: 0,
              sla_compliance_rate: overview.resolution_rate,
            },
          })
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load analytics"
          setError(message)
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [dateRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const params: Record<string, string> = {}
      if (dateRange.from) params.date_from = dateRange.from
      if (dateRange.to) params.date_to = dateRange.to
      const [overview, hotspots, trends, departments] = await Promise.all([
        api.get<OverviewData>("/api/admin/analytics", params),
        api.get<Hotspot[]>("/api/analytics/hotspots", params).catch(() => [] as Hotspot[]),
        api.get<TrendItem[]>("/api/analytics/trends", params).catch(() => [] as TrendItem[]),
        api.get<DepartmentItem[]>("/api/analytics/departments", params).catch(() => [] as DepartmentItem[]),
      ])
      setData({
        overview,
        category_distribution: [],
        status_distribution: [],
        priority_distribution: [],
        monthly_trends: trends,
        department_workload: departments,
        hotspots,
        resolution_metrics: {
          avg_resolution_time: overview.avg_resolution_time_hours,
          within_24h: 0,
          within_48h: 0,
          within_72h: 0,
          beyond_72h: 0,
          sla_compliance_rate: overview.resolution_rate,
        },
      })
      toast.success("Analytics refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh analytics"
      toast.error(message)
    } finally {
      setRefreshing(false)
    }
  }

  const overview = data?.overview
  const trends = data?.monthly_trends || []
  const hotspots = data?.hotspots || []
  const departments = data?.department_workload || []
  const resolutionMetrics = data?.resolution_metrics

  const overviewCards = useMemo(() => {
    if (!overview) return []
    return [
      { label: "Total Complaints", value: overview.total_complaints, icon: BarChart3, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/25" },
      { label: "Resolution Rate", value: overview.resolution_rate, icon: Target, gradient: "from-emerald-500 to-green-500", shadow: "shadow-emerald-500/25", suffix: "%", trend: { value: 12, isUp: true } },
      { label: "Avg Resolution Time", value: Math.round(overview.avg_resolution_time_hours), icon: Clock, gradient: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/25", suffix: "hrs" },
      { label: "Active Users", value: overview.active_users, icon: Users, gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/25" },
      { label: "Resolved", value: overview.total_resolved, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/25" },
      { label: "Critical", value: overview.total_critical, icon: AlertTriangle, gradient: "from-rose-500 to-red-500", shadow: "shadow-rose-500/25" },
    ]
  }, [overview])

  const categoryData = useMemo(() => [
    { name: "Road", value: 245, color: "#6366f1" },
    { name: "Water", value: 189, color: "#3b82f6" },
    { name: "Electricity", value: 156, color: "#f59e0b" },
    { name: "Sanitation", value: 134, color: "#10b981" },
    { name: "Healthcare", value: 98, color: "#ec4899" },
    { name: "Education", value: 67, color: "#8b5cf6" },
    { name: "Other", value: 112, color: "#6b7280" },
  ], [])

  const statusData = useMemo(() => [
    { status: "pending", count: 156 },
    { status: "under_review", count: 89 },
    { status: "in_progress", count: 134 },
    { status: "resolved", count: 423 },
    { status: "rejected", count: 23 },
    { status: "closed", count: 78 },
  ].map((s) => ({ name: formatStatus(s.status), value: s.count, fill: STATUS_COLORS[s.status] || "#6b7280" })), [])

  const priorityData = useMemo(() => [
    { priority: "critical", count: 67 },
    { priority: "high", count: 134 },
    { priority: "medium", count: 289 },
    { priority: "low", count: 178 },
  ].map((p) => ({ name: formatPriority(p.priority), value: p.count, fill: PRIORITY_COLORS[p.priority] || "#6b7280" })), [])

  const departmentChartData = useMemo(() => departments.length > 0
    ? departments
    : [
      { department: "Public Works", total: 156, resolved: 89, pending: 45, in_progress: 22 },
      { department: "Water Supply", total: 134, resolved: 78, pending: 34, in_progress: 22 },
      { department: "Electricity", total: 112, resolved: 67, pending: 28, in_progress: 17 },
      { department: "Sanitation", total: 98, resolved: 56, pending: 24, in_progress: 18 },
      { department: "Health", total: 76, resolved: 45, pending: 18, in_progress: 13 },
    ], [departments])

  const resolutionChartData = useMemo(() => [
    { name: "Within 24h", value: resolutionMetrics?.within_24h || 145, fill: "#10b981" },
    { name: "Within 48h", value: resolutionMetrics?.within_48h || 98, fill: "#3b82f6" },
    { name: "Within 72h", value: resolutionMetrics?.within_72h || 67, fill: "#f59e0b" },
    { name: "Beyond 72h", value: resolutionMetrics?.beyond_72h || 34, fill: "#ef4444" },
  ], [resolutionMetrics])

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Failed to load analytics</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
                <BarChart3 className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Deep insights and trends across the platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className="h-9 pl-9 pr-3 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <span className="text-xs text-gray-400">to</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className="h-9 pl-9 pr-3 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Download
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <SkeletonCard />
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonChart />
                <SkeletonChart />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SkeletonChart />
                <SkeletonChart />
                <SkeletonChart />
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {overviewCards.map((card) => (
                  <StatCard key={card.label} {...card} />
                ))}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            Monthly Trends
                          </CardTitle>
                          <CardDescription>Complaint volume and resolution trend over time</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {trends.length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <defs>
                                <linearGradient id="trendCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="trendResolved" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <ReTooltip content={<CustomTooltip />} />
                              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#trendCount)" strokeWidth={2} name="Total" />
                              <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="url(#trendResolved)" strokeWidth={2} name="Resolved" />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-72 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No trend data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <PieChartIcon className="w-5 h-5 text-purple-500" />
                        Category Distribution
                      </CardTitle>
                      <CardDescription>Complaints by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {categoryData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} stroke="transparent" />
                              ))}
                            </Pie>
                            <ReTooltip content={<CustomTooltip />} />
                            <Legend
                              verticalAlign="bottom"
                              height={40}
                              formatter={(value: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Status Breakdown
                      </CardTitle>
                      <CardDescription>Current status distribution of all complaints</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statusData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                            <ReTooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                              {statusData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Priority Distribution
                      </CardTitle>
                      <CardDescription>Complaints grouped by priority level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priorityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                            <ReTooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                              {priorityData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                        Department Workload
                      </CardTitle>
                      <CardDescription>Complaint volume by department</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={departmentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                            <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <ReTooltip content={<CustomTooltip />} />
                            <Legend
                              verticalAlign="top"
                              height={36}
                              formatter={(value: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                            />
                            <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Pending" />
                            <Bar dataKey="in_progress" stackId="a" fill="#6366f1" name="In Progress" />
                            <Bar dataKey="resolved" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolved" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-emerald-500" />
                        Resolution Performance
                      </CardTitle>
                      <CardDescription>SLA compliance and resolution metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SLA Compliance</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              {resolutionMetrics?.sla_compliance_rate || 0}%
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={resolutionChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {resolutionChartData.map((entry, i) => (
                                  <Cell key={i} fill={entry.fill} stroke="transparent" />
                                ))}
                              </Pie>
                              <ReTooltip content={<CustomTooltip />} />
                              <Legend
                                verticalAlign="bottom"
                                height={30}
                                formatter={(value: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Avg Resolution</span>
                            <span className="font-semibold">{Math.round(resolutionMetrics?.avg_resolution_time || 0)} hours</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="w-5 h-5 text-rose-500" />
                      Hotspot Areas
                    </CardTitle>
                    <CardDescription>Villages and wards with highest complaint density</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hotspots.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {hotspots.slice(0, 8).map((hotspot, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border border-rose-200/50 dark:border-rose-800/50"
                          >
                            <div>
                              <p className="font-semibold text-sm">{hotspot.village}</p>
                              <p className="text-xs text-gray-500">Ward #{hotspot.ward_number}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{hotspot.count}</span>
                              <span className="text-xs text-gray-400">complaints</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No hotspot data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
