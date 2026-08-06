"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText, Search, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, CheckSquare, Square, ArrowUpDown,
  RefreshCw, Filter, AlertCircle, Loader2
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { cn, formatDate, formatStatus, formatCategory, formatPriority, getStatusColor, getPriorityColor, truncate } from "@/lib/utils"
import api from "@/lib/api"

interface Complaint {
  id: number
  complaint_id?: string
  title: string
  description?: string
  category: string
  status: string
  priority: string
  department: string
  ward_number?: number
  village: string
  created_at: string
  updated_at?: string
  user?: {
    id: number
    full_name: string
    email: string
  }
}

interface ComplaintsResponse {
  items: Complaint[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

interface FilterState {
  search: string
  category: string
  status: string
  priority: string
  department: string
  ward_number: string
  village: string
  date_from: string
  date_to: string
  sort_by: string
  sort_order: "asc" | "desc"
}

const initialFilters: FilterState = {
  search: "",
  category: "",
  status: "",
  priority: "",
  department: "",
  ward_number: "",
  village: "",
  date_from: "",
  date_to: "",
  sort_by: "created_at",
  sort_order: "desc",
}

const CATEGORIES = [
  "road", "water", "electricity", "sanitation", "healthcare",
  "education", "infrastructure", "environment", "public_safety", "other",
]

const STATUSES = ["pending", "under_review", "in_progress", "resolved", "rejected", "closed"]
const PRIORITIES = ["low", "medium", "high", "critical"]
const DEPARTMENTS = [
  "Public Works", "Water Supply", "Electricity Board", "Sanitation",
  "Health Department", "Education", "Municipal Corporation", "Forest Department",
  "Police Department", "Other",
]

const BULK_STATUSES = ["pending", "under_review", "in_progress", "resolved", "closed"]

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
      {label}
      <button onClick={onRemove} className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function SelectFilter({
  label, value, options, onChange, placeholder,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 pr-8 rounded-xl text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 appearance-none transition-colors"
      >
        <option value="">{placeholder || `All ${label}`}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {label === "Category" ? formatCategory(opt) : label === "Status" ? formatStatus(opt) : label === "Priority" ? formatPriority(opt) : opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="h-14 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
  )
}

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy: string; sortOrder: "asc" | "desc" }) {
  if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

function buildParams(page: number, pageSize: number, filters: FilterState): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {
    page,
    page_size: pageSize,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
  }
  if (filters.search) params.search = filters.search
  if (filters.category) params.category = filters.category
  if (filters.status) params.status = filters.status
  if (filters.priority) params.priority = filters.priority
  if (filters.department) params.department = filters.department
  if (filters.ward_number) params.ward_number = filters.ward_number
  if (filters.village) params.village = filters.village
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  return params
}

export default function AdminComplaintsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<ComplaintsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedMobileId, setExpandedMobileId] = useState<number | null>(null)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.category) count++
    if (filters.status) count++
    if (filters.priority) count++
    if (filters.department) count++
    if (filters.ward_number) count++
    if (filters.village) count++
    if (filters.date_from) count++
    if (filters.date_to) count++
    return count
  }, [filters])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = buildParams(page, pageSize, filters)
        const res = await api.get<ComplaintsResponse>("/api/admin/complaints", params)
        if (!cancelled) {
          setData(res)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, pageSize, filters])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const params = buildParams(page, pageSize, filters)
      const res = await api.get<ComplaintsResponse>("/api/admin/complaints", params)
      setData(res)
      toast.success("Complaints refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load complaints"
      toast.error(message)
    } finally {
      setRefreshing(false)
    }
  }

  const reloadSilent = async () => {
    const params = buildParams(page, pageSize, filters)
    try {
      const res = await api.get<ComplaintsResponse>("/api/admin/complaints", params)
      setData(res)
    } catch {
      // silent reload
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
    setSelectedIds(new Set())
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setPage(1)
    setSelectedIds(new Set())
    toast.success("Filters cleared")
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selectedIds.size === data.items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.items.map((c) => c.id)))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      await api.post("/api/admin/complaints/bulk-status", {
        ids: Array.from(selectedIds),
        status: bulkStatus,
      })
      toast.success(`Updated ${selectedIds.size} complaints to ${formatStatus(bulkStatus)}`)
      setSelectedIds(new Set())
      setBulkStatus("")
      reloadSilent()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update complaints"
      toast.error(message)
    } finally {
      setBulkUpdating(false)
    }
  }

  const toggleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order: prev.sort_by === column && prev.sort_order === "asc" ? "desc" : "asc",
    }))
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
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
                <FileText className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Complaints
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Manage and review citizen complaints
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span className="text-xs text-gray-500 hidden sm:inline">{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-1.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">{activeFilterCount}</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950"
              >
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title, ID, or description..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                    />
                    {filters.search && (
                      <button
                        onClick={() => handleFilterChange("search", "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <SelectFilter
                      label="Category"
                      value={filters.category}
                      options={CATEGORIES}
                      onChange={(v) => handleFilterChange("category", v)}
                      placeholder="All Categories"
                    />
                    <SelectFilter
                      label="Status"
                      value={filters.status}
                      options={STATUSES}
                      onChange={(v) => handleFilterChange("status", v)}
                      placeholder="All Statuses"
                    />
                    <SelectFilter
                      label="Priority"
                      value={filters.priority}
                      options={PRIORITIES}
                      onChange={(v) => handleFilterChange("priority", v)}
                      placeholder="All Priorities"
                    />
                    <SelectFilter
                      label="Department"
                      value={filters.department}
                      options={DEPARTMENTS}
                      onChange={(v) => handleFilterChange("department", v)}
                      placeholder="All Departments"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ward #"
                        value={filters.ward_number}
                        onChange={(e) => handleFilterChange("ward_number", e.target.value)}
                        className="w-full h-10 px-3 rounded-xl text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                      <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleFilterChange("date_from", e.target.value)}
                        className="w-full h-10 px-3 rounded-xl text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                      <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => handleFilterChange("date_to", e.target.value)}
                        className="w-full h-10 px-3 rounded-xl text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleFilterChange("date_from", "")
                          handleFilterChange("date_to", "")
                        }}
                        className="h-10"
                      >
                        Clear Dates
                      </Button>
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        Active Filters:
                      </span>
                      {filters.search && (
                        <FilterBadge label={`Search: ${truncate(filters.search, 20)}`} onRemove={() => handleFilterChange("search", "")} />
                      )}
                      {filters.category && (
                        <FilterBadge label={formatCategory(filters.category)} onRemove={() => handleFilterChange("category", "")} />
                      )}
                      {filters.status && (
                        <FilterBadge label={formatStatus(filters.status)} onRemove={() => handleFilterChange("status", "")} />
                      )}
                      {filters.priority && (
                        <FilterBadge label={formatPriority(filters.priority)} onRemove={() => handleFilterChange("priority", "")} />
                      )}
                      {filters.department && (
                        <FilterBadge label={filters.department} onRemove={() => handleFilterChange("department", "")} />
                      )}
                      {filters.ward_number && (
                        <FilterBadge label={`Ward #${filters.ward_number}`} onRemove={() => handleFilterChange("ward_number", "")} />
                      )}
                      {filters.date_from && (
                        <FilterBadge label={`From: ${filters.date_from}`} onRemove={() => handleFilterChange("date_from", "")} />
                      )}
                      {filters.date_to && (
                        <FilterBadge label={`To: ${filters.date_to}`} onRemove={() => handleFilterChange("date_to", "")} />
                      )}
                      <button
                        onClick={clearFilters}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium ml-1"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4 sm:p-6 lg:p-8">
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl"
              >
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {selectedIds.size} selected
                </span>
                <div className="flex-1" />
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="h-9 px-3 rounded-xl text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Change status...</option>
                  {BULK_STATUSES.map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus || bulkUpdating}
                >
                  {bulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Cancel
                </Button>
              </motion.div>
            )}

            {loading ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <SkeletonRow />
                  </motion.div>
                ))}
              </motion.div>
            ) : data && data.items.length > 0 ? (
              <>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="hidden md:block"
                >
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                              <th className="py-3.5 px-4 text-left">
                                <button
                                  onClick={toggleSelectAll}
                                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                                >
                                  {data && selectedIds.size === data.items.length ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("id")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  ID <SortIcon column="id" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("title")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Title <SortIcon column="title" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("category")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Category <SortIcon column="category" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("status")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Status <SortIcon column="status" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("priority")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Priority <SortIcon column="priority" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("department")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Department <SortIcon column="department" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("village")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Village <SortIcon column="village" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left">
                                <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                  Created <SortIcon column="created_at" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                                </button>
                              </th>
                              <th className="py-3.5 px-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.items.map((complaint) => (
                              <motion.tr
                                key={complaint.id}
                                variants={itemVariants}
                                className={cn(
                                  "border-b border-gray-50 dark:border-gray-900 transition-colors",
                                  expandedId === complaint.id ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-900/50",
                                )}
                              >
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => toggleSelect(complaint.id)}
                                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    {selectedIds.has(complaint.id) ? (
                                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                                    ) : (
                                      <Square className="w-4 h-4 text-gray-400" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                                    className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    #{complaint.complaint_id || complaint.id}
                                  </button>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-medium text-sm">{truncate(complaint.title, 40)}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatCategory(complaint.category)}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(complaint.status))}>
                                    {formatStatus(complaint.status)}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getPriorityColor(complaint.priority))}>
                                    {formatPriority(complaint.priority)}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{complaint.department}</td>
                                <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{complaint.village}</td>
                                <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(complaint.created_at)}</td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                                    >
                                      {expandedId === complaint.id ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Link href={`/complaints/${complaint.complaint_id || complaint.id}`}>
                                      <Button variant="ghost" size="sm">
                                        View
                                      </Button>
                                    </Link>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                            {data.items.map((complaint) => (
                              expandedId === complaint.id && (
                                <motion.tr
                                  key={`exp-${complaint.id}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  <td colSpan={10} className="p-4 bg-gray-50/50 dark:bg-gray-900/30">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-xs text-gray-500 block">Description</span>
                                        <p className="mt-0.5">{complaint.description || "No description provided"}</p>
                                      </div>
                                      {complaint.ward_number && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">Ward Number</span>
                                          <p className="mt-0.5 font-medium">{complaint.ward_number}</p>
                                        </div>
                                      )}
                                      {complaint.user && (
                                        <div>
                                          <span className="text-xs text-gray-500 block">Submitted By</span>
                                          <p className="mt-0.5 font-medium">{complaint.user.full_name}</p>
                                          <p className="text-xs text-gray-400">{complaint.user.email}</p>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-xs text-gray-500 block">Last Updated</span>
                                        <p className="mt-0.5">{complaint.updated_at ? formatDate(complaint.updated_at) : "N/A"}</p>
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              )
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="md:hidden space-y-3"
                >
                  {data.items.map((complaint) => (
                    <motion.div key={complaint.id} variants={itemVariants}>
                      <Card
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          expandedMobileId === complaint.id && "ring-2 ring-indigo-500/30",
                        )}
                        onClick={() => setExpandedMobileId(expandedMobileId === complaint.id ? null : complaint.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSelect(complaint.id) }}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors mt-0.5"
                              >
                                {selectedIds.has(complaint.id) ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">#{complaint.complaint_id || complaint.id}</span>
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(complaint.status))}>
                                    {formatStatus(complaint.status)}
                                  </span>
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", getPriorityColor(complaint.priority))}>
                                    {formatPriority(complaint.priority)}
                                  </span>
                                </div>
                                <p className="font-medium text-sm mt-1">{truncate(complaint.title, 50)}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{formatCategory(complaint.category)}</span>
                                  <span>{complaint.department}</span>
                                  <span>{complaint.village}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{formatDate(complaint.created_at)}</p>

                                <AnimatePresence>
                                  {expandedMobileId === complaint.id && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden mt-3 pt-3 border-t border-gray-100 dark:border-gray-800"
                                    >
                                      <div className="space-y-2 text-sm">
                                        {complaint.description && (
                                          <p className="text-gray-600 dark:text-gray-300">{complaint.description}</p>
                                        )}
                                        {complaint.ward_number && (
                                          <p><span className="text-gray-500">Ward:</span> {complaint.ward_number}</p>
                                        )}
                                        {complaint.user && (
                                          <p><span className="text-gray-500">By:</span> {complaint.user.full_name}</p>
                                        )}
                                        <Link href={`/complaints/${complaint.complaint_id || complaint.id}`} onClick={(e) => e.stopPropagation()}>
                                          <Button variant="outline" size="sm" className="mt-2">
                                            View Details
                                          </Button>
                                        </Link>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <ChevronDown className={cn(
                              "w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0",
                              expandedMobileId === complaint.id && "rotate-180",
                            )} />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                {data && data.total_pages > 1 && (
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between mt-6"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {(data.page - 1) * data.page_size + 1}–{Math.min(data.page * data.page_size, data.total)} of {data.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, data.total_pages - 4))
                        const pg = start + i
                        if (pg > data.total_pages) return null
                        return (
                          <Button
                            key={pg}
                            variant={pg === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pg)}
                            className="min-w-[36px]"
                          >
                            {pg}
                          </Button>
                        )
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                        disabled={page >= data.total_pages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center h-[60vh]"
              >
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No complaints found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {activeFilterCount > 0
                      ? "No complaints match your current filters. Try adjusting your search criteria."
                      : "There are no complaints in the system yet. New complaints will appear here."}
                  </p>
                  {activeFilterCount > 0 ? (
                    <Button onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1.5" />
                      Clear Filters
                    </Button>
                  ) : (
                    <Link href="/complaints/report">
                      <Button>
                        <FileText className="w-4 h-4 mr-1.5" />
                        Create Complaint
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
