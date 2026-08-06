"use client"

import { useEffect, useRef } from "react"
import { motion, useInView, useScroll, useTransform } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight, Bot, Brain, MapPin, BarChart3, Shield, Upload,
  MessageSquare, CheckCircle, Clock, Users, Building2, Bell,
  Activity, Sparkles, FileText, Globe, Home, Zap, Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
}

export default function HomePage() {
  const router = useRouter()
  const { scrollYProgress } = useScroll()
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" })
  const statsRef = useRef<HTMLDivElement>(null)
  const statsInView = useInView(statsRef, { once: true })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95])

  const features = [
    {
      icon: Bot,
      title: "AI Classification",
      description: "Automatically categorize complaints into Road, Water, Electricity, and more using advanced NLP.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Brain,
      title: "Smart Priority",
      description: "AI predicts urgency and assigns priority levels ensuring critical issues get immediate attention.",
      gradient: "from-red-500 to-orange-500",
    },
    {
      icon: MapPin,
      title: "Duplicate Detection",
      description: "Detects similar complaints within a configurable radius to prevent duplicates and amplify voices.",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Upload,
      title: "Image Analysis",
      description: "Computer vision detects potholes, garbage accumulation, water leaks, and damaged property.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: MessageSquare,
      title: "AI Summary",
      description: "Long complaint descriptions are condensed into clear, actionable administrative summaries.",
      gradient: "from-yellow-500 to-amber-500",
    },
    {
      icon: Building2,
      title: "Smart Routing",
      description: "Complaints are automatically routed to the correct department for faster resolution.",
      gradient: "from-indigo-500 to-violet-500",
    },
    {
      icon: BarChart3,
      title: "AI Analytics",
      description: "Real-time dashboards with trends, hotspot mapping, and department performance metrics.",
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Conversational AI assistant for administrators to query data and manage complaints.",
      gradient: "from-rose-500 to-pink-500",
    },
  ]

  const stats = [
    { value: "99.9%", label: "AI Classification Accuracy", icon: Brain },
    { value: "< 2s", label: "Processing Time", icon: Zap },
    { value: "8", label: "Complaint Categories", icon: Layers },
    { value: "5", label: "Departments Integrated", icon: Building2 },
  ]

  const steps = [
    { icon: FileText, title: "Submit Complaint", description: "Citizen files a complaint via web or mobile with optional photos and location." },
    { icon: Brain, title: "AI Analysis", description: "Our AI classifies, prioritizes, summarizes, and routes the complaint automatically." },
    { icon: Building2, title: "Department Action", description: "The right department receives and acts on the complaint with full tracking." },
    { icon: CheckCircle, title: "Resolution", description: "Citizen gets real-time updates. Admins monitor performance via analytics." },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/30" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-3xl" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 mb-8">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                AI-Powered Smart Governance Platform
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="text-gray-900 dark:text-white">Smart Village</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              AI Governance
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            An intelligent complaint management platform powered by AI that connects citizens with local governance.
            Report issues, track progress, and build smarter villages together.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="xl" onClick={() => router.push("/register")} className="group">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="xl" variant="outline" onClick={() => router.push("/demo")} className="group border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30">
              Try Live Demo
            </Button>
            <Button size="xl" variant="ghost" onClick={() => router.push("/auth/citizen-login")}>
              Sign In
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {["Citizen Portal", "Report Issues", "Track Status", "AI Powered"].map((item) => (
              <div key={item} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative py-20 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={statsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              AI-Powered Features
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Every complaint is intelligently processed using machine learning for faster, more accurate governance.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            animate={featuresInView ? "animate" : "initial"}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeIn}
                  whileHover={{ y: -4 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-2xl -m-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Card className="relative p-6 h-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} p-2.5 mb-4`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From submission to resolution in four simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center relative"
                >
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400" />
                  )}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 relative">
                    <Icon className="w-8 h-8 text-white" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-950 border-2 border-indigo-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{index + 1}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Built for <span className="text-gradient">Smart Governance</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Smart Village AI Platform is a comprehensive digital governance solution that leverages artificial 
                intelligence to streamline complaint management, improve transparency, and accelerate resolution times.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: "JWT-based role authentication for citizens and administrators" },
                  { icon: Globe, text: "GIS mapping with OpenStreetMap integration for location tracking" },
                  { icon: Bell, text: "Real-time WebSocket notifications for instant status updates" },
                  { icon: BarChart3, text: "Comprehensive analytics with AI-driven insights and trends" },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.text} className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.text}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { number: "8", label: "AI Categories", color: "from-blue-500 to-cyan-500" },
                { number: "5", label: "Departments", color: "from-purple-500 to-pink-500" },
                { number: "99%", label: "Accuracy", color: "from-green-500 to-emerald-500" },
                { number: "24/7", label: "Availability", color: "from-orange-500 to-red-500" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} text-white text-center`}
                >
                  <div className="text-3xl font-bold mb-1">{item.number}</div>
                  <div className="text-sm opacity-90">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Village?
            </h2>
            <p className="text-lg text-indigo-100 mb-10 max-w-2xl mx-auto">
              Join the smart governance revolution. Register your village and start managing complaints with AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="xl"
                variant="secondary"
                onClick={() => router.push("/register")}
                className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => router.push("/auth/admin-login")}
                className="border-indigo-300 text-white hover:bg-white/10"
              >
                Admin Login
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">SV</span>
              </div>
              <span className="font-bold text-lg">Smart Village</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Smart Village AI Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
