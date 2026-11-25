import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createUser, initUserStages } from '@/api/home'

const USER_KEY = 'ev_user_id'

/** 开发阶段的用户身份：本地持久化一个 dev openid 对应的用户。
 *  接入微信登录后，这里改为从 wx.login + 后端换 token 获取 userId。 */
export const useUserStore = defineStore('user', () => {
  const userId = ref('')
  const ready = ref(false)

  async function ensureUser() {
    if (ready.value && userId.value) return userId.value
    const cached = uni.getStorageSync(USER_KEY) as string | undefined
    if (cached) {
      userId.value = cached
      // 已缓存用户也补一次阶段初始化（幂等，防止旧数据缺进度）
      await initUserStages(cached)
      ready.value = true
      return cached
    }
    // 每个设备安装一个固定 dev openid，重复进入不会重复创建用户
    const openid = `dev-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    const user = await createUser(openid, '学习者')
    await initUserStages(user.id)
    userId.value = user.id
    uni.setStorageSync(USER_KEY, user.id)
    ready.value = true
    return user.id
  }

  return { userId, ready, ensureUser }
})
