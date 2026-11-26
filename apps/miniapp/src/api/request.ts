import type { ApiResponse } from '@englis-vocabulary/shared'
import { clearAuthToken, getAuthToken } from '@/utils/auth-storage'

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestOptions<TData> {
  url: string
  method?: RequestMethod
  data?: TData
}

const DEFAULT_BASE_URL = 'http://localhost:3000/api'

function getBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
}

/**
 * uni-app 统一请求封装。
 * 后端所有接口返回 { code, data, message }，这里统一拆包并抛出可读错误。
 */
export function request<TResponse, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const token = getAuthToken()
    uni.request({
      url: `${getBaseUrl()}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data as Record<string, unknown> | undefined,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const body = res.data as ApiResponse<TResponse> | undefined
        const ok = res.statusCode >= 200 && res.statusCode < 300

        if (ok && body && body.code === 0) {
          resolve(body.data)
          return
        }

        if (res.statusCode === 401) clearAuthToken()
        reject(new Error(body?.message || `请求失败：HTTP ${res.statusCode}`))
      },
      fail: (error) => {
        reject(new Error(error.errMsg || '网络请求失败'))
      },
    })
  })
}
