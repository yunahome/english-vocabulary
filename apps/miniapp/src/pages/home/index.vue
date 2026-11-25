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
  // 下一步接入 Review 页面（PRD 第 3 步）
  uni.showToast({ title: 'Review 页面开发中', icon: 'none' })
}
</script>

<template>
  <view class="home">
    <view v-if="loading" class="state">加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>

    <block v-if="summary">
      <!-- 顶部问候 + 头像 -->
      <view class="topbar">
        <view class="greeting">
          <text class="sun">☀️</text>
          <view class="greeting-text">
            <text class="hello">{{ summary.greeting }}</text>
            <text class="subtitle">{{ summary.subtitle }}</text>
          </view>
        </view>
        <view class="avatar">👤</view>
      </view>

      <!-- 吉祥物 + 气泡 -->
      <view class="mascot-row">
        <view class="mascot">🐭</view>
        <view class="bubble">Let's learn<br />something new!</view>
      </view>

      <!-- 两个数据卡 -->
      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-icon">🔥</text>
          <text class="stat-label">Day Streak</text>
          <text class="stat-value">{{ summary.dayStreak }} days</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">📚</text>
          <text class="stat-label">Words Mastered</text>
          <text class="stat-value">{{ summary.masteredCount }}</text>
        </view>
      </view>

      <!-- 当前阶段 -->
      <view v-if="summary.currentStage" class="stage-card">
        <view class="stage-head">
          <text class="trophy">🏆</text>
          <text class="stage-title">Current Stage</text>
        </view>
        <view class="stage-body">
          <text class="book">📗</text>
          <view class="stage-info">
            <view class="stage-line">
              <text class="stage-name">{{ summary.currentStage.name }}</text>
              <text class="stage-count">
                {{ summary.currentStage.learnedWords }} / {{ summary.currentStage.totalWords }} words
              </text>
            </view>
            <text class="stage-sub">
              Stage {{ summary.currentStage.stageNumber }} of {{ summary.currentStage.totalStages }}
            </text>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: summary.currentStage.progressPercent + '%' }" />
            </view>
          </view>
        </view>
      </view>

      <!-- 今日任务 -->
      <view class="tasks-head">
        <text class="tasks-title">Today's Tasks</text>
        <text class="tasks-today">Today</text>
      </view>

      <view class="task-card">
        <view class="task-icon review">🔄</view>
        <view class="task-info">
          <view class="task-line">
            <text class="task-name">Review</text>
            <text class="task-big">{{ summary.reviewDueCount }}</text>
          </view>
          <text class="task-desc">Due words</text>
          <view class="bar-track small">
            <view class="bar-fill" style="width: 0%" />
          </view>
          <text class="task-progress">0 / {{ summary.reviewDueCount }} completed</text>
        </view>
      </view>

      <view class="task-card">
        <view class="task-icon new">➕</view>
        <view class="task-info">
          <view class="task-line">
            <text class="task-name">New Words</text>
            <text v-if="summary.newWordsLocked" class="lock">🔒 Locked</text>
          </view>
          <text class="task-desc">Daily minimum: {{ summary.newWordsMinimum }}</text>
          <view class="bar-track small">
            <view class="bar-fill" style="width: 0%" />
          </view>
          <text v-if="summary.newWordsLocked" class="task-progress">Finish review first</text>
        </view>
      </view>

      <!-- 主按钮 -->
      <button class="primary-btn" @tap="startReview">
        Start Review
        <text class="btn-sub">{{ summary.reviewDueCount }} words waiting for you</text>
      </button>
    </block>
  </view>
</template>

