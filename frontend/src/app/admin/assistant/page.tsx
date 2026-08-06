"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, Send, User, Sparkles, Loader2, MessageSquare,
  Lightbulb, CornerDownRight, AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { cn, formatStatus, formatCategory, formatPriority, formatDate, truncate } from "@/lib/utils"
import api from "@/lib/api"

interface ComplaintSummary {
  complaint_id?: string
  id?: number
  title?: string
  description?: string
  status?: string
  category?: string
  priority?: string
  village?: string
}

interface ChatStructuredObject {
  complaints?: ComplaintSummary[]
  total?: number
  resolved?: number
  pending?: number
  complaint_id?: string
  status?: string
  category?: string
  priority?: string
  capabilities?: string[]
}

type ChatStructuredData = ChatStructuredObject | ChatStructuredObject[]

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  data?: ChatStructuredData
  created_at: string
}

interface ChatHistoryResponse {
  messages: ChatMessage[]
}

const SUGGESTED_PROMPTS = [
  "Show unresolved complaints in Ward 5",
  "How many water complaints this month?",
  "Which village has the highest complaint count?",
  "What are top critical complaints?",
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
          {i % 2 === 0 && (
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0 animate-pulse" />
          )}
          <div className={cn("space-y-2", i % 2 === 0 ? "order-1" : "order-1")}>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          </div>
          {i % 2 !== 0 && (
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 flex-shrink-0 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  )
}

function StructuredDataView({ data }: { data: ChatStructuredData | undefined }) {
  if (!data) return null

  if (Array.isArray(data)) {
    if (data.length === 0) return null
    return (
      <div className="mt-3 space-y-2">
        {data.slice(0, 5).map((item: ChatStructuredObject, i: number) => (
          <div key={i} className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            {Object.entries(item).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-sm py-0.5">
                <span className="text-gray-500 capitalize">{key.replace(/_/g, " ")}</span>
                <span className="font-medium">{String(val)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  const complaints = data.complaints
  if (Array.isArray(complaints) && complaints.length > 0) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {complaints.length} complaint{complaints.length > 1 ? "s" : ""} found
        </p>
        {complaints.slice(0, 5).map((complaint, i) => (
          <div
            key={i}
            className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">#{complaint.complaint_id ?? complaint.id ?? "–"}</span>
                  {complaint.status && (
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                      complaint.status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                      complaint.status === "in_progress" && "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
                      complaint.status === "resolved" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      complaint.status === "critical" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                    )}>
                      {formatStatus(complaint.status)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mt-1">{truncate(complaint.title || complaint.description || "", 60)}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                  {complaint.category && <span>{formatCategory(complaint.category)}</span>}
                  {complaint.priority && <span>{formatPriority(complaint.priority)}</span>}
                  {complaint.village && <span>{complaint.village}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {complaints.length > 5 && (
          <p className="text-xs text-gray-400 text-center">
            +{complaints.length - 5} more
          </p>
        )}
      </div>
    )
  }

  return null
}

function ChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={cn("max-w-[80%] lg:max-w-[65%]", isUser && "order-1")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
              : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.data && <StructuredDataView data={message.data} />}
        </div>
        <p className={cn("text-[10px] mt-1 text-gray-400", isUser ? "text-right" : "text-left")}>
          {formatDate(message.created_at)}
        </p>
      </div>

      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </motion.div>
  )
}

export default function AdminAssistantPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      try {
        setError(null)
        const res = await api.get<ChatHistoryResponse>("/api/chat/history")
        if (!cancelled) {
          setMessages(res.messages || [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load chat history"
          setError(message)
          setLoading(false)
        }
      }
    }
    loadHistory()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSending(true)

    try {
      const res = await api.post<{ reply: string; data?: ChatStructuredData }>("/api/chat", { message: text.trim() })
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: res.reply || "I processed your request.",
        data: res.data,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get response"
      toast.error(message)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${message}. Please try again.`,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setSending(false)
    }
  }, [sending])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt)
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
                <Bot className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Ask questions about complaints, analytics, and more
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/50">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">AI Powered</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 overflow-y-auto">
              <ChatSkeleton />
            </div>
          ) : messages.length === 0 && !error ? (
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Hello! How can I help you?</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  I can answer questions about complaints, generate reports, and provide insights about your smart village platform.
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Suggested Questions</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{prompt}</span>
                        <CornerDownRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Connection Error</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="border-t border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950 p-4 sm:p-6">
            {messages.length === 0 && !loading && !error && (
              <div className="flex flex-wrap gap-2 mb-4 sm:hidden">
                {SUGGESTED_PROMPTS.slice(0, 2).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 transition-colors border border-gray-200 dark:border-gray-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full resize-none rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 pr-12 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all min-h-[48px] max-h-32"
                  style={{ scrollbarWidth: "thin" }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = "auto"
                    el.style.height = Math.min(el.scrollHeight, 128) + "px"
                  }}
                  disabled={sending}
                />
              </div>
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                size="icon"
                className="h-12 w-12 rounded-2xl flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2 max-w-4xl mx-auto">
              AI responses are generated based on platform data. Verify critical information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
