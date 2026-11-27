<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { UserWordDto, WordWithSensesDto } from '@englis-vocabulary/shared'
import { getCatalogWordsCached } from '@/utils/catalog-cache'
import { getUserWords, markForgotten } from '@/api/learning'
import { useUserStore } from '@/stores/user'
import { getNavMetrics, isLocalImage, resolveWordImage } from '@/utils/nav'

interface VocabItem {
  wordSenseId: string
  word: string
  phonetic: string | null
  definition: string
  example: string | null
  partOfSpeech: string
  image: string
  status: string
  correctStreak: number
  nextReviewAt: string | null
  learned: boolean
  badge: string
  badgeClass: string
  reviewText: string
}

type FilterKey = 'all' | 'learning' | 'due' | 'mastered'

const userStore = useUserStore()
const nav = getNavMetrics()
const items = ref<VocabItem[]>([])
const loading = ref(true)
const error = ref('')
const userId = ref('')
const filter = ref<FilterKey>('all')
const keyword = ref('')
const showSearch = ref(false)
const detail = ref<VocabItem | null>(null)
const working = ref(false)

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'learning', label: 'Learning' },
  { key: 'due', label: 'Review Due' },
  { key: 'mastered', label: 'Mastered' },
]

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (kw && !item.word.toLowerCase().includes(kw) && !item.definition.includes(kw)) return false
    if (filter.value === 'learning') return item.badgeClass === 'learning'
    if (filter.value === 'due') return item.badgeClass === 'due'
    if (filter.value === 'mastered') return item.badgeClass === 'mastered'
    return true
  })
})

function formatDate(iso: string | null): string {
  if (!iso) return 'Not scheduled'
  return iso.slice(0, 10)
}

