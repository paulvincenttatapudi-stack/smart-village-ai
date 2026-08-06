"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, ThumbsUp, MapPin, Calendar, Clock, Loader2,
  AlertCircle, ImageIcon, ChevronLeft, ChevronRight, BadgeCheck,
  MessageSquare, Building2, Sparkles, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { api, resolveMediaUrl } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { cn, formatDate, formatStatus, formatCategory, formatPriority, getStatusColor, getPriorityColor } from "@/lib/utils"
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  ),
})

interface ComplaintDetail {
  complaint_id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  department: string
  ai_summary: string
  address: string
  latitude: number
  longitude: number
  ward_number: number
  village: string
  district: string
  pincode: string
  upvotes: number
  has_upvoted: boolean
  image_urls: string[]
  created_at: string
  updated_at: string
}

interface Update {
  id: number
  status: string
  comment: string
  created_by: string
  created_at: string
}

export default function ComplaintDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null)
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upvoting, setUpvoting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [complaintData, updatesData] = await Promise.all([
          api.get<ComplaintDetail>(`/api/complaints/${id}`),
          api.get<Update[]>(`/api/complaints/${id}/updates`).catch(() => []),
        ])
        if (cancelled) return
        setComplaint(complaintData)
        setUpdates(updatesData)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load complaint")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleUpvote = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to upvote")
      return
    }
    setUpvoting(true)
    try {
      const result = await api.post<{ upvotes: number; has_upvoted: boolean }>(`/api/complaints/${id}/upvote`)
      setComplaint((prev) =>
        prev
          ? { ...prev, upvotes: result.upvotes, has_upvoted: result.has_upvoted }
          : prev
      )
      toast.success(result.has_upvoted ? "Complaint upvoted!" : "Upvote removed")
    } catch {
      toast.error("Failed to upvote")
    } finally {
      setUpvoting(false)
    }
  }, [id, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navbar />
        <div className="relative pt-24 pb-12 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navbar />
        <div className="relative pt-24 pb-12 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Complaint Not Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || "The complaint you're looking for doesn't exist"}</p>
              <Button onClick={() => router.push("/complaints/view")} variant="outline">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Complaints
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <div className="relative pt-24 pb-12 min-h-screen">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-400">#{complaint.complaint_id}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(complaint.created_at)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  {complaint.title}
                </h1>
              </div>
              <Button
                variant={complaint.has_upvoted ? "default" : "outline"}
                size="sm"
                onClick={handleUpvote}
                disabled={upvoting}
                className={cn(
                  "shrink-0",
                  complaint.has_upvoted && "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}
              >
                <ThumbsUp className={cn("mr-1.5 w-4 h-4", upvoting && "animate-pulse")} />
                {complaint.upvotes}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className={cn("px-3 py-1 rounded-lg text-xs font-medium", getStatusColor(complaint.status))}>
                {formatStatus(complaint.status)}
              </span>
              <span className={cn("px-3 py-1 rounded-lg text-xs font-medium", getPriorityColor(complaint.priority))}>
                {formatPriority(complaint.priority)}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {formatCategory(complaint.category)}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Building2 className="w-3 h-3 inline mr-1" />
                {complaint.department}
              </span>
            </div>
          </div>

          {/* Image Gallery */}
          {complaint.image_urls && complaint.image_urls.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {complaint.image_urls.map((url, index) => (
                  <button
                    key={url}
                    onClick={() => setSelectedImage(selectedImage === index ? null : index)}
                    className={cn(
                      "shrink-0 w-32 h-24 rounded-xl overflow-hidden border-2 transition-all duration-200",
                      selectedImage === index
                        ? "border-indigo-500 ring-2 ring-indigo-500/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700",
                    )}
                  >
                    <img src={resolveMediaUrl(url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {selectedImage !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
                >
                  <img
                    src={resolveMediaUrl(complaint.image_urls[selectedImage])}
                    alt=""
                    className="w-full max-h-[400px] object-contain bg-black/5 dark:bg-black/20"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    {selectedImage > 0 && (
                      <button
                        onClick={() => setSelectedImage(selectedImage - 1)}
                        className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    {selectedImage < complaint.image_urls.length - 1 && (
                      <button
                        onClick={() => setSelectedImage(selectedImage + 1)}
                        className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Description */}
              <Card className="border-gray-200/50 dark:border-gray-800/50">
                <CardContent className="p-6">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Description
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {complaint.description}
                  </p>
                </CardContent>
              </Card>

              {/* AI Summary */}
              {complaint.ai_summary && (
                <Card className="border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                        AI Summary
                      </h2>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {complaint.ai_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Updates Timeline */}
              {updates.length > 0 && (
                <Card className="border-gray-200/50 dark:border-gray-800/50">
                  <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Updates ({updates.length})
                    </h2>
                    <div className="space-y-4">
                      {updates.map((update, index) => (
                        <div key={update.id} className="relative pl-6">
                          {index < updates.length - 1 && (
                            <div className="absolute left-[7px] top-3 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
                          )}
                          <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-indigo-500 bg-white dark:bg-gray-950 flex items-center justify-center">
                            <div className="w-[5px] h-[5px] rounded-full bg-indigo-500" />
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className={cn("inline-block px-2 py-0.5 rounded-lg text-xs font-medium mb-1", getStatusColor(update.status))}>
                                {formatStatus(update.status)}
                              </span>
                              {update.comment && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{update.comment}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{update.created_by}</p>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{formatDate(update.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Location */}
              <Card className="border-gray-200/50 dark:border-gray-800/50">
                <CardContent className="p-6">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h2>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">{complaint.address}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="block text-gray-400">Ward</span>
                        {complaint.ward_number}
                      </div>
                      <div>
                        <span className="block text-gray-400">Village</span>
                        {complaint.village}
                      </div>
                      <div>
                        <span className="block text-gray-400">District</span>
                        {complaint.district}
                      </div>
                      <div>
                        <span className="block text-gray-400">Pincode</span>
                        {complaint.pincode}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <MapComponent
                      latitude={complaint.latitude}
                      longitude={complaint.longitude}
                      popupText={complaint.title}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Info */}
              <Card className="border-gray-200/50 dark:border-gray-800/50">
                <CardContent className="p-6">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Details
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Created</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatDate(complaint.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Updated</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatDate(complaint.updated_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Upvotes</span>
                      <span className="text-gray-900 dark:text-gray-100">{complaint.upvotes}</span>
                    </div>
                    {complaint.image_urls && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Images</span>
                        <span className="text-gray-900 dark:text-gray-100">{complaint.image_urls.length}</span>
                      </div>
                    )}
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
