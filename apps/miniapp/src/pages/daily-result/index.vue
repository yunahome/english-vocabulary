<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { HomeSummaryDto } from '@englis-vocabulary/shared'
import { getHomeSummary } from '@/api/home'
import { useLearningStore } from '@/stores/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics } from '@/utils/nav'

const learning = useLearningStore()
const userStore = useUserStore()
const nav = getNavMetrics()
const summary = ref<HomeSummaryDto | null>(null)

const stats = computed(() => learning.stats)
const tomorrowReview = computed(() => stats.value.reviewed + stats.value.newWords)

onMounted(async () => {
  const userId = await userStore.ensureUser()
  try {
    summary.value = await getHomeSummary()
  } catch {
    summary.value = null
  }
})

function backHome() {
  learning.reset()
  uni.switchTab({ url: '/pages/home/index' })
}
</script>

<template>
  <view class="page" :style="{ paddingTop: nav.statusBarHeight + 'px' }">
    <image class="header" src="/static/assets/result-header.jpg" mode="widthFix" />

    <!-- 三张统计卡 -->
    <view class="stat-row">
      <view class="stat-card">
        <text class="stat-icon">📗</text>
        <text class="stat-label">New Words</text>
        <text class="stat-value">{{ stats.newWords }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-icon">🔄</text>
        <text class="stat-label">Reviewed</text>
        <text class="stat-value">{{ stats.reviewed }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-icon">⭐</text>
        <text class="stat-label">New Mastered</text>
        <text class="stat-value">{{ stats.newlyMastered }}</text>
      </view>
    </view>

    <view class="two-cols">
      <!-- Your Progress -->
      <view class="panel">
        <text class="panel-title">Your Progress</text>
        <view class="stage-row">
          <text class="medal">🏅</text>
          <text class="stage-name">{{ summary?.currentStage?.name || 'Elementary' }}</text>
        </view>
        <text class="stage-count">
          {{ summary?.currentStage?.learnedWords ?? 0 }} / {{ summary?.currentStage?.totalWords ?? 0 }} words
        </text>
        <view class="bar">
          <view class="bar-fill" :style="{ width: (summary?.currentStage?.progressPercent ?? 0) + '%' }" />
        </view>
      </view>

      <!-- Tomorrow's Preview -->
      <view class="panel">
        <text class="panel-title">Tomorrow's Preview</text>
        <view class="preview-row">
          <text class="preview-icon">📗</text>
          <view class="preview-text">
            <text class="preview-label">Review</text>
            <text class="preview-value">{{ tomorrowReview }} words</text>
          </view>
        </view>
        <view class="preview-row">
          <text class="preview-icon star">⭐</text>
          <view class="preview-text">
            <text class="preview-label">New Words</text>
            <text class="preview-value">{{ summary?.newWordsMinimum ?? 5 }}+ words</text>
          </view>
        </view>
        <text class="preview-note">Estimated, not a fixed promise.</text>
      </view>
    </view>

    <button class="primary" @tap="backHome">Back to Home</button>
    <text class="footnote">Great job today — see you tomorrow!</text>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh; background: #fffaf2; box-sizing: border-box;
  padding-left: 40rpx; padding-right: 40rpx; padding-bottom: 60rpx;
}
.page view, .page image, .page button { box-sizing: border-box; }
.header { width: 100%; display: block; margin-top: 10rpx; }

.stat-row { display: flex; gap: 16rpx; margin-top: 24rpx; }
.stat-card {
  flex: 1; min-width: 0; background: #fff; border-radius: 24rpx;
  padding: 26rpx 10rpx; display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.stat-icon { font-size: 40rpx; line-height: 1; }
.stat-label { font-size: 22rpx; color: #6b7a70; margin-top: 10rpx; text-align: center; }
.stat-value { font-size: 44rpx; font-weight: 800; color: #1f2d24; margin-top: 4rpx; }

.two-cols { display: flex; gap: 16rpx; margin-top: 24rpx; }
.panel {
  flex: 1; min-width: 0; background: #fff; border-radius: 24rpx; padding: 24rpx 22rpx;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.panel-title { font-size: 24rpx; font-weight: 700; color: #1f2d24; }
.stage-row { display: flex; align-items: center; gap: 8rpx; margin-top: 20rpx; }
.medal { font-size: 30rpx; }
.stage-name { font-size: 24rpx; font-weight: 700; color: #1f2d24; }
.stage-count { display: block; font-size: 20rpx; color: #8a9a90; margin-top: 6rpx; }
.bar { height: 12rpx; background: #e7efe7; border-radius: 12rpx; margin-top: 14rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #3d9b6c; border-radius: 12rpx; }

.preview-row { display: flex; align-items: center; gap: 12rpx; margin-top: 18rpx; }
.preview-icon { font-size: 30rpx; }
.preview-icon.star { color: #f5b53c; }
.preview-text { display: flex; flex-direction: column; min-width: 0; }
.preview-label { font-size: 22rpx; font-weight: 700; color: #1f2d24; }
.preview-value { font-size: 20rpx; color: #6b7a70; }
.preview-note { display: block; font-size: 18rpx; color: #a3b0a6; margin-top: 14rpx; }

.primary {
  width: 100%; background: #3d9b6c; border-radius: 999rpx; border: none;
  padding: 26rpx 0; margin-top: 40rpx; color: #fff; font-size: 32rpx; font-weight: 700;
  line-height: 1.3;
}
.footnote { display: block; text-align: center; font-size: 22rpx; color: #8a9a90; margin-top: 18rpx; }
</style>
