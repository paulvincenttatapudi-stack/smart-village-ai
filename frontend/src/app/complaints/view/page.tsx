"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, ThumbsUp, Calendar, LayoutGrid, List,
  SlidersHorizontal, X, MapPin, Clock, Inbox, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { api, resolveMediaUrl } from "@/lib/api"
import { cn, formatDate, formatStatus, formatCategory, formatPriority, getStatusColor, getPriorityColor, truncate } from "@/lib/utils"

interface Complaint {
  complaint_id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  department: string
  address: string
  ward_number: number
  village: string
  district: string
  upvotes: number
  created_at: string
  updated_at: string
  image_urls: string[]
}

interface PaginatedResponse {
  complaints?: Complaint[]
  items?: Complaint[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

const categories = [
  { value: "", label: "All Categories" },
  { value: "road", label: "Road" },
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
  { value: "sanitation", label: "Sanitation" },
  { value: "street_light", label: "Street Light" },
  { value: "public_property", label: "Public Property" },
  { value: "other", label: "Other" },
]

const statuses = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
]

const sortOptions = [
  { value: "created_at", label: "Date" },
  { value: "title", label: "Title" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "upvotes", label: "Upvotes" },
]

export default function ViewComplaintsPage() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const pageSize = 12

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get<PaginatedResponse>("/api/complaints", {
          page,
          page_size: pageSize,
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        })
        if (cancelled) return
        setComplaints(response.items || response.complaints || [])
        setTotalPages(response.total_pages)
        setTotal(response.total)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load complaints")
        setComplaints([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [refreshKey, page, search, category, status, sortBy, sortOrder])

  const setFilter = (key: "search" | "category" | "status" | "sortBy", value: string) => {
    if (key === "search") setSearch(value)
    else if (key === "category") setCategory(value)
    else if (key === "status") setStatus(value)
    else setSortBy(value)
    setPage(1)
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
    setPage(1)
  }

  const clearFilters = () => {
    setSearch("")
    setCategory("")
    setStatus("")
    setSortBy("created_at")
    setSortOrder("desc")
    setPage(1)
  }

  const hasActiveFilters = search || category || status || sortBy !== "created_at" || sortOrder !== "desc"

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <div className="relative pt-24 pb-12 min-h-screen">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Complaints</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {total > 0 ? `${total} complaint${total !== 1 ? "s" : ""} found` : "Track and manage your complaints"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-800 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    viewMode === "grid"
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    viewMode === "list"
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/complaints/report")}>
                <FileText className="mr-1.5 w-4 h-4" />
                Report New
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  placeholder="Search complaints..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-all duration-200"
                />
                {search && (
                  <button
                    onClick={() => setFilter("search", "")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "border-indigo-500 text-indigo-600")}
              >
                <SlidersHorizontal className="mr-1.5 w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setFilter("category", e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                      >
                        {categories.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setFilter("status", e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                      >
                        {statuses.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Sort By</label>
                      <div className="flex items-center gap-1">
                        <select
                          value={sortBy}
                          onChange={(e) => setFilter("sortBy", e.target.value)}
                          className="h-9 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                        >
                          {sortOptions.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={toggleSortOrder}
                          className="h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <ArrowUpDown className={cn("w-4 h-4 text-gray-500", sortOrder === "asc" && "rotate-180")} />
                        </button>
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-1 w-3 h-3" />
                        Clear
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          {loading ? (
            <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-gray-200/50 dark:border-gray-800/50">
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 animate-pulse" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12 animate-pulse" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
              <Button onClick={() => setRefreshKey((k) => k + 1)} variant="outline">
                Try Again
              </Button>
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-900/50 flex items-center justify-center mb-4">
                <Inbox className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Complaints Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm text-center">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "You haven't submitted any complaints yet"}
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => router.push("/complaints/report")}>
                  <FileText className="mr-2 w-4 h-4" />
                  Report a Complaint
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                {complaints.map((complaint, index) => (
                  <motion.div
                    key={complaint.complaint_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <Card
                      className="border-gray-200/50 dark:border-gray-800/50 cursor-pointer hover:shadow-md transition-all duration-200 group"
                      onClick={() => router.push(`/complaints/${complaint.complaint_id}`)}
                    >
                      <CardContent className={cn("p-5", viewMode === "list" && "flex items-start gap-4")}>
                        <div className={cn("space-y-3 flex-1 min-w-0", viewMode === "list" && "flex items-start gap-4")}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", getStatusColor(complaint.status))}>
                              {formatStatus(complaint.status)}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", getPriorityColor(complaint.priority))}>
                              {formatPriority(complaint.priority)}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {formatCategory(complaint.category)}
                            </span>
                          </div>

                          <div className={cn(viewMode === "list" && "flex-1 min-w-0")}>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {truncate(complaint.title, 80)}
                            </h3>
                            {viewMode === "list" && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                {truncate(complaint.description, 120)}
                              </p>
                            )}
                          </div>

                          <div className={cn(
                            "flex items-center gap-3 text-xs text-gray-400",
                            viewMode === "list" && "shrink-0"
                          )}>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(complaint.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {complaint.village}
                            </span>
                            <span className="flex items-center gap-1 ml-auto">
                              <ThumbsUp className="w-3 h-3" />
                              {complaint.upvotes}
                            </span>
                          </div>
                        </div>

                        {viewMode === "list" && complaint.image_urls?.[0] && (
                          <img
                            src={resolveMediaUrl(complaint.image_urls[0])}
                            alt=""
                            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-200 dark:border-gray-800"
                          />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, page - 2)
                      const pageNum = start + i
                      if (pageNum > totalPages) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="min-w-[36px]"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
