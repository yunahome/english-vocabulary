<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLearningStore } from '@/stores/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics, isLocalImage, redirectToPhase } from '@/utils/nav'

const learning = useLearningStore()
const userStore = useUserStore()
const nav = getNavMetrics()

const item = computed(() => learning.newCurrent)
const barPercent = computed(() =>
  learning.newTotal > 0
    ? Math.round(((learning.newIndex + 1) / learning.newTotal) * 100)
    : 0,
)
const posChinese = computed(() => {
  const map: Record<string, string> = {
    noun: '名词', verb: '动词', adjective: '形容词', adverb: '副词',
    pronoun: '代词', preposition: '介词', conjunction: '连词',
    numeral: '数词', interjection: '感叹词',
  }
  const pos = item.value?.partOfSpeech?.toLowerCase() || ''
  return map[pos] || item.value?.partOfSpeech || ''
})

onMounted(async () => {
  const userId = await userStore.ensureUser()
  // 直接打开本页（或热重启恢复）时确保会话已恢复
  if (learning.phase === 'idle') {
    const phase = await learning.startReview(userId)
    if (redirectToPhase(phase, '/pages/word-learning/index')) return
  } else if (learning.phase !== 'new') {
    redirectToPhase(learning.phase, '/pages/word-learning/index')
    return
  }
  if (learning.phase === 'new' && learning.newQueue.length === 0) {
    await learning.enterNewWords()
  }
})

function playAudio() {
  const url = item.value?.pronunciationUrl
  if (!url) {
    uni.showToast({ title: '发音素材待接入', icon: 'none' })
    return
  }
  const audio = uni.createInnerAudioContext()
  audio.src = url
  audio.play()
}

function onLearned() {
  learning.learnCurrentWord()
  uni.redirectTo({ url: '/pages/writing/index' })
}

