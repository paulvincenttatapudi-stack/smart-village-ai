"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowRight, Check, AlertTriangle, MapPin, Loader2,
  ImagePlus, X, FileText, Map, Send, Search, Clock, Sparkles,
  Upload, Camera, Info, Navigation, Trash2, BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AnalysisResult {
  category: string
  priority: string
  department: string
  summary: string
  confidence: number
}

interface DuplicateResult {
  is_duplicate: boolean
  matches: Array<{
    complaint_id: string
    title: string
    similarity: number
  }>
}

interface ComplaintData {
  title: string
  description: string
  images: File[]
  previews: string[]
  address: string
  latitude: string
  longitude: string
  ward_number: string
  village: string
  district: string
  pincode: string
}

const steps = [
  { id: 1, label: "Basic Info", icon: FileText },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Review & Submit", icon: Send },
]

const fadeIn = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
}

export default function ReportComplaintPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ComplaintData>({
    title: "",
    description: "",
    images: [],
    previews: [],
    address: "",
    latitude: "",
    longitude: "",
    ward_number: "",
    village: "",
    district: "",
    pincode: "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ComplaintData, string>>>({})

  const updateField = useCallback(<K extends keyof ComplaintData>(field: K, value: ComplaintData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }, [])

  const analyzeComplaint = useCallback(async (title: string, description: string) => {
    if (!title.trim() && !description.trim()) {
      setAnalysis(null)
      return
    }
    setAnalyzing(true)
    try {
      const result = await api.post<AnalysisResult>("/api/complaints/analyze", { title, description })
      setAnalysis(result)
    } catch {
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const title = formData.title
    const description = formData.description
    debounceRef.current = setTimeout(() => {
      if (!title.trim() && !description.trim()) {
        setAnalysis(null)
        return
      }
      analyzeComplaint(title, description)
    }, title.trim() || description.trim() ? 600 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [formData.title, formData.description, analyzeComplaint])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024)
    if (validFiles.length !== files.length) {
      toast.error("Some files were skipped. Max 5MB per image.")
    }
    const newImages = [...formData.images, ...validFiles].slice(0, 5)
    const newPreviews = newImages.map((f) => URL.createObjectURL(f))
    formData.previews.forEach((p) => URL.revokeObjectURL(p))
    setFormData((prev) => ({ ...prev, images: newImages, previews: newPreviews }))
  }, [formData.images, formData.previews])

  const removeImage = useCallback((index: number) => {
    URL.revokeObjectURL(formData.previews[index])
    const newImages = formData.images.filter((_, i) => i !== index)
    const newPreviews = formData.previews.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, images: newImages, previews: newPreviews }))
  }, [formData.images, formData.previews])

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }))
        setGeoLoading(false)
        toast.success("Location captured successfully")
      },
      () => {
        toast.error("Failed to get location. Please enter coordinates manually.")
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Partial<Record<keyof ComplaintData, string>> = {}
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Title is required"
      else if (formData.title.length < 10) newErrors.title = "Title must be at least 10 characters"
      if (!formData.description.trim()) newErrors.description = "Description is required"
      else if (formData.description.length < 20) newErrors.description = "Description must be at least 20 characters"
    } else if (step === 2) {
      if (!formData.address.trim()) newErrors.address = "Address is required"
      if (!formData.latitude.trim()) newErrors.latitude = "Latitude is required"
      if (!formData.longitude.trim()) newErrors.longitude = "Longitude is required"
      if (!formData.ward_number.trim()) newErrors.ward_number = "Ward number is required"
      if (!formData.village.trim()) newErrors.village = "Village is required"
      if (!formData.district.trim()) newErrors.district = "District is required"
      if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required"
      else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = "Invalid pincode"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const checkDuplicate = useCallback(async () => {
    if (!formData.title.trim() || !formData.description.trim()) return
    setCheckingDuplicate(true)
    try {
      const result = await api.post<DuplicateResult>("/api/complaints/check-duplicate", {
        title: formData.title,
        description: formData.description,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      })
      setDuplicateResult(result)
    } catch {
      setDuplicateResult(null)
    } finally {
      setCheckingDuplicate(false)
    }
  }, [formData.title, formData.description, formData.latitude, formData.longitude])

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        checkDuplicate()
      }
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    }
  }, [currentStep, validateStep, checkDuplicate])

  useEffect(() => {
    if (currentStep === 3 && !duplicateResult) {
      const run = async () => {
        await checkDuplicate()
      }
      run()
    }
  }, [currentStep, duplicateResult, checkDuplicate])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      const payload = new FormData()
      payload.append("title", formData.title.trim())
      payload.append("description", formData.description.trim())
      payload.append("address", formData.address.trim())
      payload.append("latitude", formData.latitude)
      payload.append("longitude", formData.longitude)
      payload.append("ward_number", formData.ward_number)
      payload.append("village", formData.village.trim())
      payload.append("district", formData.district.trim())
      payload.append("pincode", formData.pincode)
      formData.images.forEach((img) => payload.append("images", img))

      await api.upload("/api/complaints", payload)
      toast.success("Complaint submitted successfully!", {
        icon: <BadgeCheck className="w-5 h-5 text-green-500" />,
      })
      router.push("/complaints/view")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit complaint")
    } finally {
      setSubmitting(false)
    }
  }, [formData, router])

  const canProceed = (step: number) => {
    if (step === 1) return formData.title.trim().length >= 10 && formData.description.trim().length >= 20
    if (step === 2) return formData.address.trim() && formData.latitude && formData.longitude && formData.ward_number && formData.village && formData.district && formData.pincode
    return true
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <div className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Step Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={{
                          scale: isActive ? 1.1 : 1,
                          backgroundColor: isCompleted ? "rgb(99,102,241)" : isActive ? "rgb(99,102,241)" : "rgb(229,231,235)",
                        }}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300",
                          isCompleted && "bg-indigo-600",
                          isActive && "bg-indigo-600 shadow-lg shadow-indigo-500/30",
                          !isActive && !isCompleted && "bg-gray-200 dark:bg-gray-800",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-400 dark:text-gray-600")} />
                        )}
                      </motion.div>
                      <span
                        className={cn(
                          "mt-2 text-xs font-medium transition-colors duration-300",
                          isActive || isCompleted
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-gray-400 dark:text-gray-600",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 mx-4 mb-6">
                        <div className="h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: isCompleted ? "100%" : "0%" }}
                            transition={{ duration: 0.4 }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="step1" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="border-gray-200/50 dark:border-gray-800/50">
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Basic Information</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Describe your complaint in detail</p>
                    </div>

                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Complaint Title *
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="e.g., Pothole on Main Road near Market"
                        className={cn(
                          "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                          errors.title
                            ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                            : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                        )}
                      />
                      {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title}</p>}
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Description *
                      </label>
                      <textarea
                        id="description"
                        rows={5}
                        value={formData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Provide a detailed description of the issue..."
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200 resize-none",
                          errors.description
                            ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                            : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                        )}
                      />
                      {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description}</p>}
                      <p className="mt-1.5 text-xs text-gray-400">{formData.description.length} characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Images (Optional - Max 5)
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {formData.previews.map((preview, index) => (
                          <div key={preview} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-24 h-24 rounded-xl object-cover border border-gray-200 dark:border-gray-800"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {formData.previews.length < 5 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                          >
                            <ImagePlus className="w-6 h-6" />
                            <span className="text-[10px]">Add Photo</span>
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <p className="mt-1.5 text-xs text-gray-400">JPG, PNG, WEBP. Max 5MB each.</p>
                    </div>

                    {/* AI Analysis Preview */}
                    {(analyzing || analysis) && (
                      <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">AI Analysis Preview</span>
                          {analyzing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin ml-auto" />}
                        </div>
                        {analyzing ? (
                          <div className="space-y-2">
                            <div className="h-4 bg-indigo-200/50 dark:bg-indigo-800/30 rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-indigo-200/50 dark:bg-indigo-800/30 rounded w-1/2 animate-pulse" />
                            <div className="h-4 bg-indigo-200/50 dark:bg-indigo-800/30 rounded w-2/3 animate-pulse" />
                          </div>
                        ) : analysis ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Category:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{analysis.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Priority:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{analysis.priority}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Department:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{analysis.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{(analysis.confidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="mt-2 p-3 rounded-lg bg-white/50 dark:bg-gray-950/50">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Summary</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.summary}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </Card>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleNext} disabled={!canProceed(1)} size="lg" className="group">
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="border-gray-200/50 dark:border-gray-800/50">
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Location Details</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Where did this issue occur?</p>
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Address *
                      </label>
                      <input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="e.g., 123 Main Street, Near City Market"
                        className={cn(
                          "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                          errors.address
                            ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                            : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                        )}
                      />
                      {errors.address && <p className="mt-1.5 text-xs text-red-500">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Latitude *
                        </label>
                        <input
                          id="latitude"
                          type="text"
                          value={formData.latitude}
                          onChange={(e) => updateField("latitude", e.target.value)}
                          placeholder="e.g., 28.6139"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                            errors.latitude
                              ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                              : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                          )}
                        />
                        {errors.latitude && <p className="mt-1.5 text-xs text-red-500">{errors.latitude}</p>}
                      </div>
                      <div>
                        <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Longitude *
                        </label>
                        <input
                          id="longitude"
                          type="text"
                          value={formData.longitude}
                          onChange={(e) => updateField("longitude", e.target.value)}
                          placeholder="e.g., 77.2090"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                            errors.longitude
                              ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                              : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                          )}
                        />
                        {errors.longitude && <p className="mt-1.5 text-xs text-red-500">{errors.longitude}</p>}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={getLocation}
                      disabled={geoLoading}
                      className="w-full"
                    >
                      {geoLoading ? (
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      ) : (
                        <Navigation className="mr-2 w-4 h-4" />
                      )}
                      {geoLoading ? "Getting Location..." : "Use My Location"}
                    </Button>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ward_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Ward Number *
                        </label>
                        <input
                          id="ward_number"
                          type="text"
                          value={formData.ward_number}
                          onChange={(e) => updateField("ward_number", e.target.value)}
                          placeholder="e.g., 12"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                            errors.ward_number
                              ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                              : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                          )}
                        />
                        {errors.ward_number && <p className="mt-1.5 text-xs text-red-500">{errors.ward_number}</p>}
                      </div>
                      <div>
                        <label htmlFor="village" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Village / Town *
                        </label>
                        <input
                          id="village"
                          type="text"
                          value={formData.village}
                          onChange={(e) => updateField("village", e.target.value)}
                          placeholder="e.g., Vellore"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                            errors.village
                              ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                              : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                          )}
                        />
                        {errors.village && <p className="mt-1.5 text-xs text-red-500">{errors.village}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          District *
                        </label>
                        <input
                          id="district"
                          type="text"
                          value={formData.district}
                          onChange={(e) => updateField("district", e.target.value)}
                          placeholder="e.g., Vellore"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                            errors.district
                              ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                              : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                          )}
                        />
                        {errors.district && <p className="mt-1.5 text-xs text-red-500">{errors.district}</p>}
                      </div>
                      <div>
                        <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Pincode *
                        </label>
                        <input
                          id="pincode"
                          type="text"
                          value={formData.pincode}
                          onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="e.g., 632001"
                          className={cn(
                            "w-full h-11 px-4 rounded-xl border bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200",
                            errors.pincode
                              ? "border-red-300 dark:border-red-700 focus:ring-red-500"
                              : "border-gray-200 dark:border-gray-800 focus:ring-indigo-500",
                          )}
                        />
                        {errors.pincode && <p className="mt-1.5 text-xs text-red-500">{errors.pincode}</p>}
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} size="lg">
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={!canProceed(2)} size="lg" className="group">
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="border-gray-200/50 dark:border-gray-800/50">
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Review & Submit</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Please verify all details before submitting</p>
                    </div>

                    {/* Basic Info Review */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Basic Information</h3>
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
                        <div>
                          <span className="text-xs text-gray-400 block">Title</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formData.title}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Description</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{formData.description}</span>
                        </div>
                        {formData.previews.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-400 block mb-2">Images ({formData.previews.length})</span>
                            <div className="flex gap-2">
                              {formData.previews.map((preview, i) => (
                                <img key={i} src={preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-800" />
                              ))}
                            </div>
                          </div>
                        )}
                        {analysis && (
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              <Sparkles className="w-3 h-3" />
                              {analysis.category}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {analysis.priority} Priority
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {analysis.department}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Review */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</h3>
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-gray-400 block">Address</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{formData.address}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block">Coordinates</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{formData.latitude}, {formData.longitude}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block">Ward</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{formData.ward_number}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block">Village</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{formData.village}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block">District</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{formData.district}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block">Pincode</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{formData.pincode}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duplicate Check Results */}
                    {checkingDuplicate ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                        <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-400">Checking for duplicates...</span>
                      </div>
                    ) : duplicateResult?.is_duplicate ? (
                      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Potential duplicate detected</p>
                            <p className="text-xs text-red-500 dark:text-red-500 mt-1">Similar complaints found:</p>
                            <ul className="mt-2 space-y-1">
                              {duplicateResult.matches.map((match) => (
                                <li key={match.complaint_id} className="text-xs text-red-600 dark:text-red-400">
                                  #{match.complaint_id} - {match.title} ({(match.similarity * 100).toFixed(0)}% match)
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : duplicateResult ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <BadgeCheck className="w-5 h-5 text-green-500 shrink-0" />
                        <span className="text-sm text-green-700 dark:text-green-400">No duplicates found. Good to submit!</span>
                      </div>
                    ) : null}
                  </div>
                </Card>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} size="lg">
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting} size="lg" className="group min-w-[180px]">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 w-4 h-4" />
                        Submit Complaint
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
