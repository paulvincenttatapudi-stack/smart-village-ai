import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="relative w-12 h-12 text-indigo-500 dark:text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  )
}
