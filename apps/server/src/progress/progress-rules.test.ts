import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DAILY_MINIMUM_NEW_WORDS,
  NEW_WORD_BATCH_SIZE,
  selectNextNewWordBatch,
  countsTowardStreak,
} from './progress-rules'

test('已有待办新词时不再追加批次', () => {
  const ids = selectNextNewWordBatch({
    stageSenseIdsInOrder: ['a', 'b', 'c', 'd'],
    learnedSenseIds: new Set(),
    existingNewSenseIds: new Set(['a', 'b']),
    pendingNewCount: 2,
  })
  assert.deepEqual(ids, [])
})

test('没有待办时按批生成新词，不超过批次大小', () => {
  const ids = selectNextNewWordBatch({
    stageSenseIdsInOrder: ['a', 'b', 'c', 'd', 'e', 'f'],
    learnedSenseIds: new Set(),
    existingNewSenseIds: new Set(['a']),
    pendingNewCount: 0,
  })
  assert.deepEqual(ids, ['b', 'c', 'd', 'e', 'f'])
  assert.ok(ids.length <= NEW_WORD_BATCH_SIZE)
})

test('已学过和已生成过任务的词都不会重复进入批次', () => {
  const ids = selectNextNewWordBatch({
    stageSenseIdsInOrder: ['a', 'b', 'c', 'd'],
    learnedSenseIds: new Set(['a']),
    existingNewSenseIds: new Set(['b']),
    pendingNewCount: 0,
  })
  assert.deepEqual(ids, ['c', 'd'])
})

test('当前阶段没有剩余新词时返回空数组（补掌握模式，不跨阶段补词）', () => {
  const ids = selectNextNewWordBatch({
    stageSenseIdsInOrder: ['a', 'b'],
    learnedSenseIds: new Set(['a', 'b']),
    existingNewSenseIds: new Set(),
    pendingNewCount: 0,
  })
  assert.deepEqual(ids, [])
})

test('批次大小可自定义', () => {
  const ids = selectNextNewWordBatch({
    stageSenseIdsInOrder: ['a', 'b', 'c', 'd', 'e'],
    learnedSenseIds: new Set(),
    existingNewSenseIds: new Set(),
    pendingNewCount: 0,
    batchSize: 2,
  })
  assert.deepEqual(ids, ['a', 'b'])
})

test('每日最低新词数为 5', () => {
  assert.equal(DAILY_MINIMUM_NEW_WORDS, 5)
})

test('只有真正完成学习才算连续天数', () => {
  const empty = { newWordCount: 0, reviewWordCount: 0, masteredCount: 0 }
  assert.equal(countsTowardStreak(empty), false)
  assert.equal(countsTowardStreak({ ...empty, newWordCount: 1 }), true)
  assert.equal(countsTowardStreak({ ...empty, reviewWordCount: 1 }), true)
  assert.equal(countsTowardStreak({ ...empty, masteredCount: 1 }), true)
})
