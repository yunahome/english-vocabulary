<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { HomeSummaryDto, StageDto, UserStageDto } from '@englis-vocabulary/shared'
import { getHomeSummary } from '@/api/home'
import { getStages } from '@/api/catalog'
import { getUserStages } from '@/api/progress'
import { getUserWords } from '@/api/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics } from '@/utils/nav'

const userStore = useUserStore()
const nav = getNavMetrics()
const stages = ref<StageDto[]>([])
const userStages = ref<UserStageDto[]>([])
const summary = ref<HomeSummaryDto | null>(null)
const learnedCount = ref(0)
const loading = ref(true)
const error = ref('')

const currentStageId = computed(() => summary.value?.currentStage?.id ?? '')
const stageRows = computed(() =>
  stages.value.map((stage, i) => {
    const record = userStages.value.find((u) => u.stageId === stage.id)
    const status = record?.status ?? 'locked'
    const isCurrent = stage.id === currentStageId.value
    const percent = isCurrent ? (summary.value?.currentStage?.progressPercent ?? 0) : 0
    return {
      id: stage.id,
      name: stage.name,
      code: stage.code,
      number: i + 1,
      status,
      isCurrent,
      percent,
      statusLabel: status === 'completed' ? 'Completed' : isCurrent ? 'In progress' : 'Locked',
      icon: status === 'completed' ? '✓' : isCurrent ? '📗' : '🔒',
    }
  }),
)

function goHome() {
  uni.switchTab({ url: '/pages/home/index' })
}

onMounted(async () => {
  try {
    const userId = await userStore.ensureUser()
    const [stageList, uStages, home, words] = await Promise.all([
      getStages(),
      getUserStages(userId),
      getHomeSummary(userId),
      getUserWords(userId),
    ])
    stages.value = stageList
    userStages.value = uStages
    summary.value = home
    learnedCount.value = words.length
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载进度失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px', paddingRight: nav.rightPadding + 'px' }">
      <view class="nav-side" @tap="goHome"><text class="nav-icon">‹</text></view>
      <text class="nav-title">Progress</text>
      <view class="nav-side" />
    </view>

    <view v-if="loading" class="state">加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>

    <block v-else>
      <!-- 当前阶段概览 -->
      <view class="hero-card">
        <view class="hero-top">
          <text class="hero-icon">🏆</text>
          <text class="hero-label">Current Stage</text>
        </view>
        <text class="hero-name">{{ summary?.currentStage?.name || 'Elementary' }}</text>
        <text class="hero-sub">Stage {{ summary?.currentStage?.stageNumber ?? 1 }} of {{ summary?.currentStage?.totalStages ?? 5 }}</text>
        <view class="hero-bar">
          <view class="hero-bar-fill" :style="{ width: (summary?.currentStage?.progressPercent ?? 0) + '%' }" />
        </view>
        <text class="hero-count">
          {{ summary?.currentStage?.learnedWords ?? 0 }} / {{ summary?.currentStage?.totalWords ?? 0 }} words mastered
        </text>
      </view>

      <!-- 学习统计 -->
      <view class="stat-row">
        <view class="stat-box"><text class="stat-num">{{ summary?.masteredCount ?? 0 }}</text><text class="stat-cap">Mastered</text></view>
        <view class="stat-box"><text class="stat-num">{{ learnedCount }}</text><text class="stat-cap">Learning</text></view>
        <view class="stat-box"><text class="stat-num">{{ summary?.dayStreak ?? 0 }}</text><text class="stat-cap">Day Streak</text></view>
      </view>

      <!-- 阶段列表 -->
      <text class="section-title">Learning Path</text>
      <view v-for="row in stageRows" :key="row.id" class="stage-row" :class="{ dim: !row.isCurrent && row.status !== 'completed' }">
        <view class="stage-icon" :class="row.isCurrent ? 'active' : ''">{{ row.icon }}</view>
        <view class="stage-body">
          <view class="stage-line">
            <text class="stage-name">{{ row.name }}</text>
            <text class="stage-status" :class="row.status">{{ row.statusLabel }}</text>
          </view>
          <text class="stage-code">Stage {{ row.number }} · {{ row.code }}</text>
          <view class="stage-bar"><view class="stage-bar-fill" :style="{ width: row.percent + '%' }" /></view>
        </view>
      </view>
    </block>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh; background: #fffaf2; box-sizing: border-box;
  padding: 0 40rpx 60rpx; overflow-x: hidden;
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

.hero-card {
  background: linear-gradient(135deg, #3d9b6c, #57b685);
  border-radius: 32rpx; padding: 32rpx 30rpx; color: #fff;
}
.hero-top { display: flex; align-items: center; gap: 10rpx; }
.hero-icon { font-size: 30rpx; }
.hero-label { font-size: 24rpx; opacity: 0.9; }
.hero-name { display: block; font-size: 46rpx; font-weight: 800; margin-top: 16rpx; }
.hero-sub { display: block; font-size: 24rpx; opacity: 0.9; margin-top: 6rpx; }
.hero-bar { height: 16rpx; background: rgba(255, 255, 255, 0.3); border-radius: 16rpx; margin-top: 24rpx; overflow: hidden; }
.hero-bar-fill { height: 100%; background: #fff; border-radius: 16rpx; }
.hero-count { display: block; font-size: 22rpx; opacity: 0.9; margin-top: 12rpx; }

.stat-row { display: flex; gap: 16rpx; margin-top: 24rpx; }
.stat-box {
  flex: 1; min-width: 0; background: #fff; border-radius: 24rpx; padding: 26rpx 10rpx;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.stat-num { font-size: 42rpx; font-weight: 800; color: #1f2d24; }
.stat-cap { font-size: 22rpx; color: #8a9a90; margin-top: 6rpx; }

.section-title { display: block; font-size: 30rpx; font-weight: 800; color: #1f2d24; margin: 40rpx 0 20rpx; }
.stage-row {
  display: flex; align-items: center; gap: 20rpx; background: #fff;
  border-radius: 26rpx; padding: 24rpx 22rpx; margin-bottom: 18rpx;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.stage-row.dim { opacity: 0.72; }
.stage-icon {
  width: 76rpx; height: 76rpx; border-radius: 22rpx; background: #f0f2ec;
  display: flex; align-items: center; justify-content: center; font-size: 34rpx; flex-shrink: 0;
}
.stage-icon.active { background: #e0f3e6; }
.stage-body { flex: 1; min-width: 0; }
.stage-line { display: flex; align-items: center; justify-content: space-between; gap: 10rpx; }
.stage-name { font-size: 28rpx; font-weight: 700; color: #1f2d24; }
.stage-status { font-size: 20rpx; color: #8a9a90; }
.stage-status.unlocked, .stage-status.completed { color: #2f9c68; }
.stage-code { display: block; font-size: 21rpx; color: #94a096; margin-top: 4rpx; }
.stage-bar { height: 10rpx; background: #eaf0ea; border-radius: 10rpx; margin-top: 14rpx; overflow: hidden; }
.stage-bar-fill { height: 100%; background: #3d9b6c; border-radius: 10rpx; }
</style>
