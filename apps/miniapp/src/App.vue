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
  background: #f6f7fb;
  color: #1f2329;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
</style>
