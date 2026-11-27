import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserDto } from '@englis-vocabulary/shared'
import { getCurrentUser, loginWithWechat } from '@/api/auth'
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '@/utils/auth-storage'
import { clearLocalSession } from '@/utils/learning-session'
import { clearCatalogCache } from '@/utils/catalog-cache'

function requestWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result) => {
        const code = (result as { code?: string }).code
        if (code) resolve(code)
        else reject(new Error('微信登录未返回 code'))
      },
      fail: (error) => reject(new Error(error.errMsg || '微信登录失败')),
    })
  })
}

function getTimezone(): string {
  try {
    const system = uni.getSystemInfoSync() as { timezone?: string }
    if (system.timezone) return system.timezone
  } catch {
    // fall through
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  } catch {
    return 'Asia/Shanghai'
  }
}

export const useUserStore = defineStore('user', () => {
  const userId = ref('')
  const user = ref<UserDto | null>(null)
  const ready = ref(false)
  const loginError = ref('')
  /** 并发调用共享同一次登录，避免 onLaunch 与页面 onShow/onMounted 重复触发 wx.login */
  let pendingLogin: Promise<string> | null = null

  async function doLogin(): Promise<string> {
    const cachedToken = getAuthToken()
    if (cachedToken) {
      try {
        user.value = await getCurrentUser()
        userId.value = user.value.id
        ready.value = true
        loginError.value = ''
        return userId.value
      } catch {
        clearAuthToken()
      }
    }

    const code = await requestWechatCode()
    const session = await loginWithWechat(code, getTimezone())
    setAuthToken(session.token)
    user.value = session.user
    userId.value = session.user.id
    ready.value = true
    loginError.value = ''
    return userId.value
  }

  async function ensureUser(): Promise<string> {
    // request.ts 在 401 时会清本地 token，但不会通知本 store。
    // 若 token 已不在而 ready/userId 仍是旧值，会导致后续请求持续 401 且无法自愈。
    if (!getAuthToken() && (ready.value || userId.value)) {
      ready.value = false
      userId.value = ''
      user.value = null
    }
    if (ready.value && userId.value) return userId.value
    if (pendingLogin) return pendingLogin

    pendingLogin = doLogin()
      .catch((err: unknown) => {
        loginError.value = err instanceof Error ? err.message : '登录失败'
        throw err
      })
      .finally(() => {
        pendingLogin = null
      })
    return pendingLogin
  }

  function logout() {
    clearAuthToken()
    // 清理本地学习快照与词库缓存，避免切换账号串入上一用户的进度
    clearLocalSession()
    clearCatalogCache()
    userId.value = ''
    user.value = null
    ready.value = false
    loginError.value = ''
    pendingLogin = null
  }

  return { userId, user, ready, loginError, ensureUser, logout }
})
