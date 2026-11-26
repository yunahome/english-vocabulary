<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { TEN_WORD_PROMPT_INTERVAL, useLearningStore } from '@/stores/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics } from '@/utils/nav'

const learning = useLearningStore()
const userStore = useUserStore()
const nav = getNavMetrics()
const submitting = ref(false)

const current = computed(() => learning.current)
const hasFeedback = computed(() => learning.feedback !== null)
const feedbackCorrect = computed(() => learning.feedback?.correct === true)
const barPercent = computed(() =>
  learning.newTotal > 0
    ? Math.round(((learning.newIndex + 1) / learning.newTotal) * 100)
    : 0,
)
/** PRD 5.2：完成 5~9 个新词时允许主动结束当天学习 */
const showEarlyFinish = computed(
  () =>
    learning.stats.newWords >= 5 &&
    learning.stats.newWords < TEN_WORD_PROMPT_INTERVAL,
)

onMounted(async () => {
  const userId = await userStore.ensureUser()
  // 直接打开本页时补一个可测的词，保证页面不空
  if (learning.phase !== 'writing' || !learning.current) {
    learning.userId = userId
    if (learning.newQueue.length === 0) await learning.enterNewWords()
    learning.learnCurrentWord()
  }
})

function onInput(e: Event) {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  learning.answer = detail?.value ?? ''
}