function close() {
  // PRD 7.2：退出时保留断点，再从首页进入时继续
  learning.exitAndSave()
  uni.switchTab({ url: '/pages/home/index' })
}
</script>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px', paddingRight: nav.rightPadding + 'px' }">
      <view class="nav-left">
        <view class="nav-side" @tap="close"><text class="nav-icon">‹</text></view>
        <text class="nav-title">New Word</text>
      </view>
      <view class="nav-right-group">
        <text class="nav-counter">Word {{ learning.newProgressLabel }}</text>
        <view class="nav-side" @tap="close"><text class="nav-close">✕</text></view>
      </view>
    </view>

    <view v-if="learning.loading" class="state">加载中…</view>
    <view v-else-if="learning.error" class="state error">{{ learning.error }}</view>

    <block v-else-if="item">
      <!-- Learning Progress -->
      <view class="progress-row">
        <text class="progress-label">Learning Progress</text>
        <text class="progress-value">{{ learning.newProgressLabel }}</text>
      </view>
      <view class="bar"><view class="bar-fill" :style="{ width: barPercent + '%' }" /></view>

      <!-- 单词主视觉 -->
      <view class="hero-wrap">
        <image v-if="isLocalImage(item.heroImage) && item.word.toLowerCase() === 'apple'" class="hero-img" src="/static/assets/apple-large.jpg" mode="widthFix" />
        <image v-else-if="isLocalImage(item.heroImage)" class="hero-img small" :src="item.heroImage" mode="aspectFit" />
        <text v-else class="hero-emoji">{{ item.heroImage }}</text>
        <text class="sparkle">✨</text>
      </view>

      <view class="word-row">
        <text class="word">{{ item.word }}</text>
        <view class="sound" @tap="playAudio"><text>🔊</text></view>
      </view>
      <text class="phonetic">{{ item.phonetic || '' }}</text>
      <view class="pill-wrap">
        <view class="pos-pill"><text>{{ item.partOfSpeech }} · {{ posChinese }}</text></view>
      </view>

      <!-- MEANING -->
      <view class="card">
        <text class="card-label">MEANING</text>
        <text class="meaning-cn">{{ item.definition }}</text>
        <text class="meaning-en">{{ item.englishDefinition }}</text>
      </view>

      <!-- Example -->
      <view class="card example-card">
        <view class="example-head">
          <view class="example-title"><text class="ex-icon">💬</text><text class="ex-label">Example</text></view>
          <view class="sound small" @tap="playAudio"><text>🔊</text></view>
        </view>
        <text class="example-en">{{ item.example }}</text>
        <text class="example-cn">{{ item.exampleTranslation }}</text>
      </view>

      <!-- Remember -->
      <view class="remember">
        <view class="remember-head"><text class="re-icon">💡</text><text class="re-label">Remember</text></view>
        <text class="re-main">{{ item.word }} = {{ item.definition }}</text>
        <text class="re-sub">Try to remember the spelling and pronunciation.</text>
      </view>

      <!-- 底部插画 + 主按钮 -->
      <image class="mascot" src="/static/assets/newword-mascot.jpg" mode="widthFix" />
      <button class="primary" @tap="onLearned">I've Learned This Word</button>
      <text class="footnote">Take your time. Learn it before moving on.</text>
    </block>

    <view v-else class="state">暂无新词</view>
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
.nav-left, .nav-right-group { display: flex; align-items: center; }
.nav-side { width: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon { font-size: 56rpx; color: #1f2d24; line-height: 1; font-weight: 300; }
.nav-close { font-size: 34rpx; color: #1f2d24; }
.nav-title { font-size: 36rpx; font-weight: 800; color: #1f2d24; }
.nav-counter { font-size: 24rpx; color: #94a096; margin-right: 8rpx; }
.state { padding: 160rpx 0; text-align: center; color: #94a096; font-size: 28rpx; }
.error { color: #e05a4f; }

.progress-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.progress-label { font-size: 26rpx; color: #5c6b60; }
.progress-value { font-size: 26rpx; font-weight: 700; color: #2f9c68; }
.bar { height: 18rpx; background: #e3ede4; border-radius: 18rpx; margin-top: 14rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #3d9b6c; border-radius: 18rpx; }

.hero-wrap { position: relative; display: flex; align-items: center; justify-content: center; margin-top: 20rpx; }
.hero-img { width: 460rpx; }
.hero-img.small { width: 300rpx; height: 300rpx; }
.hero-emoji { font-size: 200rpx; }
.sparkle { position: absolute; top: 20rpx; right: 60rpx; font-size: 48rpx; color: #f5c542; }

.word-row { display: flex; align-items: center; justify-content: center; gap: 20rpx; margin-top: 4rpx; }
.word { font-size: 76rpx; font-weight: 800; color: #1f2d24; }
.sound {
  width: 64rpx; height: 64rpx; border-radius: 50%; background: #dff2e5;
  display: flex; align-items: center; justify-content: center; font-size: 30rpx;
}
.sound.small { width: 56rpx; height: 56rpx; font-size: 26rpx; }
.phonetic { display: block; text-align: center; font-size: 30rpx; color: #6b7a70; margin-top: 6rpx; }
.pill-wrap { display: flex; justify-content: center; margin-top: 18rpx; }
.pos-pill {
  background: #3d9b6c; border-radius: 999rpx;
  padding: 10rpx 30rpx; text-align: center;
}
.pos-pill text { color: #fff; font-size: 24rpx; font-weight: 600; }

.card {
  background: #fff; border-radius: 28rpx; padding: 28rpx 30rpx; margin-top: 28rpx;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.card-label { display: block; font-size: 22rpx; letter-spacing: 2rpx; color: #9aa89e; font-weight: 700; }
.meaning-cn { display: block; font-size: 40rpx; font-weight: 800; color: #1f2d24; margin-top: 8rpx; }
.meaning-en { display: block; font-size: 26rpx; color: #6b7a70; margin-top: 8rpx; }
.example-head { display: flex; align-items: center; justify-content: space-between; }
.example-title { display: flex; align-items: center; gap: 10rpx; }
.ex-icon { font-size: 28rpx; }
.ex-label { font-size: 28rpx; font-weight: 700; color: #e8932c; }
.example-en { display: block; font-size: 30rpx; font-weight: 700; color: #1f2d24; margin-top: 16rpx; }
.example-cn { display: block; font-size: 24rpx; color: #8a9a90; margin-top: 6rpx; }

.remember {
  background: linear-gradient(135deg, #eaf7ec, #f3faee);
  border-radius: 28rpx; padding: 26rpx 30rpx; margin-top: 24rpx;
}
.remember-head { display: flex; align-items: center; gap: 10rpx; }
.re-icon { font-size: 28rpx; }
.re-label { font-size: 28rpx; font-weight: 700; color: #2f9c68; }
.re-main { display: block; font-size: 32rpx; font-weight: 700; color: #1f2d24; margin-top: 14rpx; }
.re-sub { display: block; font-size: 24rpx; color: #6b7a70; margin-top: 6rpx; }

.mascot { width: 100%; display: block; margin-top: 24rpx; }
.primary {
  width: 100%; background: #3d9b6c; border-radius: 999rpx; border: none;
  padding: 26rpx 0; margin-top: 8rpx; color: #fff; font-size: 32rpx; font-weight: 700;
  line-height: 1.3;
}
.footnote { display: block; text-align: center; font-size: 22rpx; color: #8a9a90; margin-top: 16rpx; }
</style>
