import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

export function formatCategory(category: string) {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

export function formatPriority(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  }
  return colors[priority] || "bg-gray-100 text-gray-800"
}

export function truncate(str: string, length: number) {
  if (!str) return ""
  return str.length > length ? str.substring(0, length) + "..." : str
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9)
}
