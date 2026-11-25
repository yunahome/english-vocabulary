<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLearningStore } from '@/stores/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics, isLocalImage } from '@/utils/nav'

const learning = useLearningStore()
const userStore = useUserStore()
const nav = getNavMetrics()
const submitting = ref(false)

const current = computed(() => learning.current)
const remaining = computed(() => Math.max(0, learning.total - learning.index))
const barPercent = computed(() =>
  learning.total > 0 ? Math.round(((learning.index + 1) / learning.total) * 100) : 0,
)

onMounted(async () => {
  const userId = await userStore.ensureUser()
  await learning.startReview(userId)
})

function onInput(e: Event) {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  learning.answer = detail?.value ?? ''
}

async function onCheck() {
  if (submitting.value || !learning.answer.trim()) return
  submitting.value = true
  try {
    await learning.checkAnswer(learning.answer)
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function onTryAgain() {
  learning.prepareRetry()
}

async function onContinue() {
  const nextPhase = await learning.next()
  if (nextPhase === 'new') {
    uni.redirectTo({ url: '/pages/word-learning/index' })
  } else if (nextPhase === 'result') {
    uni.redirectTo({ url: '/pages/daily-result/index' })
  }
}

function close() {
  learning.reset()
  uni.switchTab({ url: '/pages/home/index' })
}
</script>

<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px', paddingRight: nav.rightPadding + 'px' }">
      <view class="nav-side" @tap="close"><text class="nav-icon">‹</text></view>
      <text class="nav-title">Review</text>
      <view class="nav-side nav-right" @tap="close"><text class="nav-close">✕</text></view>
    </view>

    <view v-if="learning.loading" class="state">加载中…</view>
    <view v-else-if="learning.error" class="state error">{{ learning.error }}</view>

    <block v-else-if="current">
      <!-- Review Progress -->
      <view class="progress-card">
        <view class="progress-head">
          <text class="progress-title">Review Progress</text>
          <text class="progress-count">{{ learning.progressLabel }}</text>
        </view>
        <view class="bar"><view class="bar-fill" :style="{ width: barPercent + '%' }" /></view>
        <text class="remaining">{{ remaining }} words remaining</text>
      </view>

      <!-- 题目 -->
      <view class="question">
        <text class="question-title">What is this word?</text>
        <text class="question-sub">Write the English word from memory.</text>
      </view>

      <view class="hero">
        <image v-if="isLocalImage(current.heroImage)" class="hero-img" :src="current.heroImage" mode="aspectFit" />
        <text v-else class="hero-emoji">{{ current.heroImage }}</text>
      </view>
      <text class="definition">{{ current.definition }}</text>
      <view class="pill-wrap">
        <view class="hint-pill"><text>{{ current.englishDefinition || 'A common word.' }}</text></view>
      </view>

      <!-- 反馈区 -->
      <view v-if="learning.feedback" class="feedback" :class="learning.feedback.correct ? 'ok' : 'bad'">
        <text class="feedback-title">
          {{ learning.feedback.correct ? '✓ Correct!' : '✕ Not quite' }}
        </text>
        <block v-if="!learning.feedback.correct">
          <text class="answer-line">{{ current.word }} {{ current.phonetic || '' }}</text>
          <text class="answer-def">{{ current.definition }} · {{ current.partOfSpeech }}</text>
          <text class="feedback-note">Learn the answer, then try again on your own.</text>
        </block>
        <text v-else class="feedback-note">
          {{ learning.feedback.result.reason }} · next review in 7 days
        </text>
      </view>

      <!-- 输入 / 操作 -->
      <block v-if="!learning.feedback">
        <input
          class="answer-input"
          :value="learning.answer"
          placeholder="Type the English word..."
          placeholder-class="placeholder"
          confirm-type="done"
          @input="onInput"
          @confirm="onCheck"
        />
        <button class="primary" :disabled="submitting" @tap="onCheck">Check Answer</button>
      </block>
      <block v-else-if="learning.feedback.correct">
        <button class="primary" @tap="onContinue">Continue</button>
      </block>
      <block v-else>
        <button class="primary" @tap="onTryAgain">Try Again</button>
      </block>

      <view v-if="!learning.feedback" class="tip">
        <text class="tip-icon">💡</text>
        <text>Try to remember without looking at the answer.</text>
      </view>

      <image class="mascot" src="/static/assets/review-mascot.jpg" mode="widthFix" />
    </block>

    <view v-else class="state">暂无复习任务</view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #fffaf2;
  box-sizing: border-box;
  padding: 0 40rpx 40rpx;
  overflow-x: hidden;
}
.page view, .page image, .page button, .page input { box-sizing: border-box; }
.nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 44px; margin: 0 -40rpx 20rpx; padding-left: 24rpx;
}
.nav-side { width: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon { font-size: 56rpx; color: #1f2d24; line-height: 1; font-weight: 300; }
.nav-close { font-size: 34rpx; color: #1f2d24; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #1f2d24; }
.state { padding: 160rpx 0; text-align: center; color: #94a096; font-size: 28rpx; }
.error { color: #e05a4f; }

/* 进度卡 */
.progress-card {
  background: #e7f4ea; border-radius: 26rpx; padding: 26rpx 30rpx 22rpx;
}
.progress-head { display: flex; align-items: center; justify-content: space-between; }
.progress-title { font-size: 28rpx; font-weight: 700; color: #1f2d24; }
.progress-count { font-size: 28rpx; font-weight: 700; color: #2f9c68; }
.bar { height: 16rpx; background: #d0e8d7; border-radius: 16rpx; margin-top: 18rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #3d9b6c; border-radius: 16rpx; }
.remaining { display: block; text-align: center; font-size: 22rpx; color: #7c8d80; margin-top: 12rpx; }

/* 题目 */
.question { margin-top: 64rpx; text-align: center; }
.question-title { display: block; font-size: 44rpx; font-weight: 800; color: #1f2d24; }
.question-sub { display: block; font-size: 26rpx; color: #8a9a90; margin-top: 10rpx; }
.hero {
  width: 280rpx; height: 280rpx; margin: 40rpx auto 0;
  background: #eaf6ec; border-radius: 36rpx;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.hero-img { width: 230rpx; height: 230rpx; }
.hero-emoji { font-size: 140rpx; }
.definition { display: block; text-align: center; font-size: 56rpx; font-weight: 800; color: #1f2d24; margin-top: 28rpx; }
.pill-wrap { display: flex; justify-content: center; margin-top: 16rpx; }
.hint-pill {
  padding: 10rpx 28rpx; background: #eef6e9;
  border-radius: 999rpx; text-align: center;
}
.hint-pill text { font-size: 24rpx; color: #6b7a70; }

/* 反馈 */
.feedback {
  margin-top: 28rpx; border-radius: 24rpx; padding: 26rpx 28rpx; text-align: center;
}
.feedback.ok { background: #e4f5e9; }
.feedback.bad { background: #fff1e2; }
.feedback-title { display: block; font-size: 32rpx; font-weight: 700; color: #1f2d24; }
.answer-line { display: block; font-size: 40rpx; font-weight: 700; color: #2f9c68; margin-top: 12rpx; }
.answer-def { display: block; font-size: 26rpx; color: #5c6b60; margin-top: 6rpx; }
.feedback-note { display: block; font-size: 22rpx; color: #7c8d80; margin-top: 12rpx; }

/* 输入与按钮 */
.answer-input {
  width: 100%; height: 100rpx; background: #fff; border: 2rpx solid #e3e9e2;
  border-radius: 22rpx; padding: 0 30rpx; font-size: 28rpx; color: #1f2d24;
  margin-top: 36rpx;
}
.placeholder { color: #a9b4ac; font-size: 28rpx; }
.primary {
  width: 100%; background: #3d9b6c; border-radius: 999rpx; border: none;
  padding: 26rpx 0; margin-top: 24rpx; color: #fff; font-size: 32rpx; font-weight: 700;
  line-height: 1.3;
}
.primary[disabled] { opacity: 0.6; }
.tip { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 26rpx; }
.tip text { font-size: 22rpx; color: #8a9a90; }
.tip-icon { font-size: 26rpx; }
.mascot { width: 100%; display: block; margin-top: 30rpx; }
</style>
