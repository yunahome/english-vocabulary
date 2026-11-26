<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { HomeSummaryDto } from '@englis-vocabulary/shared'
import { getHomeSummary } from '@/api/home'
import { getUserWords } from '@/api/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics } from '@/utils/nav'

const userStore = useUserStore()
const nav = getNavMetrics()
const summary = ref<HomeSummaryDto | null>(null)
const learnedCount = ref(0)
const userIdShort = ref('')
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const userId = await userStore.ensureUser()
    userIdShort.value = userId.slice(0, 8)
    const [home, words] = await Promise.all([getHomeSummary(), getUserWords()])
    summary.value = home
    learnedCount.value = words.length
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载资料失败'
  } finally {
    loading.value = false
  }
})

function notReady() {
  uni.showToast({ title: '该设置将在后续版本开放', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px', paddingRight: nav.rightPadding + 'px' }">
      <view class="nav-side" />
      <text class="nav-title">Profile</text>
      <view class="nav-side" />
    </view>

    <view v-if="loading" class="state">加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>

    <block v-else>
      <!-- 用户卡 -->
      <view class="user-card">
        <view class="avatar">
          <view class="avatar-head" />
          <view class="avatar-body" />
        </view>
        <view class="user-info">
          <text class="nickname">学习者</text>
          <text class="uid">ID: {{ userIdShort || '—' }}</text>
          <text class="stage-tag">📗 {{ summary?.currentStage?.name || 'Elementary' }}</text>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stat-grid">
        <view class="stat-cell">
          <text class="stat-num">{{ summary?.masteredCount ?? 0 }}</text>
          <text class="stat-cap">已掌握</text>
        </view>
        <view class="stat-cell">
          <text class="stat-num">{{ learnedCount }}</text>
          <text class="stat-cap">学习中的词</text>
        </view>
        <view class="stat-cell">
          <text class="stat-num">{{ summary?.dayStreak ?? 0 }}</text>
          <text class="stat-cap">连续天数</text>
        </view>
        <view class="stat-cell">
          <text class="stat-num">{{ summary?.currentStage?.totalStages ?? 5 }}</text>
          <text class="stat-cap">学习阶段</text>
        </view>
      </view>

      <!-- 今日概览 -->
      <view class="panel">
        <text class="panel-title">Today</text>
        <view class="panel-row"><text>待复习单词</text><text class="panel-value">{{ summary?.reviewDueCount ?? 0 }}</text></view>
        <view class="panel-row"><text>每日新词最低要求</text><text class="panel-value">{{ summary?.newWordsMinimum ?? 5 }} words</text></view>
        <view class="panel-row"><text>新词学习入口</text><text class="panel-value">{{ summary?.newWordsLocked ? '复习后解锁' : '已开放' }}</text></view>
      </view>

      <!-- 设置 -->
      <view class="panel settings">
        <view class="setting-row" @tap="notReady"><text>🔔</text><text class="setting-label">学习提醒</text><text class="arrow">›</text></view>
        <view class="setting-row" @tap="notReady"><text>🌏</text><text class="setting-label">时区设置</text><text class="arrow">›</text></view>
        <view class="setting-row" @tap="notReady"><text>ℹ️</text><text class="setting-label">关于产品</text><text class="arrow">›</text></view>
      </view>

      <text class="version">English Vocabulary · v0.0.1</text>
    </block>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh; background: #fffaf2; box-sizing: border-box;
  padding: 0 40rpx 220rpx; overflow-x: hidden;
}
.page view, .page image, .page button { box-sizing: border-box; }
.nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 44px; margin: 0 -40rpx 24rpx; padding-left: 16rpx;
}
.nav-side { width: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon { font-size: 56rpx; color: #1f2d24; line-height: 1; font-weight: 300; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #1f2d24; }
.state { padding: 160rpx 0; text-align: center; color: #94a096; font-size: 28rpx; }
.error { color: #e05a4f; }

.user-card {
  display: flex; align-items: center; gap: 26rpx;
  background: linear-gradient(135deg, #e9f6ec, #f6fbf1);
  border-radius: 32rpx; padding: 34rpx 30rpx;
}
.avatar {
  width: 116rpx; height: 116rpx; border-radius: 50%; background: #d8f0e2;
  position: relative; overflow: hidden; flex-shrink: 0;
}
.avatar-head { position: absolute; top: 26rpx; left: 50%; transform: translateX(-50%); width: 38rpx; height: 38rpx; border-radius: 50%; background: #5bb98b; }
.avatar-body { position: absolute; bottom: -22rpx; left: 50%; transform: translateX(-50%); width: 76rpx; height: 66rpx; border-radius: 50% 50% 0 0; background: #5bb98b; }
.user-info { display: flex; flex-direction: column; min-width: 0; }
.nickname { font-size: 36rpx; font-weight: 800; color: #1f2d24; }
.uid { font-size: 22rpx; color: #94a096; margin-top: 6rpx; }
.stage-tag { font-size: 24rpx; color: #2f9c68; margin-top: 12rpx; }

.stat-grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.stat-cell {
  width: calc(50% - 8rpx); background: #fff; border-radius: 24rpx; padding: 28rpx;
  display: flex; flex-direction: column; box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.stat-num { font-size: 44rpx; font-weight: 800; color: #1f2d24; }
.stat-cap { font-size: 22rpx; color: #8a9a90; margin-top: 6rpx; }

.panel {
  background: #fff; border-radius: 26rpx; padding: 26rpx 28rpx; margin-top: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.panel-title { display: block; font-size: 26rpx; font-weight: 800; color: #1f2d24; margin-bottom: 16rpx; }
.panel-row { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 0; font-size: 24rpx; color: #6b7a70; }
.panel-value { font-weight: 700; color: #1f2d24; }
.settings { padding-top: 10rpx; padding-bottom: 10rpx; }
.setting-row { display: flex; align-items: center; gap: 16rpx; padding: 22rpx 0; border-bottom: 2rpx solid #f1f3ee; }
.setting-row:last-child { border-bottom: none; }
.setting-label { flex: 1; font-size: 26rpx; color: #1f2d24; }
.arrow { font-size: 36rpx; color: #b6c0b8; }
.version { display: block; text-align: center; font-size: 22rpx; color: #a9b4ac; margin-top: 40rpx; }
</style>
