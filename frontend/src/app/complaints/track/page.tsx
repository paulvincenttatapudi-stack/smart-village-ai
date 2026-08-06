"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Search, Loader2, AlertCircle, MapPin, Clock, CheckCircle, ThumbsUp, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { api, resolveMediaUrl } from "@/lib/api"
import { cn, formatDate, formatStatus, getStatusColor } from "@/lib/utils"

interface ComplaintDetail {
  id: number
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
  pincode?: string
  upvotes: number
  created_at: string
  updated_at?: string
  resolved_at?: string
  resolution_notes?: string
  image_urls: string[]
}

export default function TrackComplaintPage() {
  const [searchId, setSearchId] = useState("")
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    const id = searchId.trim().toUpperCase()
    if (!id) {
      setError("Please enter a complaint ID")
      return
    }
    setLoading(true)
    setError(null)
    setComplaint(null)
    try {
      const result = await api.get<ComplaintDetail>(`/api/complaints/${id}`)
      setComplaint(result)
    } catch (err) {
      setError(err && typeof err === "object" && "message" in err
        ? String(err.message)
        : "Complaint not found. Please check the ID and try again.")
    } finally {
      setLoading(false)
    }
  }, [searchId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <div className="relative pt-24 pb-12 min-h-screen">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-950 dark:to-emerald-950/20" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Track Complaint</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter your complaint ID (e.g., SV123456) to check its status
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-gray-200/50 dark:border-gray-800/50">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter complaint ID (e.g., SV123456)"
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={loading || !searchId.trim()}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {complaint && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
              <Card className="border-gray-200/50 dark:border-gray-800/50">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">#{complaint.complaint_id}</span>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{complaint.title}</h2>
                    </div>
                    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-medium", getStatusColor(complaint.status))}>
                      {formatStatus(complaint.status)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">{complaint.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Category</p>
                        <p className="text-sm font-medium">{complaint.category || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Priority</p>
                        <p className="text-sm font-medium">{complaint.priority || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Ward</p>
                        <p className="text-sm font-medium">{complaint.ward_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Upvotes</p>
                        <p className="text-sm font-medium">{complaint.upvotes}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{complaint.address}, {complaint.village}, {complaint.district}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Filed on {formatDate(complaint.created_at)}</span>
                    </div>
                    {complaint.resolved_at && (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">Resolved on {formatDate(complaint.resolved_at)}</span>
                      </div>
                    )}
                  </div>

                  {complaint.resolution_notes && (
                    <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Resolution Notes</p>
                      <p className="text-sm text-green-800 dark:text-green-300">{complaint.resolution_notes}</p>
                    </div>
                  )}

                  {complaint.image_urls && complaint.image_urls.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Attached Images</p>
                      <div className="flex gap-2 flex-wrap">
                        {complaint.image_urls.map((url, i) => (
                          <img key={i} src={resolveMediaUrl(url)} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-800" />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!complaint && !loading && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                <Search className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enter your complaint ID</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                You can find your complaint ID in the confirmation email or in &quot;My Complaints&quot; section. It starts with SV followed by 6 digits.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
