import type { HomeSummaryDto } from '@englis-vocabulary/shared'
import { request } from './request'

export function getHomeSummary(): Promise<HomeSummaryDto> {
  return request<HomeSummaryDto>({ url: '/home/summary' })
}