async function onSubmit() {
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

function onContinue() {
  const nextPhase = learning.nextNewWord()
  if (nextPhase === 'new') {
    uni.redirectTo({ url: '/pages/word-learning/index' })
  } else {
    uni.redirectTo({ url: '/pages/daily-result/index' })
  }
}

function close() {
  learning.reset()
  uni.switchTab({ url: '/pages/home/index' })
}

/** 弹窗：Continue Learning —— 继续下一批新词 */
async function onModalContinue() {
  const nextPhase = await learning.continueLearning()
  uni.redirectTo({
    url:
      nextPhase === 'new'
        ? '/pages/word-learning/index'
        : '/pages/daily-result/index',
  })
}

/** 弹窗：Finish for Today —— 进入每日总结 */
function onModalFinish() {
  learning.finishForToday()
  uni.redirectTo({ url: '/pages/daily-result/index' })
}

/** 5~9 词时主动结束 */
function onFinishSession() {
  onModalFinish()
}
</script>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px', paddingRight: nav.rightPadding + 'px' }">
      <view class="nav-side" @tap="close"><text class="nav-icon">‹</text></view>
      <text class="nav-title">Writing</text>
      <view class="nav-side nav-right" @tap="close"><text class="nav-close">✕</text></view>
    </view>

    <view v-if="learning.loading" class="state">加载中…</view>
    <view v-else-if="learning.error" class="state error">{{ learning.error }}</view>

    <block v-else-if="current">
      <text class="counter">{{ learning.newProgressLabel }}</text>
      <view class="bar"><view class="bar-fill" :style="{ width: barPercent + '%' }" /></view>

      <view class="hint-card">
        <text class="hint-icon">✏️</text>
        <text class="hint-text">Type the correct spelling for the word below.</text>
      </view>

      <text class="definition">{{ current.definition }}</text>

      <view v-if="hasFeedback" class="feedback" :class="feedbackCorrect ? 'ok' : 'bad'">
        <text class="feedback-title">{{ feedbackCorrect ? '✓ Correct!' : '✕ Not quite' }}</text>
        <block v-if="!feedbackCorrect">
          <text class="answer-line">{{ current.word }} {{ current.phonetic || '' }}</text>
          <text class="answer-def">{{ current.englishDefinition }}</text>
        </block>
        <text class="feedback-note">{{ learning.feedback?.result.reason }}</text>
      </view>

      <block v-if="!hasFeedback">
        <input
          class="answer-input"
          :value="learning.answer"
          placeholder="Type the English word..."
          placeholder-class="placeholder"
          confirm-type="done"
          @input="onInput"
          @confirm="onSubmit"
        />
        <button class="primary" :disabled="submitting" @tap="onSubmit">Submit</button>
      </block>
      <block v-else-if="feedbackCorrect">
        <button class="primary" @tap="onContinue">Continue</button>
        <text v-if="showEarlyFinish" class="finish-link" @tap="onFinishSession">Finish for Today</text>
      </block>
      <block v-else>
        <button class="primary" @tap="onTryAgain">Try Again</button>
      </block>

      <image class="mascot" src="/static/assets/writing-mascot.jpg" mode="widthFix" />
    </block>

    <view v-else class="state">暂无拼写任务</view>

    <!-- PRD 5.2：每完成 10 个新词询问是否继续 -->
    <view v-if="learning.showTenWordModal" class="modal-mask" @touchmove.stop.prevent>
      <view class="modal-card">
        <text class="modal-emoji">🎉</text>
        <text class="modal-title">Great Job!</text>
        <text class="modal-desc">You've learned {{ learning.stats.newWords }} new words today! Would you like to continue?</text>
        <button class="modal-primary" @tap="onModalContinue">Continue Learning</button>
        <button class="modal-secondary" @tap="onModalFinish">Finish for Today</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh; background: #fffaf2; box-sizing: border-box;
  padding: 0 40rpx 40rpx; overflow-x: hidden;
}
.page view, .page image, .page button, .page input { box-sizing: border-box; }
.nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 44px; margin: 0 -40rpx 28rpx; padding-left: 24rpx;
}
.nav-side { width: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon { font-size: 56rpx; color: #1f2d24; line-height: 1; font-weight: 300; }
.nav-close { font-size: 34rpx; color: #1f2d24; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #1f2d24; }
.state { padding: 160rpx 0; text-align: center; color: #94a096; font-size: 28rpx; }
.error { color: #e05a4f; }

.counter { display: block; font-size: 34rpx; font-weight: 800; color: #2f9c68; }
.bar { height: 18rpx; background: #e3ede4; border-radius: 18rpx; margin-top: 14rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #3d9b6c; border-radius: 18rpx; }

.hint-card {
  display: flex; align-items: center; gap: 16rpx;
  background: #e9f6ec; border-radius: 24rpx; padding: 26rpx 28rpx; margin-top: 40rpx;
}
.hint-icon { font-size: 40rpx; }
.hint-text { font-size: 28rpx; color: #4a5c50; line-height: 1.5; flex: 1; }

.definition {
  display: block; text-align: center; font-size: 96rpx; font-weight: 800;
  color: #1f2d24; margin: 70rpx 0 60rpx; letter-spacing: 6rpx;
}

.feedback { border-radius: 24rpx; padding: 26rpx 28rpx; margin-bottom: 24rpx; text-align: center; }
.feedback.ok { background: #e4f5e9; }
.feedback.bad { background: #fff1e2; }
.feedback-title { display: block; font-size: 32rpx; font-weight: 700; color: #1f2d24; }
.answer-line { display: block; font-size: 42rpx; font-weight: 700; color: #2f9c68; margin-top: 12rpx; }
.answer-def { display: block; font-size: 24rpx; color: #5c6b60; margin-top: 6rpx; }
.feedback-note { display: block; font-size: 22rpx; color: #7c8d80; margin-top: 10rpx; }

.answer-input {
  width: 100%; height: 100rpx; background: #fff; border: 2rpx solid #e3e9e2;
  border-radius: 22rpx; padding: 0 30rpx; font-size: 28rpx; color: #1f2d24;
}
.placeholder { color: #a9b4ac; font-size: 28rpx; }
.primary {
  width: 100%; background: #3d9b6c; border-radius: 999rpx; border: none;
  padding: 26rpx 0; margin-top: 24rpx; color: #fff; font-size: 32rpx; font-weight: 700;
  line-height: 1.3;
}
.primary[disabled] { opacity: 0.6; }
.mascot { width: 100%; display: block; margin-top: 40rpx; }

.finish-link {
  display: block; text-align: center; margin-top: 24rpx;
  font-size: 26rpx; color: #7c8d80; text-decoration: underline;
}

/* PRD 5.2：每 10 词弹窗 */
.modal-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 1000;
  background: rgba(31, 45, 36, 0.42);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  width: 600rpx; background: #fffaf2; border-radius: 40rpx;
  padding: 48rpx 40rpx 40rpx; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 20rpx 60rpx rgba(31, 45, 36, 0.18);
}
.modal-emoji { font-size: 88rpx; line-height: 1; }
.modal-title { font-size: 44rpx; font-weight: 800; color: #2f9c68; margin-top: 20rpx; }
.modal-desc { font-size: 28rpx; color: #4a5c50; line-height: 1.55; text-align: center; margin-top: 18rpx; }
.modal-primary {
  width: 100%; margin-top: 40rpx; background: #3d9b6c; color: #fff;
  border: none; border-radius: 999rpx; padding: 24rpx 0;
  font-size: 30rpx; font-weight: 700; line-height: 1.3;
}
.modal-secondary {
  width: 100%; margin-top: 16rpx; background: #eef2eb; color: #5c6b60;
  border: none; border-radius: 999rpx; padding: 22rpx 0;
  font-size: 28rpx; font-weight: 600; line-height: 1.3;
}
</style>
