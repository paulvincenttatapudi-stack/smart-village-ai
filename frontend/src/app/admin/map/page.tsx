"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Map, Layers, Search, X, Filter, MapPin, Loader2,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, Thermometer
} from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { cn, formatStatus, formatCategory, formatPriority, truncate } from "@/lib/utils"
import api from "@/lib/api"

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false })

interface ComplaintMapItem {
  id: number
  title: string
  status: string
  priority: string
  category: string
  latitude: number
  longitude: number
  village: string
  ward_number?: number
  created_at: string
}

interface ComplaintsResponse {
  items: ComplaintMapItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

interface CategoryCount {
  category: string
  count: number
}

interface HotspotInfo {
  area: string
  count: number
}

const STATUS_MARKER_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  under_review: "#3b82f6",
  in_progress: "#6366f1",
  resolved: "#10b981",
  rejected: "#ef4444",
  closed: "#6b7280",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

function createStatusIcon(status: string) {
  if (typeof window === "undefined") return null
  // Lazy require keeps leaflet (which accesses `window` at import time) off the server bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet")
  const color = STATUS_MARKER_COLORS[status] || "#6b7280"
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker-icon",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -42],
  })
}

export default function AdminMapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [complaints, setComplaints] = useState<ComplaintMapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mapMounted, setMapMounted] = useState(false)
  const [legendMounted, setLegendMounted] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then(() => {
        setMapMounted(true)
      })
    }
  }, [])

  useEffect(() => {
    if (!mapMounted) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.get<ComplaintsResponse>("/api/admin/complaints", { page_size: 200 })
        if (!cancelled && res.items) {
          setComplaints(res.items.filter((c) => c.latitude && c.longitude))
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load map data"
          toast.error(message)
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [mapMounted])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    complaints.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1
    })
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }, [complaints])

  const hotspots = useMemo(() => {
    const counts: Record<string, number> = {}
    complaints.forEach((c) => {
      const area = c.village || `Ward ${c.ward_number || "Unknown"}`
      counts[area] = (counts[area] || 0) + 1
    })
    return Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [complaints])

  const filteredComplaints = useMemo(() => {
    let filtered = complaints
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.village?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          String(c.ward_number).includes(q)
      )
    }
    if (selectedCategory) {
      filtered = filtered.filter((c) => c.category === selectedCategory)
    }
    return filtered
  }, [complaints, searchQuery, selectedCategory])

  if (loading || !mapMounted) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading map data...</p>
          </div>
        </div>
      </div>
    )
  }

  const defaultCenter: [number, number] = filteredComplaints.length > 0
    ? [filteredComplaints[0].latitude, filteredComplaints[0].longitude]
    : [20.5937, 78.9629]

  const filteredCategoryCounts = selectedCategory
    ? categoryCounts.filter((c) => c.category === selectedCategory)
    : categoryCounts

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
                <Map className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  GIS Map
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Geographic visualization of all complaints
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search village/ward..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-8 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-48"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
              <Button
                variant={showHeatmap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <Thermometer className="w-4 h-4 mr-1.5" />
                Heatmap
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex"
              >
                {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block border-r border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950 overflow-y-auto flex-shrink-0"
                style={{ width: 320 }}
              >
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Filter className="w-4 h-4 text-indigo-500" />
                        Categories
                      </h3>
                      {selectedCategory && (
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {filteredCategoryCounts.slice(0, 10).map((item) => (
                        <button
                          key={item.category}
                          onClick={() => setSelectedCategory(selectedCategory === item.category ? null : item.category)}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-all",
                            selectedCategory === item.category
                              ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                              : "hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400"
                          )}
                        >
                          <span>{formatCategory(item.category)}</span>
                          <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {item.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      Hotspots
                    </h3>
                    <div className="space-y-2">
                      {hotspots.map((hotspot, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 text-sm"
                        >
                          <span className="font-medium truncate">{hotspot.area}</span>
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 ml-2">{hotspot.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold mb-3">Legend</h3>
                    <div className="space-y-2">
                      {Object.entries(STATUS_MARKER_COLORS).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-2.5 text-sm">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">{STATUS_LABELS[status] || formatStatus(status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <p className="text-xs text-gray-400">
                      Showing {filteredComplaints.length} of {complaints.length} complaints on map
                    </p>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="flex-1 relative">
            <div className="absolute inset-0 z-10">
              <MapContainer
                center={defaultCenter}
                zoom={10}
                className="w-full h-full"
                scrollWheelZoom={true}
                style={{ zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredComplaints.map((complaint) => {
                  const icon = createStatusIcon(complaint.status)
                  if (!icon) return null
                  return (
                    <Marker
                      key={complaint.id}
                      position={[complaint.latitude, complaint.longitude]}
                      icon={icon}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-gray-500">#{complaint.id}</span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: STATUS_MARKER_COLORS[complaint.status] + "20",
                                color: STATUS_MARKER_COLORS[complaint.status],
                              }}
                            >
                              {STATUS_LABELS[complaint.status] || formatStatus(complaint.status)}
                            </span>
                          </div>
                          <p className="font-semibold text-sm mb-1.5">{truncate(complaint.title, 50)}</p>
                          <div className="space-y-1 text-xs text-gray-500">
                            <p><span className="font-medium">Category:</span> {formatCategory(complaint.category)}</p>
                            <p><span className="font-medium">Priority:</span> {formatPriority(complaint.priority)}</p>
                            <p><span className="font-medium">Location:</span> {complaint.village}{complaint.ward_number ? `, Ward #${complaint.ward_number}` : ""}</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </div>

            {showHeatmap && (
              <div className="absolute top-4 right-4 z-20 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-4 max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold">Heatmap Layer</span>
                </div>
                <p className="text-xs text-gray-500">
                  Heatmap visualization requires a backend-generated heatmap endpoint. Toggle markers layer off for better visibility.
                </p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 z-20">
              <Card className="shadow-xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {filteredComplaints.length} markers displayed
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
