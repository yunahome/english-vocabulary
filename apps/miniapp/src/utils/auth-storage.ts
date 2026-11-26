export const AUTH_TOKEN_KEY = 'ev_auth_token'

export function getAuthToken(): string {
  return (uni.getStorageSync(AUTH_TOKEN_KEY) as string | undefined) ?? ''
}

export function setAuthToken(token: string): void {
  uni.setStorageSync(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  uni.removeStorageSync(AUTH_TOKEN_KEY)
}
