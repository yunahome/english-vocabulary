<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { HomeSummaryDto } from '@englis-vocabulary/shared'
import { getHomeSummary } from '@/api/home'
import { useUserStore } from '@/stores/user'
import { useLearningStore } from '@/stores/learning'
import { getNavMetrics } from '@/utils/nav'

const userStore = useUserStore()
const learningStore = useLearningStore()
const nav = getNavMetrics()
const summary = ref<HomeSummaryDto | null>(null)
const loading = ref(true)
const error = ref('')

/** 复习进度：今日已完成 / 今日到期任务总数 */
const reviewProgress = computed(() => {
  const s = summary.value
  if (!s || s.todayReviewTasks === 0) return 0
  return Math.min(100, Math.round((s.todayReviews / s.todayReviewTasks) * 100))
})
/** 新词进度：今日已完成 / 每日最低要求 */
const newWordsProgress = computed(() => {
  const s = summary.value
  if (!s) return 0
  return Math.min(100, Math.round((s.todayNewWords / s.newWordsMinimum) * 100))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const userId = await userStore.ensureUser()
    summary.value = await getHomeSummary()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

// tabBar 页面切回来时重新拉数据，保证学完后统计立刻更新
onShow(load)

async function startStudy() {
  const userId = await userStore.ensureUser()
  // PRD 7.2：不清空会话，由 review 页恢复当天断点；无到期复习时它会自动进入新词学习
  learningStore.userId = userId
  uni.navigateTo({ url: '/pages/review/index' })
}
</script>

<template>
  <view class="page" :style="{ paddingTop: nav.statusBarHeight + 33 + 'px' }">
    <view v-if="loading" class="state">加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>

    <block v-if="summary">
      <view class="header">
        <view class="header-left">
          <image class="sun" src="/static/assets/home-icons/sun.png" mode="aspectFit" />
          <view class="header-text">
            <text class="greeting">{{ summary.greeting }}</text>
            <text class="subtitle">{{ summary.subtitle }}</text>
          </view>
        </view>
        <image class="avatar" src="/static/assets/home-icons/avatar.png" mode="aspectFit" />
      </view>

      <image class="mascot-banner" src="/static/assets/home-banner.jpg" mode="aspectFill" />

      <view class="stats">
        <view class="stat-card">
          <image class="stat-icon" src="/static/assets/home-icons/fire.png" mode="aspectFit" />
          <view class="stat-meta">
            <text class="stat-label">Day Streak</text>
            <text class="stat-value">{{ summary.dayStreak }} days</text>
          </view>
        </view>
        <view class="stat-card">
          <image class="stat-icon" src="/static/assets/home-icons/book.png" mode="aspectFit" />
          <view class="stat-meta">
            <text class="stat-label">Words Mastered</text>
            <text class="stat-value">{{ summary.masteredCount }}</text>
          </view>
        </view>
      </view>

      <view v-if="summary.currentStage" class="stage-card">
        <view class="section-title">
          <image class="section-icon trophy" src="/static/assets/home-icons/trophy.png" mode="aspectFit" />
          <text>Current Stage</text>
        </view>
        <view class="stage-main">
          <image class="stage-book" src="/static/assets/home-icons/stage-book.png" mode="aspectFit" />
          <view class="stage-content">
            <view class="stage-row">
              <text class="stage-name">{{ summary.currentStage.name }}</text>
              <text class="stage-count">{{ summary.currentStage.learnedWords }} / {{ summary.currentStage.totalWords }} learned</text>
            </view>
            <text class="stage-desc">Stage {{ summary.currentStage.stageNumber }} of {{ summary.currentStage.totalStages }}</text>
            <view class="progress">
              <view class="progress-fill" :style="{ width: summary.currentStage.progressPercent + '%' }" />
            </view>
          </view>
        </view>
      </view>

      <view class="tasks-title-row">
        <view class="section-title">
          <image class="section-icon calendar" src="/static/assets/home-icons/calendar.png" mode="aspectFit" />
          <text>Today's Tasks</text>
        </view>
        <text class="today-label">Today</text>
      </view>

      <view class="task-card">
        <image class="task-icon" src="/static/assets/home-icons/review-cycle.png" mode="aspectFit" />
        <view class="task-body">
          <view class="task-top">
            <view class="task-name-wrap">
              <text class="task-name">Review</text>
              <text class="task-desc">Due words</text>
            </view>
            <text class="task-number">{{ summary.reviewDueCount }}</text>
          </view>
          <view class="progress slim">
            <view
              class="progress-fill"
              :style="{ width: reviewProgress + '%' }"
            />
          </view>
          <text class="task-foot">
            {{ summary.todayReviews }} / {{ summary.todayReviewTasks }} completed
          </text>
        </view>
      </view>

      <view class="task-card new-task-card">
        <image class="task-icon" src="/static/assets/home-icons/add-word.png" mode="aspectFit" />
        <view class="task-body">
          <view class="task-top">
            <view class="task-name-wrap">
              <text class="task-name">New Words</text>
              <text class="task-desc">Daily minimum: {{ summary.newWordsMinimum }}</text>
            </view>
            <image
              v-if="summary.newWordsLocked"
              class="lock-badge"
              src="/static/assets/home-icons/locked-badge.png"
              mode="aspectFit"
            />
          </view>
          <view class="progress slim">
            <view
              class="progress-fill new-fill"
              :style="{ width: newWordsProgress + '%' }"
            />
          </view>
          <text class="task-foot">
            {{ summary.newWordsLocked
              ? 'Finish review first'
              : `${summary.todayNewWords} learned today` }}
          </text>
        </view>
      </view>

      <button class="primary-button" @tap="startStudy">
        <text class="btn-main">{{ summary.reviewDueCount > 0 ? 'Start Review' : 'Start New Words' }}</text>
        <text class="btn-sub">
          {{ summary.reviewDueCount > 0
            ? `${summary.reviewDueCount} words waiting for you`
            : `${summary.todayNewWords} learned today · ${summary.newWordsMinimum} daily minimum` }}
        </text>
      </button>
    </block>

    <view class="bottom-landscape">
      <view class="land-left" />
      <view class="land-right" />
      <view class="land-front" />
      <text class="sprout sprout-one">⌁</text>
      <text class="sprout sprout-two">⌁</text>
    </view>

  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  padding-right: 32rpx;
  padding-left: 32rpx;
  padding-bottom: 48rpx;
  background: #fffaf2;
  box-sizing: border-box;
  overflow-x: hidden;
}
.page view,
.page image,
.page button {
  box-sizing: border-box;
}
.page .stat-card,
.page .stage-card,
.page .task-card,
.page .stage-content,
.page .task-body,
.page .task-name-wrap {
  min-width: 0;
}
.state {
  padding: 120rpx 0;
  text-align: center;
  color: #94a096;
  font-size: 28rpx;
}
.error { color: #e05a4f; }

.header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding-left: 4rpx;
}
.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.sun {
  width: 84rpx;
  height: 84rpx;
  flex: 0 0 84rpx;
  margin-right: 18rpx;
}
.header-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.greeting {
  color: #1d241f;
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.5rpx;
}
.subtitle {
  margin-top: 4rpx;
  color: #7f8d85;
  font-size: 25rpx;
  line-height: 1.25;
  white-space: nowrap;
}
.avatar {
  width: 112rpx;
  height: 112rpx;
  flex: 0 0 112rpx;
}

.mascot-banner {
  position: relative;
  z-index: 1;
  display: block;
  width: calc(100% + 64rpx);
  height: 306rpx;
  margin-left: -32rpx;
}

.stats {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 22rpx;
  margin-top: 18rpx;
}
.stat-card {
  display: flex;
  align-items: center;
  flex: 1;
  min-height: 140rpx;
  padding: 18rpx 18rpx;
  gap: 10rpx;
  border-radius: 34rpx;
  background: #fff;
  box-shadow: 0 8rpx 22rpx rgba(48, 64, 53, 0.055);
  overflow: hidden;
}
.stat-icon {
  width: 66rpx;
  height: 66rpx;
  flex: 0 0 66rpx;
}
.stat-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-label {
  overflow: hidden;
  color: #66746b;
  font-size: 22rpx;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stat-value {
  margin-top: 4rpx;
  color: #1d241f;
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.5rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #1d241f;
  font-size: 31rpx;
  font-weight: 800;
  line-height: 1.2;
}
.section-icon {
  flex: 0 0 auto;
}
.trophy {
  width: 52rpx;
  height: 52rpx;
}
.calendar {
  width: 52rpx;
  height: 52rpx;
}

.stage-card {
  position: relative;
  z-index: 1;
  margin-top: 20rpx;
  padding: 16rpx 24rpx 14rpx;
  border-radius: 34rpx;
  background: #fff;
  box-shadow: 0 8rpx 22rpx rgba(48, 64, 53, 0.055);
}
.stage-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.stage-book {
  width: 96rpx;
  height: 86rpx;
  flex: 0 0 96rpx;
}
.stage-content { flex: 1; }
.stage-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
}
.stage-name {
  overflow: hidden;
  color: #1d241f;
  font-size: 31rpx;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stage-count {
  flex: 0 0 auto;
  color: #344038;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.2;
}
.stage-desc {
  display: block;
  margin-top: 2rpx;
  color: #77867c;
  font-size: 21rpx;
  line-height: 1.2;
}

.progress {
  height: 14rpx;
  margin-top: 10rpx;
  overflow: hidden;
  border-radius: 14rpx;
  background: #e9efea;
}
.progress.slim {
  height: 12rpx;
  margin-top: 8rpx;
}
.progress-fill {
  height: 100%;
  border-radius: 14rpx;
  background: #3cbc7e;
}
.progress-fill.new-fill {
  background: #f0a500;
}

.tasks-title-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 26rpx 2rpx 14rpx;
}
.today-label {
  color: #77867c;
  font-size: 23rpx;
}
.task-card {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 160rpx;
  padding: 20rpx;
  gap: 14rpx;
  border-radius: 34rpx;
  background: #fff;
  box-shadow: 0 8rpx 22rpx rgba(48, 64, 53, 0.055);
}
.new-task-card {
  min-height: 180rpx;
  margin-top: 16rpx;
}
.task-icon {
  width: 120rpx;
  height: 120rpx;
  flex: 0 0 120rpx;
  margin-top: 0;
}
.task-body {
  flex: 1;
  min-width: 0;
}
.task-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10rpx;
}
.task-name-wrap {
  display: flex;
  flex-direction: column;
}
.task-name {
  color: #1d241f;
  font-size: 31rpx;
  font-weight: 800;
  line-height: 1.2;
}
.task-desc {
  margin-top: 3rpx;
  color: #77867c;
  font-size: 23rpx;
  line-height: 1.2;
}
.task-number {
  color: #1d241f;
  font-size: 50rpx;
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -1rpx;
}
.task-foot {
  display: block;
  margin-top: 4rpx;
  color: #77867c;
  font-size: 21rpx;
  line-height: 1.2;
  text-align: right;
}
.lock-badge {
  width: 132rpx;
  height: 44rpx;
  flex: 0 0 132rpx;
}

