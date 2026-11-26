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
const hasFeedback = computed(() => learning.feedback !== null)
const feedbackCorrect = computed(() => learning.feedback?.correct === true)
const completed = computed(() => Math.min(learning.index, learning.total))
const remaining = computed(() => Math.max(0, learning.total - completed.value))
const progressLabel = computed(() => `${completed.value} / ${learning.total}`)
const barPercent = computed(() =>
  learning.total > 0 ? Math.round((completed.value / learning.total) * 100) : 0,
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
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-side nav-left" @tap="close">
          <text class="nav-icon">‹</text>
        </view>
        <text class="nav-title">Review</text>
        <view class="nav-side nav-right" :style="{ right: nav.rightPadding + 'px' }" @tap="close">
          <text class="nav-close">✕</text>
        </view>
      </view>
    </view>

    <view v-if="learning.loading" class="state">加载中…</view>
    <view v-else-if="learning.error" class="state error">{{ learning.error }}</view>

    <block v-else-if="current">
      <view class="progress-card">
        <view class="progress-head">
          <text class="progress-title">Review Progress</text>
          <text class="progress-count">{{ progressLabel }}</text>
        </view>
        <view class="bar"><view class="bar-fill" :style="{ width: barPercent + '%' }" /></view>
        <text class="remaining">{{ remaining }} words remaining</text>
      </view>

      <view class="question-divider" />

      <view class="question">
        <text class="question-title">What is this word?</text>
        <text class="question-sub">Write the English word from memory.</text>
      </view>

      <view class="hero">
        <image
          v-if="isLocalImage(current.heroImage)"
          class="hero-img"
          :src="current.word.toLowerCase() === 'apple' ? '/static/assets/review-icons/apple-hero.png' : current.heroImage"
          mode="aspectFill"
        />
        <text v-else class="hero-emoji">{{ current.heroImage }}</text>
      </view>
      <text class="definition">{{ current.definition }}</text>
      <view class="pill-wrap">
        <view class="hint-pill"><text>{{ current.englishDefinition || 'A common word.' }}</text></view>
      </view>

      <view v-if="hasFeedback" class="feedback" :class="feedbackCorrect ? 'ok' : 'bad'">
        <text class="feedback-title">
          {{ feedbackCorrect ? '✓ Correct!' : '✕ Not quite' }}
        </text>
        <block v-if="!feedbackCorrect">
          <text class="answer-line">{{ current.word }} {{ current.phonetic || '' }}</text>
          <text class="answer-def">{{ current.definition }} · {{ current.partOfSpeech }}</text>
          <text class="feedback-note">Learn the answer, then try again on your own.</text>
        </block>
        <text v-else class="feedback-note">
          {{ learning.feedback?.result.reason }} · next review in 7 days
        </text>
      </view>

      <block v-if="!hasFeedback">
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
      <block v-else-if="feedbackCorrect">
        <button class="primary" @tap="onContinue">Continue</button>
      </block>
      <block v-else>
        <button class="primary" @tap="onTryAgain">Try Again</button>
      </block>

      <view v-if="!hasFeedback" class="tip">
        <image class="tip-icon" src="/static/assets/review-icons/lightbulb.png" mode="aspectFit" />
        <text>Try to remember without looking at the answer.</text>
      </view>

      <image class="mascot" src="/static/assets/review-mascot.jpg" mode="aspectFill" />
    </block>

    <view v-else class="state">暂无复习任务</view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  background: #fffaf2;
  box-sizing: border-box;
  padding: 0 32rpx 32rpx;
  overflow-x: hidden;
}
.page view,
.page image,
.page button,
.page input {
  box-sizing: border-box;
}
.nav {
  margin-right: -32rpx;
  margin-left: -32rpx;
}
.nav-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
}
.nav-side {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
}
.nav-left {
  left: 22rpx;
}
.nav-right {
  right: 28rpx;
}
.nav-icon {
  margin-top: -5rpx;
  color: #1d241f;
  font-size: 68rpx;
  font-weight: 300;
  line-height: 1;
}
.nav-close {
  color: #1d241f;
  font-size: 40rpx;
  font-weight: 500;
  line-height: 1;
}
.nav-title {
  color: #1d241f;
  font-size: 38rpx;
  font-weight: 800;
  line-height: 1;
}
.state {
  padding: 160rpx 0;
  color: #94a096;
  font-size: 28rpx;
  text-align: center;
}
.error { color: #e05a4f; }

.progress-card {
  margin-top: 4rpx;
  padding: 22rpx 20rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f0f8f0 0%, #e2f3e7 100%);
}
.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.progress-title {
  color: #1d241f;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.2;
}
.progress-count {
  color: #31b875;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.2;
}
.bar {
  height: 20rpx;
  margin-top: 16rpx;
  overflow: hidden;
  border-radius: 20rpx;
  background: #d0e8d8;
}
.bar-fill {
  height: 100%;
  border-radius: 20rpx;
  background: #3cbc7f;
}
.remaining {
  display: block;
  margin-top: 8rpx;
  color: #75847a;
  font-size: 23rpx;
  line-height: 1.2;
  text-align: center;
}
.question-divider {
  width: 118rpx;
  height: 2rpx;
  margin: 22rpx auto 0;
  background: #f4eee5;
}

.question {
  margin-top: 36rpx;
  text-align: center;
}
.question-title {
  display: block;
  color: #242a26;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.2;
}
.question-sub {
  display: block;
  margin-top: 10rpx;
  color: #7f8b84;
  font-size: 27rpx;
  line-height: 1.25;
}
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 384rpx;
  height: 336rpx;
  margin: 32rpx auto 0;
  overflow: hidden;
  border-radius: 38rpx;
  background: #ebf7ed;
}
.hero-img {
  display: block;
  width: 100%;
  height: 100%;
}
.hero-emoji {
  font-size: 140rpx;
}
.definition {
  display: block;
  margin-top: 18rpx;
  color: #222823;
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
}
.pill-wrap {
  display: flex;
  justify-content: center;
  margin-top: 10rpx;
}
.hint-pill {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: #eef6e9;
  text-align: center;
}
.hint-pill text {
  color: #526159;
  font-size: 24rpx;
  line-height: 1.2;
}

