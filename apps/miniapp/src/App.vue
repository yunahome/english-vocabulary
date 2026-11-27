<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch(() => {
  // 统一在小程序启动时登录（有本地 token 则校验 /auth/me，否则 wx.login）
  // 不 await 生命周期；并发的页面 ensureUser() 会共享同一次登录 Promise
  const userStore = useUserStore()
  void userStore.ensureUser().catch(() => {
    // 登录失败不阻塞启动，页面 ensureUser() 会重试并向用户展示错误
  })
})
</script>

<template>
  <slot />
</template>

<style>
page {
  background: #fffaf0;
  color: #1f2329;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 移动端隐藏滚动条，避免 H5 预览挤占页面宽度 */
page,
uni-page-body {
  overflow-x: hidden;
  scrollbar-width: none;
}

page::-webkit-scrollbar,
uni-page-body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
</style>
