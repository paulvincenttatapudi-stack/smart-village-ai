"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send, CheckCircle2, Clock, AlertTriangle, Bot, Search,
  UserCheck, FileText, Shield, Loader2, Sparkles, ArrowRight,
  RotateCcw, Zap, MapPin, BarChart3, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { cn } from "@/lib/utils"

interface AIFeature {
  name: string
  status: string
  result: Record<string, unknown>
  confidence: number
  processing_ms: number
}

interface LifecycleStage {
  stage: string
  title: string
  description: string
  status: string
  timestamp: string
  ai_features: AIFeature[]
}

interface SimulationResponse {
  complaint_id: string
  stages: LifecycleStage[]
  total_processing_ms: number
}

const STAGE_ICONS: Record<string, typeof Send> = {
  submitted: Send,
  ai_analysis: Bot,
  duplicate_check: Search,
  auto_assign: UserCheck,
  in_progress: Clock,
  resolved: CheckCircle2,
}

const STAGE_COLORS: Record<string, string> = {
  submitted: "from-blue-500 to-cyan-500",
  ai_analysis: "from-violet-500 to-purple-500",
  duplicate_check: "from-amber-500 to-orange-500",
  auto_assign: "from-emerald-500 to-green-500",
  in_progress: "from-indigo-500 to-blue-500",
  resolved: "from-green-500 to-emerald-500",
}

const SAMPLE_COMPLAINTS = [
  {
    title: "Large pothole on Main Road near school",
    description: "There is a dangerous pothole on Main Road near the primary school. It is approximately 2 feet wide and causes traffic jams during peak hours. Multiple vehicles have been damaged.",
    village: "Rampur",
    district: "Sitapur",
  },
  {
    title: "Contaminated water supply in Ward 5",
    description: "The water supply in Ward 5 has been contaminated for the past 3 days. Residents are reporting stomach illnesses. The water appears yellowish and has a foul smell. Immediate testing required.",
    village: "Khandra",
    district: "Sitapur",
  },
  {
    title: "Broken streetlights on Civil Hospital Road",
    description: "All streetlights on the road leading to Civil Hospital have been non-functional for 2 weeks. This creates safety concerns for patients and staff traveling at night.",
    village: "Rampur",
    district: "Sitapur",
  },
  {
    title: "Garbage dumping near water tank",
    description: "Illegal garbage dumping is happening near the community water tank. The waste is attracting stray animals and creating a health hazard for the entire neighborhood.",
    village: "Milkipur",
    district: "Sitapur",
  },
]

