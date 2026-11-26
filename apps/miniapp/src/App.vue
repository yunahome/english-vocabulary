<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('[englis-vocabulary] miniapp launched')
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
