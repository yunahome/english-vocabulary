<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useWordStore } from '@/stores'

const store = useWordStore()
const word = ref('')
const meaning = ref('')

onMounted(() => {
  store.fetchWords()
})

async function handleAdd() {
  if (!word.value.trim() || !meaning.value.trim()) return
  await store.addWord({
    word: word.value.trim(),
    meaning: meaning.value.trim(),
  })
  word.value = ''
  meaning.value = ''
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">我的单词本</text>
      <text class="subtitle">从后端读取真实数据</text>
    </view>

    <view class="card form-card">
      <input v-model="word" class="input" placeholder="单词，例如 vocabulary" />
      <input v-model="meaning" class="input" placeholder="释义，例如 词汇" />
      <button class="primary-btn" :disabled="store.loading" @tap="handleAdd">
        添加单词
      </button>
    </view>

    <view v-if="store.loading" class="tip">加载中…</view>
    <view v-if="store.error" class="tip error">{{ store.error }}</view>

    <view v-for="item in store.words" :key="item.id" class="card word-card">
      <view class="word-row">
        <text class="word">{{ item.word }}</text>
        <text v-if="item.phonetic" class="phonetic">{{ item.phonetic }}</text>
      </view>
      <text class="meaning">{{ item.meaning }}</text>
      <text v-if="item.example" class="example">{{ item.example }}</text>
    </view>

    <view v-if="!store.loading && store.words.length === 0" class="empty">
      还没有单词，先在上方添加吧
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 32rpx;
}
.header {
  margin-bottom: 32rpx;
}
.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
}
.subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a8f99;
}
.card {
  margin-bottom: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 35, 41, 0.05);
}
.input {
  height: 80rpx;
  padding: 0 20rpx;
  margin-bottom: 20rpx;
  background: #f6f7fb;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.primary-btn {
  color: #fff;
  background: #3b82f6;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.word-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}
.word {
  font-size: 34rpx;
  font-weight: 700;
}
.phonetic {
  font-size: 24rpx;
  color: #8a8f99;
}
.meaning {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
}
.example {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a8f99;
}
.tip,
.empty {
  padding: 24rpx;
  font-size: 26rpx;
  color: #8a8f99;
  text-align: center;
}
.error {
  color: #ef4444;
}
</style>