.primary-button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 84%;
  height: 124rpx;
  margin: 14rpx auto 0;
  padding: 0;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #51c68c 0%, #3baa72 100%);
  box-shadow: 0 12rpx 24rpx rgba(48, 159, 101, 0.1);
  line-height: normal;
}
.primary-button::after {
  border: none;
}
.btn-main {
  color: #fff;
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.1;
}
.btn-sub {
  margin-top: 4rpx;
  color: rgba(255, 255, 255, 0.94);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.1;
}

.bottom-landscape {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  height: 216rpx;
  overflow: hidden;
  pointer-events: none;
}
.land-left,
.land-right,
.land-front {
  position: absolute;
}
.land-left {
  bottom: -20rpx;
  left: -54rpx;
  width: 270rpx;
  height: 180rpx;
  border-radius: 58% 65% 50% 48%;
  transform: rotate(5deg);
  background: #d9edc9;
}
.land-right {
  right: -66rpx;
  bottom: -24rpx;
  width: 284rpx;
  height: 186rpx;
  border-radius: 62% 52% 48% 60%;
  transform: rotate(-4deg);
  background: #d5ebc3;
}
.land-front {
  bottom: -78rpx;
  left: -100rpx;
  width: 950rpx;
  height: 180rpx;
  border-radius: 50% 50% 0 0;
  background: #eff7e8;
}
.sprout {
  position: absolute;
  color: #81bc69;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1;
}
.sprout-one {
  top: 84rpx;
  left: 126rpx;
  transform: rotate(-18deg);
}
.sprout-two {
  top: 76rpx;
  right: 96rpx;
  transform: rotate(17deg);
}

</style>