.feedback {
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  text-align: center;
}
.feedback.ok { background: #e4f5e9; }
.feedback.bad { background: #fff1e2; }
.feedback-title {
  display: block;
  color: #1d241f;
  font-size: 30rpx;
  font-weight: 800;
}
.answer-line {
  display: block;
  margin-top: 8rpx;
  color: #2f9c68;
  font-size: 38rpx;
  font-weight: 800;
}
.answer-def {
  display: block;
  margin-top: 4rpx;
  color: #5c6b60;
  font-size: 25rpx;
}
.feedback-note {
  display: block;
  margin-top: 8rpx;
  color: #7c8d80;
  font-size: 22rpx;
  line-height: 1.35;
}

.answer-input {
  width: 100%;
  height: 100rpx;
  margin-top: 26rpx;
  padding: 0 28rpx;
  border: 2rpx solid #e3e8e2;
  border-radius: 22rpx;
  background: #fff;
  color: #1d241f;
  font-size: 30rpx;
}
.placeholder {
  color: #a7b1aa;
  font-size: 30rpx;
}
.primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 104rpx;
  margin-top: 24rpx;
  padding: 0;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #51ca8e 0%, #35ab72 100%);
  box-shadow: 0 10rpx 22rpx rgba(47, 164, 105, 0.1);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  line-height: normal;
}
.primary::after {
  border: none;
}
.primary[disabled] { opacity: 0.6; }
.tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 26rpx;
}
.tip text {
  color: #7f8b84;
  font-size: 23rpx;
}
.tip-icon {
  width: 42rpx;
  height: 42rpx;
  flex: 0 0 42rpx;
}
.mascot {
  display: block;
  width: calc(100% + 64rpx);
  height: 318rpx;
  margin-top: 18rpx;
  margin-left: -32rpx;
}
</style>
