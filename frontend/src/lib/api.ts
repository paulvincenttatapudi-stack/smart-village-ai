const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface ApiError {
  success: false
  message: string
  status: number
  fieldErrors?: Record<string, string>
}

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  }

  private parseBackendError(status: number, body: unknown): ApiError {
    let message = `Request failed (HTTP ${status})`
    const fieldErrors: Record<string, string> = {}

    if (body && typeof body === "object") {
      const data = body as Record<string, unknown>
      const detail = data.detail

      if (typeof detail === "string") {
        message = detail
      } else if (Array.isArray(detail)) {
        const parts: string[] = []
        for (const err of detail) {
          const e = err as Record<string, unknown> | null
          if (e && typeof e.msg === "string") {
            const loc = e.loc
            const field = Array.isArray(loc) ? loc[loc.length - 1] : null
            if (field && typeof field === "string") {
              fieldErrors[field] = e.msg
            }
            parts.push(e.msg)
          }
        }
        if (parts.length > 0) {
          message = parts.join("; ")
        }
      } else if (detail && typeof detail === "object") {
        const detailObj = detail as Record<string, unknown>
        const dMessage = typeof detailObj.message === "string" ? detailObj.message : null
        const dDetail = typeof detailObj.detail === "string" ? detailObj.detail : null
        message = dMessage || dDetail || JSON.stringify(detail)
      } else if (typeof data.message === "string") {
        message = data.message
      }
    }

    delete fieldErrors["undefined"]

    return { success: false, message, status, fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, params } = options

    const token = this.getToken()
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`
    }

    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.append(key, String(value))
        }
      })
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (body && method !== "GET") {
      if (body instanceof FormData) {
        delete requestHeaders["Content-Type"]
        config.body = body
      } else {
        config.body = JSON.stringify(body)
      }
    }

    let response: Response
    try {
      response = await fetch(url, config)
    } catch {
      const err: ApiError = { success: false, message: "Network error. Please check your connection.", status: 0 }
      throw err
    }

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user_role")
        window.location.href = "/auth/citizen-login"
      }
      throw { success: false, message: "Session expired. Please log in again.", status: 401 } as ApiError
    }

    if (!response.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = null
      }
      throw this.parseBackendError(response.status, errorBody)
    }

    return await response.json()
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "PUT", body })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      })
    } catch {
      throw { success: false, message: "Network error during upload.", status: 0 } as ApiError
    }

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user_role")
        window.location.href = "/auth/citizen-login"
      }
      throw { success: false, message: "Session expired.", status: 401 } as ApiError
    }

    if (!response.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = null
      }
      throw this.parseBackendError(response.status, errorBody)
    }

    return response.json()
  }
}

export const api = new ApiClient(API_BASE_URL)

export function resolveMediaUrl(path: string): string {
  if (!path) return path
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export default api
