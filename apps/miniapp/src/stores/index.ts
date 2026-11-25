import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateWordInput, WordDto } from '@englis-vocabulary/shared'
import { createWord, listWords } from '@/api/words'

export const useWordStore = defineStore('word', () => {
  const words = ref<WordDto[]>([])
  const loading = ref(false)
  const error = ref('')

  async function fetchWords() {
    loading.value = true
    error.value = ''
    try {
      words.value = await listWords()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载单词失败'
    } finally {
      loading.value = false
    }
  }

  async function addWord(input: CreateWordInput) {
    loading.value = true
    error.value = ''
    try {
      const created = await createWord(input)
      words.value = [created, ...words.value]
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加单词失败'
    } finally {
      loading.value = false
    }
  }

  return { words, loading, error, fetchWords, addWord }
})
