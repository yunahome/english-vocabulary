import type { AuthSessionDto, UserDto } from '@englis-vocabulary/shared'
import { request } from './request'

export function loginWithWechat(
  code: string,
  timezone: string,
): Promise<AuthSessionDto> {
  return request<AuthSessionDto, { code: string; timezone: string }>({
    url: '/auth/wechat/login',
    method: 'POST',
    data: { code, timezone },
  })
}

export function getCurrentUser(): Promise<UserDto> {
  return request<UserDto>({ url: '/auth/me' })
}