<style scoped>
.home {
  min-height: 100vh;
  padding: 32rpx 28rpx 160rpx;
  background: linear-gradient(180deg, #fff8e6 0%, #fffaf0 45%, #fffdf7 100%);
}
.state {
  padding: 80rpx;
  text-align: center;
  color: #8a8f99;
  font-size: 28rpx;
}
.error { color: #ef4444; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.greeting { display: flex; align-items: center; gap: 16rpx; }
.sun { font-size: 56rpx; }
.greeting-text { display: flex; flex-direction: column; }
.hello { font-size: 40rpx; font-weight: 700; color: #2f3a33; }
.subtitle { font-size: 24rpx; color: #8a8f99; margin-top: 4rpx; }
.avatar {
  width: 76rpx; height: 76rpx; border-radius: 50%;
  background: #d9f0e2; text-align: center; line-height: 76rpx; font-size: 40rpx;
}
.mascot-row {
  display: flex; align-items: center; gap: 20rpx;
  margin: 12rpx 0 28rpx;
}
.mascot { font-size: 140rpx; line-height: 1; }
.bubble {
  background: #fff; border-radius: 24rpx; padding: 24rpx 28rpx;
  font-size: 28rpx; font-weight: 600; color: #3f7a5a;
  box-shadow: 0 8rpx 24rpx rgba(76, 175, 125, 0.12);
}
.stat-row { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.stat-card {
  flex: 1; background: #fff; border-radius: 24rpx; padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 35, 41, 0.05);
  display: flex; flex-direction: column;
}
.stat-icon { font-size: 44rpx; }
.stat-label { font-size: 24rpx; color: #8a8f99; margin-top: 8rpx; }
.stat-value { font-size: 40rpx; font-weight: 700; color: #2f3a33; margin-top: 4rpx; }
.stage-card {
  background: #fff; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 35, 41, 0.05);
}
.stage-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.trophy { font-size: 36rpx; }
.stage-title { font-size: 30rpx; font-weight: 700; }
.stage-body { display: flex; gap: 20rpx; align-items: center; }
.book { font-size: 64rpx; }
.stage-info { flex: 1; }
.stage-line { display: flex; justify-content: space-between; align-items: baseline; }
.stage-name { font-size: 30rpx; font-weight: 600; }
.stage-count { font-size: 24rpx; color: #8a8f99; }
.stage-sub { font-size: 22rpx; color: #8a8f99; display: block; margin-top: 4rpx; }
.bar-track {
  height: 14rpx; background: #eef1f2; border-radius: 10rpx; margin-top: 12rpx; overflow: hidden;
}
.bar-track.small { height: 12rpx; }
.bar-fill { height: 100%; background: #4caf7d; border-radius: 10rpx; }
.tasks-head {
  display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16rpx;
}
.tasks-title { font-size: 30rpx; font-weight: 700; }
.tasks-today { font-size: 24rpx; color: #8a8f99; }
.task-card {
  background: #fff; border-radius: 24rpx; padding: 24rpx 28rpx; margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 35, 41, 0.05);
  display: flex; gap: 20rpx; align-items: flex-start;
}
.task-icon {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  text-align: center; line-height: 72rpx; font-size: 36rpx; flex-shrink: 0;
}
.task-icon.review { background: #e3f4ea; }
.task-icon.new { background: #fff3d9; }
.task-info { flex: 1; }
.task-line { display: flex; justify-content: space-between; align-items: baseline; }
.task-name { font-size: 30rpx; font-weight: 600; }
.task-big { font-size: 40rpx; font-weight: 700; }
.task-desc { font-size: 24rpx; color: #8a8f99; display: block; margin: 4rpx 0 12rpx; }
.task-progress { font-size: 22rpx; color: #8a8f99; display: block; margin-top: 8rpx; }
.lock { font-size: 24rpx; color: #d19a2e; }
.primary-btn {
  width: 100%; background: #4caf7d; color: #fff; border-radius: 40rpx;
  font-size: 32rpx; font-weight: 700; padding: 24rpx 0; margin-top: 12rpx;
  display: flex; flex-direction: column; align-items: center;
}
.btn-sub { font-size: 22rpx; font-weight: 400; margin-top: 6rpx; opacity: 0.9; }
</style>
