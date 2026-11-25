import type { HomeSummaryDto, UserDto } from '@englis-vocabulary/shared'
import { request } from './request'

export function getHomeSummary(userId: string): Promise<HomeSummaryDto> {
  return request<HomeSummaryDto>({ url: `/home/summary?userId=${encodeURIComponent(userId)}` })
}

export function createUser(openid: string, nickname?: string): Promise<UserDto> {
  return request<UserDto, { openid: string; nickname?: string }>({
    url: '/users',
    method: 'POST',
    data: { openid, nickname },
  })
}

export function initUserStages(userId: string): Promise<unknown> {
  return request<unknown>({
    url: `/progress/stages/init?userId=${encodeURIComponent(userId)}`,
    method: 'POST',
  })
}
