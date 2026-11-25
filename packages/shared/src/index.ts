/**
 * 前后端共享类型。
 * 这里只放类型定义，不包含运行时代码，因此前端（Vite）和后端（NestJS）
 * 都可以直接通过 `import type` 引用，不需要额外的构建步骤。
 */

export interface WordDto {
  id: string
  word: string
  phonetic: string | null
  meaning: string
  example: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateWordInput {
  word: string
  meaning: string
  phonetic?: string
  example?: string
}

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export interface HealthDto {
  status: 'ok'
  timestamp: string
}