function decorate(
  catalog: WordWithSensesDto[],
  userWords: UserWordDto[],
): VocabItem[] {
  const bySense = new Map(userWords.map((w) => [w.wordSenseId, w]))
  const now = Date.now()
  // 展开每个单词的全部词义，覆盖全量词库（不再只取首单元首关卡）
  const senses = catalog.flatMap((word) =>
    word.senses.map((sense) => ({ sense, word })),
  )
  return senses.map(({ sense: item, word }) => {
    const record = bySense.get(item.id)
    const due = !!record && (
      (record.nextReviewAt !== null && new Date(record.nextReviewAt).getTime() <= now) ||
      record.forgottenAt !== null
    )
    const status = record?.status ?? 'not_started'
    let badge = 'Not Started'
    let badgeClass = 'notstarted'
    let reviewText = 'Start learning to add'
    if (status === 'mastered') {
      badge = 'Mastered'
      badgeClass = 'mastered'
      reviewText = 'No auto review'
    } else if (due) {
      badge = 'Review Due'
      badgeClass = 'due'
      reviewText = 'Due today'
    } else if (record) {
      badge = 'Learning'
      badgeClass = 'learning'
      reviewText = `Next review: ${formatDate(record.nextReviewAt)}`
    }
    return {
      wordSenseId: item.id,
      word: word.word,
      phonetic: word.phonetic,
      definition: item.definition,
      example: item.example ?? null,
      partOfSpeech: item.partOfSpeech,
      image: resolveWordImage(word.word, word.imageUrl),
      status,
      correctStreak: record?.correctStreak ?? 0,
      nextReviewAt: record?.nextReviewAt ?? null,
      learned: !!record,
      badge,
      badgeClass,
      reviewText,
    }
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const id = await userStore.ensureUser()
    userId.value = id
    const [catalog, userWords] = await Promise.all([
      getCatalogWordsCached(),
      getUserWords(),
    ])
    items.value = decorate(catalog, userWords)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载词库失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onForgot() {
  if (!detail.value || working.value) return
  working.value = true
  try {
    await markForgotten(detail.value.wordSenseId)
    uni.showToast({ title: '已重新加入学习', icon: 'success' })
    detail.value = null
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally {
    working.value = false
  }
}

function onSearchInput(e: Event) {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  keyword.value = detail?.value ?? ''
}

</script>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: nav.statusBarHeight + 'px', paddingRight: nav.rightPadding + 'px' }">
      <view class="nav-side" />
      <text class="nav-title">Vocabulary</text>
      <view class="nav-side" @tap="showSearch = !showSearch"><text class="search-icon">🔍</text></view>
    </view>

    <view v-if="showSearch" class="search-wrap">
      <input
        class="search-input"
        :value="keyword"
        placeholder="Search a word..."
        placeholder-class="placeholder"
        @input="onSearchInput"
      />
    </view>

    <scroll-view class="filter-row" scroll-x show-scrollbar="false">
      <view
        v-for="f in filters"
        :key="f.key"
        class="filter-pill"
        :class="{ active: filter === f.key }"
        @tap="filter = f.key"
      >{{ f.label }}</view>
    </scroll-view>

    <view v-if="loading" class="state">加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>
    <view v-else-if="filtered.length === 0" class="state">没有符合条件的单词</view>

    <view v-for="item in filtered" :key="item.wordSenseId" class="word-card" @tap="detail = item">
      <image v-if="isLocalImage(item.image)" class="thumb" :src="item.image" mode="aspectFit" />
      <text v-else class="thumb-emoji">{{ item.image }}</text>
      <view class="word-body">
        <view class="row">
          <text class="word-name">{{ item.word }}</text>
          <text class="badge" :class="item.badgeClass">{{ item.badge }}</text>
        </view>
        <view class="row">
          <text class="word-phonetic">{{ item.phonetic || '' }}</text>
          <text class="review-text">{{ item.reviewText }}</text>
        </view>
      </view>
      <text class="arrow">›</text>
    </view>

    <!-- 详情弹层 -->
    <view v-if="detail" class="mask" @tap="detail = null">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <image v-if="isLocalImage(detail.image)" class="sheet-img" :src="detail.image" mode="aspectFit" />
          <text v-else class="sheet-emoji">{{ detail.image }}</text>
          <view class="sheet-title">
            <text class="sheet-word">{{ detail.word }}</text>
            <text class="sheet-phonetic">{{ detail.phonetic || '' }}</text>
          </view>
        </view>
        <text class="sheet-def">{{ detail.definition }} · {{ detail.partOfSpeech }}</text>
        <text v-if="detail.example" class="sheet-example">{{ detail.example }}</text>
        <view class="sheet-meta">
          <text>Status: {{ detail.badge }}</text>
          <text>Correct streak: {{ detail.correctStreak }} / 3</text>
          <text>Next review: {{ formatDate(detail.nextReviewAt) }}</text>
        </view>
        <button v-if="detail.badgeClass === 'mastered'" class="primary" :disabled="working" @tap="onForgot">
          I Forgot This Word
        </button>
        <button v-else class="primary ghost" @tap="detail = null">Close</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh; background: #fffaf2; box-sizing: border-box;
  padding: 0 40rpx 220rpx; overflow-x: hidden;
}
.page view, .page image, .page button, .page input { box-sizing: border-box; }
.nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 44px; margin: 0 -40rpx 24rpx; padding-left: 16rpx;
}
.nav-side { width: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon { font-size: 56rpx; color: #1f2d24; line-height: 1; font-weight: 300; }
.search-icon { font-size: 30rpx; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #1f2d24; }
.state { padding: 140rpx 0; text-align: center; color: #94a096; font-size: 28rpx; }
.error { color: #e05a4f; }

.search-wrap { margin-bottom: 20rpx; }
.search-input {
  width: 100%; height: 80rpx; background: #fff; border-radius: 999rpx;
  border: 2rpx solid #e6ebe4; padding: 0 30rpx; font-size: 26rpx; color: #1f2d24;
}
.placeholder { color: #a9b4ac; font-size: 26rpx; }

.filter-row { display: flex; white-space: nowrap; margin-bottom: 24rpx; }
.filter-pill {
  display: inline-block; padding: 14rpx 30rpx; margin-right: 16rpx;
  border-radius: 999rpx; background: #f4f1e9; border: 2rpx solid #eae5d8;
  font-size: 24rpx; color: #6b7a70;
}
.filter-pill.active { background: #3d9b6c; border-color: #3d9b6c; color: #fff; font-weight: 700; }

.word-card {
  display: flex; align-items: center; gap: 20rpx; background: #fff;
  border-radius: 26rpx; padding: 24rpx 22rpx; margin-bottom: 18rpx;
  box-shadow: 0 6rpx 20rpx rgba(60, 80, 60, 0.05);
}
.thumb { width: 88rpx; height: 88rpx; flex-shrink: 0; }
.thumb-emoji { width: 88rpx; height: 88rpx; font-size: 56rpx; text-align: center; line-height: 88rpx; }
.word-body { flex: 1; min-width: 0; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 10rpx; }
.row + .row { margin-top: 8rpx; }
.word-name { font-size: 30rpx; font-weight: 700; color: #1f2d24; }
.word-phonetic { font-size: 22rpx; color: #94a096; }
.review-text { font-size: 20rpx; color: #94a096; }
.badge { font-size: 20rpx; padding: 6rpx 18rpx; border-radius: 999rpx; font-weight: 600; }
.badge.mastered { background: #e3f5e8; color: #2f9c68; }
.badge.learning { background: #fff1d9; color: #d79424; }
.badge.due { background: #e5f0fb; color: #4a86c5; }
.badge.notstarted { background: #eef0ec; color: #9aa89e; }
.arrow { font-size: 40rpx; color: #b6c0b8; font-weight: 300; }

.mask {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(20, 35, 25, 0.45); display: flex; align-items: flex-end; z-index: 20;
}
.sheet {
  width: 100%; background: #fffdf7; border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx 40rpx 60rpx;
}
.sheet-head { display: flex; align-items: center; gap: 24rpx; }
.sheet-img { width: 120rpx; height: 120rpx; }
.sheet-emoji { width: 120rpx; font-size: 80rpx; text-align: center; }
.sheet-title { display: flex; flex-direction: column; }
.sheet-word { font-size: 44rpx; font-weight: 800; color: #1f2d24; }
.sheet-phonetic { font-size: 26rpx; color: #94a096; margin-top: 4rpx; }
.sheet-def { display: block; font-size: 30rpx; color: #1f2d24; margin-top: 24rpx; }
.sheet-example { display: block; font-size: 24rpx; color: #6b7a70; margin-top: 10rpx; }
.sheet-meta { display: flex; flex-direction: column; gap: 8rpx; margin-top: 24rpx; }
.sheet-meta text { font-size: 22rpx; color: #8a9a90; }
.primary {
  width: 100%; background: #3d9b6c; border-radius: 999rpx; border: none;
  padding: 24rpx 0; margin-top: 32rpx; color: #fff; font-size: 30rpx; font-weight: 700;
}
.primary.ghost { background: #eaf1ea; color: #3d6b50; }
.primary[disabled] { opacity: 0.6; }
</style>
