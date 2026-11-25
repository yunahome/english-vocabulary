<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { HomeSummaryDto } from '@englis-vocabulary/shared'
import { getHomeSummary } from '@/api/home'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const summary = ref<HomeSummaryDto | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const userId = await userStore.ensureUser()
    summary.value = await getHomeSummary(userId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startReview() {
  uni.showToast({ title: 'Review 页面开发中', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view v-if="loading" class="state">加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>

    <block v-if="summary">
      <!-- 顶部问候 -->
      <view class="header">
        <view class="header-left">
          <text class="sun">☀️</text>
          <view class="header-text">
            <text class="greeting">{{ summary.greeting }}</text>
            <text class="subtitle">{{ summary.subtitle }}</text>
          </view>
        </view>
        <view class="avatar">
          <view class="avatar-head" />
          <view class="avatar-body" />
        </view>
      </view>

      <!-- 吉祥物 banner（老鼠 + 气泡 + 星星 + 草地，直接取 UI 图素材） -->
      <image class="mascot-banner" src="/static/assets/home-banner.jpg" mode="widthFix" />

      <!-- Day Streak / Words Mastered -->
      <view class="stats">
        <view class="stat-card">
          <text class="stat-icon">🔥</text>
          <view class="stat-meta">
            <text class="stat-label">Day Streak</text>
            <text class="stat-value">{{ summary.dayStreak }} days</text>
          </view>
        </view>
        <view class="stat-card">
          <text class="stat-icon book-icon">📗</text>
          <view class="stat-meta">
            <text class="stat-label">Words Mastered</text>
            <text class="stat-value">{{ summary.masteredCount }}</text>
          </view>
        </view>
      </view>

      <!-- Current Stage -->
      <view v-if="summary.currentStage" class="stage-card">
        <view class="section-title">
          <text class="trophy">🏆</text>
          <text>Current Stage</text>
        </view>
        <view class="stage-main">
          <view class="stage-book">📗<text class="stage-star">★</text></view>
          <view class="stage-content">
            <view class="stage-row">
              <text class="stage-name">{{ summary.currentStage.name }}</text>
              <text class="stage-count">{{ summary.currentStage.learnedWords }} / {{ summary.currentStage.totalWords }} words</text>
            </view>
            <text class="stage-desc">Stage {{ summary.currentStage.stageNumber }} of {{ summary.currentStage.totalStages }}</text>
            <view class="progress">
              <view class="progress-fill" :style="{ width: summary.currentStage.progressPercent + '%' }" />
            </view>
          </view>
        </view>
      </view>

      <!-- Today's Tasks -->
      <view class="tasks-title-row">
        <view class="section-title">
          <text class="calendar">📅</text>
          <text>Today's Tasks</text>
        </view>
        <text class="today-label">Today</text>
      </view>

      <!-- Review 卡 -->
      <view class="task-card">
        <view class="task-icon review-icon">🔄</view>
        <view class="task-body">
          <view class="task-top">
            <view class="task-name-wrap">
              <text class="task-name">Review</text>
              <text class="task-desc">Due words</text>
            </view>
            <text class="task-number">{{ summary.reviewDueCount }}</text>
          </view>
          <view class="progress slim">
            <view class="progress-fill" style="width: 0%" />
          </view>
          <text class="task-foot">0 / {{ summary.reviewDueCount }} completed</text>
        </view>
      </view>

      <!-- New Words 卡 -->
      <view class="task-card">
        <view class="task-icon new-icon">＋</view>
        <view class="task-body">
          <view class="task-top">
            <view class="task-name-wrap">
              <text class="task-name">New Words</text>
              <text class="task-desc">Daily minimum: {{ summary.newWordsMinimum }}</text>
            </view>
            <text v-if="summary.newWordsLocked" class="lock-badge">🔒 Locked</text>
          </view>
          <view class="progress slim">
            <view class="progress-fill" style="width: 0%" />
          </view>
          <text v-if="summary.newWordsLocked" class="task-foot">Finish review first</text>
        </view>
      </view>

      <!-- 开始复习按钮 -->
      <button class="primary-button" @tap="startReview">
        <text class="btn-main">Start Review</text>
        <text class="btn-sub">{{ summary.reviewDueCount }} words waiting for you</text>
      </button>

      <!-- 底部草地装饰（对齐 UI 图） -->
      <view class="grass">
        <view class="hill hill-left" />
        <view class="hill hill-right" />
      </view>
    </block>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 0 24rpx 260rpx;
  background: #fffaf2;
  box-sizing: border-box;
  overflow-x: hidden;
}
.page view, .page image, .page button { box-sizing: border-box; }
.page .stat-card, .page .stage-card, .page .task-card, .page .stage-content, .page .task-body, .page .task-name-wrap { min-width: 0; }
.state { padding: 120rpx; text-align: center; color: #94a096; font-size: 28rpx; }
.error { color: #e05a4f; }

/* 顶部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 8rpx 8rpx;
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.sun { font-size: 52rpx; margin-right: 12rpx; line-height: 1; }
.header-text { display: flex; flex-direction: column; min-width: 0; }
.greeting { font-size: 34rpx; font-weight: 700; color: #1f2d24; line-height: 1.15; }
.subtitle { font-size: 20rpx; color: #94a096; margin-top: 4rpx; }
.avatar {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: #d8f0e2; display: flex; align-items: center;
  justify-content: center; position: relative; overflow: hidden;
}
.avatar-head {
  position: absolute; top: 16rpx; width: 24rpx; height: 24rpx;
  border-radius: 50%; background: #5bb98b;
}
.avatar-body {
  position: absolute; bottom: -14rpx; width: 48rpx; height: 42rpx;
  border-radius: 50% 50% 0 0; background: #5bb98b;
}

/* banner */
.mascot-banner {
  width: 100%; max-width: 100%; display: block;
  margin-top: 4rpx; height: 270rpx;
}

/* 统计卡 */
.stats { display: flex; gap: 18rpx; margin-top: 8rpx; }
.stat-card {
  flex: 1; display: flex; align-items: center; gap: 10rpx;
  background: #fff; border-radius: 24rpx; padding: 18rpx 16rpx;
  box-shadow: 0 6rpx 18rpx rgba(60, 80, 60, 0.06);
  overflow: hidden;
}
.stat-icon { font-size: 40rpx; line-height: 1; flex-shrink: 0; }
.stat-meta { display: flex; flex-direction: column; min-width: 0; }
.stat-label { font-size: 20rpx; color: #94a096; overflow: hidden; text-overflow: ellipsis; }
.stat-value { font-size: 30rpx; font-weight: 700; color: #1f2d24; margin-top: 2rpx; }

/* 通用标题 */
.section-title {
  display: flex; align-items: center; gap: 8rpx;
  font-size: 26rpx; font-weight: 700; color: #1f2d24;
}
.trophy, .calendar { font-size: 26rpx; }

/* 阶段卡 */
.stage-card {
  background: #fff; border-radius: 28rpx; padding: 24rpx 26rpx;
  margin-top: 22rpx; box-shadow: 0 6rpx 18rpx rgba(60, 80, 60, 0.06);
}
.stage-main { display: flex; align-items: center; gap: 18rpx; margin-top: 18rpx; }
.stage-book {
  width: 76rpx; height: 88rpx; border-radius: 12rpx;
  background: linear-gradient(135deg, #6cc38f, #3d9b6c);
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; position: relative; flex-shrink: 0;
}
.stage-star { position: absolute; font-size: 20rpx; color: #ffe08a; top: 10rpx; right: 8rpx; }
.stage-content { flex: 1; }
.stage-row { display: flex; justify-content: space-between; align-items: baseline; }
.stage-name { font-size: 26rpx; font-weight: 600; color: #1f2d24; }
.stage-count { font-size: 17rpx; color: #6b7a70; overflow: hidden; text-overflow: ellipsis; }
.stage-desc { display: block; font-size: 20rpx; color: #94a096; margin-top: 4rpx; }

.progress {
  height: 12rpx; background: #eaf0ea; border-radius: 12rpx;
  margin-top: 12rpx; overflow: hidden;
}
.progress.slim { height: 10rpx; margin-top: 12rpx; }
.progress-fill { height: 100%; background: #3d9b6c; border-radius: 12rpx; }

/* 任务区 */
.tasks-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin: 30rpx 4rpx 16rpx;
}
.today-label { font-size: 22rpx; color: #94a096; }
.task-card {
  background: #fff; border-radius: 28rpx; padding: 24rpx 26rpx;
  margin-bottom: 18rpx; display: flex; gap: 20rpx;
  box-shadow: 0 6rpx 18rpx rgba(60, 80, 60, 0.06);
}
.task-icon {
  width: 76rpx; height: 76rpx; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx; font-weight: 700;
}
.review-icon { background: #e6f4ea; color: #3d9b6c; }
.new-icon { background: #fff0cf; color: #f0a500; font-size: 48rpx; }
.task-body { flex: 1; }
.task-top { display: flex; justify-content: space-between; align-items: flex-start; }
.task-name-wrap { display: flex; flex-direction: column; }
.task-name { font-size: 26rpx; font-weight: 700; color: #1f2d24; }
.task-desc { font-size: 20rpx; color: #94a096; margin-top: 4rpx; }
.task-number { font-size: 34rpx; font-weight: 700; color: #1f2d24; }
.task-foot { display: block; font-size: 20rpx; color: #94a096; text-align: right; margin-top: 6rpx; }
.lock-badge {
  font-size: 22rpx; color: #e09a2e; background: #fff3d8;
  padding: 6rpx 16rpx; border-radius: 24rpx;
}

/* 主按钮 */
.primary-button {
  width: 100%; background: #3d9b6c; border-radius: 48rpx;
  padding: 24rpx 0; margin-top: 14rpx; border: none;
  display: flex; flex-direction: column; align-items: center;
}
.btn-main { color: #fff; font-size: 32rpx; font-weight: 700; }
.btn-sub { color: rgba(255, 255, 255, 0.9); font-size: 22rpx; margin-top: 6rpx; }

/* 底部草地 */
.grass { position: relative; height: 120rpx; margin-top: -8rpx; overflow: hidden; }
.hill { position: absolute; bottom: -60rpx; width: 320rpx; height: 160rpx; border-radius: 50%; }
.hill-left { left: -80rpx; background: #d9edcf; }
.hill-right { right: -90rpx; background: #cfe7c4; }
</style>