export default function DemoPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [village, setVillage] = useState("Rampur")
  const [district, setDistrict] = useState("Sitapur")
  const [simulating, setSimulating] = useState(false)
  const [result, setResult] = useState<SimulationResponse | null>(null)
  const [activeStage, setActiveStage] = useState(-1)
  const [visibleFeatures, setVisibleFeatures] = useState<Record<number, number[]>>({})
  const [error, setError] = useState("")

  const resetDemo = useCallback(() => {
    setResult(null)
    setActiveStage(-1)
    setVisibleFeatures({})
    setTitle("")
    setDescription("")
    setError("")
  }, [])

  const fillSample = useCallback((index: number) => {
    const sample = SAMPLE_COMPLAINTS[index]
    setTitle(sample.title)
    setDescription(sample.description)
    setVillage(sample.village)
    setDistrict(sample.district)
  }, [])

  const animateStages = useCallback((stages: LifecycleStage[]) => {
    let stageIdx = 0

    const advanceStage = () => {
      if (stageIdx >= stages.length) return
      setActiveStage(stageIdx)

      const features = stages[stageIdx].ai_features
      if (features.length > 0) {
        let featureIdx = 0
        const showFeature = () => {
          if (featureIdx >= features.length) {
            stageIdx++
            setTimeout(advanceStage, 400)
            return
          }
          setVisibleFeatures(prev => ({
            ...prev,
            [stageIdx]: [...(prev[stageIdx] || []), featureIdx],
          }))
          featureIdx++
          setTimeout(showFeature, 300)
        }
        setTimeout(showFeature, 200)
      } else {
        stageIdx++
        setTimeout(advanceStage, 600)
      }
    }

    setTimeout(advanceStage, 300)
  }, [])

  const runSimulation = useCallback(async () => {
    if (!title.trim() || !description.trim()) return
    setSimulating(true)
    setResult(null)
    setActiveStage(-1)
    setVisibleFeatures({})
    setError("")

    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, village, district }),
      })
      if (!res.ok) throw new Error("Simulation failed")
      const data: SimulationResponse = await res.json()
      setResult(data)
      animateStages(data.stages)
    } catch {
      setError("Failed to run simulation. Please try again.")
    } finally {
      setSimulating(false)
    }
  }, [title, description, village, district, animateStages])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Live AI Demo
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Complaint Lifecycle Simulator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Submit a complaint and watch our AI pipeline analyze, classify, prioritize, and route it in real-time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input Panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Submit a Complaint
                </CardTitle>
                <CardDescription>Fill in the details or try a sample complaint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {SAMPLE_COMPLAINTS.map((sample, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => fillSample(i)}
                      disabled={simulating}
                      className="text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Sample {i + 1}
                    </Button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                    disabled={simulating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of the issue including location, severity, and impact..."
                    rows={5}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors resize-none"
                    disabled={simulating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Village</label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                      disabled={simulating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                      disabled={simulating}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={runSimulation}
                    disabled={simulating || !title.trim() || !description.trim()}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {simulating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Run AI Simulation</>
                    )}
                  </Button>
                  {result && (
                    <Button variant="outline" onClick={resetDemo}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Results Panel */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-violet-500" />
                  AI Pipeline Output
                </CardTitle>
                {result && (
                  <CardDescription>
                    Complaint <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">#{result.complaint_id}</span>
                    {" "} processed in <span className="font-semibold">{result.total_processing_ms}ms</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!result && !simulating && (
                  <div className="h-80 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <div className="text-center">
                      <Bot className="w-16 h-16 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Submit a complaint to see the AI pipeline in action</p>
                    </div>
                  </div>
                )}

                {simulating && !result && (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-violet-400/20 rounded-full blur-xl animate-pulse" />
                        <Loader2 className="relative w-12 h-12 text-violet-500 animate-spin" />
                      </div>
                      <p className="text-sm text-gray-500 mt-4">Initializing AI pipeline...</p>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3 max-h-[500px] overflow-y-auto pr-1"
                    >
                      {result.stages.map((stage, idx) => {
                        const Icon = STAGE_ICONS[stage.stage] || CheckCircle2
                        const isActive = idx <= activeStage
                        const isCurrent = idx === activeStage
                        const stageFeatures = visibleFeatures[idx] || []

                        return (
                          <motion.div
                            key={stage.stage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isActive ? 1 : 0.3, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className={cn(
                              "relative rounded-xl border p-4 transition-all duration-500",
                              isCurrent && "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md",
                              isActive && !isCurrent && "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20",
                              !isActive && "border-gray-100 dark:border-gray-800"
                            )}>
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 transition-all duration-500",
                                  isActive ? STAGE_COLORS[stage.stage] : "from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
                                )}>
                                  {isCurrent ? (
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                  ) : (
                                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-gray-400")} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold">{stage.title}</h4>
                                    {isActive && !isCurrent && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stage.description}</p>

                                  {/* AI Features */}
                                  {stage.ai_features.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {stage.ai_features.map((feature, fIdx) => (
                                        <AnimatePresence key={feature.name}>
                                          {stageFeatures.includes(fIdx) && (
                                            <motion.div
                                              initial={{ opacity: 0, x: -10, height: 0 }}
                                              animate={{ opacity: 1, x: 0, height: "auto" }}
                                              exit={{ opacity: 0 }}
                                              transition={{ duration: 0.3 }}
                                              className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-100 dark:border-gray-800"
                                            >
                                              <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-medium flex items-center gap-1.5">
                                                  <Sparkles className="w-3 h-3 text-violet-500" />
                                                  {feature.name}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{feature.processing_ms}ms</span>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                      initial={{ width: 0 }}
                                                      animate={{ width: `${Math.round(feature.confidence * 100)}%` }}
                                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                                                    />
                                                  </div>
                                                </div>
                                                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                                                  {Math.round(feature.confidence * 100)}%
                                                </span>
                                              </div>
                                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {Object.entries(feature.result).map(([key, val]) => (
                                                  <span key={key} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-400">
                                                    {key}: <span className="font-semibold ml-1">{String(val)}</span>
                                                  </span>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI Capabilities Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-center mb-6 text-gray-900 dark:text-white">
            AI Capabilities Demonstrated
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Bot, label: "Classification", desc: "8 categories" },
              { icon: AlertTriangle, label: "Priority", desc: "4 levels" },
              { icon: MapPin, label: "Routing", desc: "Auto-department" },
              { icon: Search, label: "Duplicates", desc: "Jaccard similarity" },
              { icon: UserCheck, label: "Assignment", desc: "Smart matching" },
              { icon: BarChart3, label: "Analytics", desc: "Real-time metrics" },
            ].map((cap) => (
              <Card key={cap.label} className="text-center p-4 hover:shadow-md transition-shadow">
                <cap.icon className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                <p className="text-sm font-semibold">{cap.label}</p>
                <p className="text-xs text-gray-500">{cap.desc}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
