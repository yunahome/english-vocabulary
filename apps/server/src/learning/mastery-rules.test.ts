import assert from 'node:assert/strict'
import test from 'node:test'
import {
  REVIEW_INTERVAL_MS,
  evaluateWritingAttempt,
  type MasterySnapshot,
} from './mastery-rules'

const firstCorrectAt = new Date('2026-11-01T00:00:00.000Z')

function learningSnapshot(overrides: Partial<MasterySnapshot> = {}): MasterySnapshot {
  return {
    status: 'learning',
    correctStreak: 1,
    lastCorrectAt: firstCorrectAt,
    masteredAt: null,
    nextReviewAt: new Date(firstCorrectAt.getTime() + REVIEW_INTERVAL_MS),
    ...overrides,
  }
}

test('rejects a correct attempt before seven full days', () => {
  const decision = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'scheduled',
    now: new Date(firstCorrectAt.getTime() + REVIEW_INTERVAL_MS - 1),
    current: learningSnapshot(),
  })
  assert.equal(decision.isValidMasteryAttempt, false)
  assert.equal(decision.correctStreak, 1)
  assert.equal(decision.status, 'learning')
})

test('increments at seven days and masters only on the third interval', () => {
  const secondAt = new Date(firstCorrectAt.getTime() + REVIEW_INTERVAL_MS)
  const second = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'scheduled',
    now: secondAt,
    current: learningSnapshot(),
  })
  assert.equal(second.correctStreak, 2)
  assert.equal(second.status, 'learning')

  const third = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'scheduled',
    now: new Date(secondAt.getTime() + REVIEW_INTERVAL_MS),
    current: learningSnapshot({
      correctStreak: 2,
      lastCorrectAt: secondAt,
    }),
  })
  assert.equal(third.correctStreak, 3)
  assert.equal(third.status, 'mastered')
  assert.equal(third.nextReviewAt, null)
})

test('an immediate retry never changes streak or review schedule', () => {
  const current = learningSnapshot()
  const decision = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'immediate_retry',
    now: new Date(firstCorrectAt.getTime() + REVIEW_INTERVAL_MS),
    current,
  })
  assert.equal(decision.isValidMasteryAttempt, false)
  assert.equal(decision.correctStreak, current.correctStreak)
  assert.equal(decision.lastCorrectAt, current.lastCorrectAt)
  assert.equal(decision.nextReviewAt, current.nextReviewAt)
})

test('a scheduled wrong answer clears the streak and becomes immediately due', () => {
  const now = new Date('2026-11-20T00:00:00.000Z')
  const decision = evaluateWritingAttempt({
    isCorrect: false,
    isIndependent: true,
    attemptType: 'scheduled',
    now,
    current: learningSnapshot({ correctStreak: 2 }),
  })
  assert.equal(decision.isValidMasteryAttempt, true)
  assert.equal(decision.correctStreak, 0)
  assert.equal(decision.lastCorrectAt, null)
  assert.equal(decision.status, 'learning')
  assert.equal(decision.nextReviewAt?.getTime(), now.getTime())
})

test('mastered words are excluded from automatic mastery attempts', () => {
  const decision = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'scheduled',
    now: new Date('2026-12-01T00:00:00.000Z'),
    current: learningSnapshot({
      status: 'mastered',
      correctStreak: 3,
      masteredAt: firstCorrectAt,
      nextReviewAt: null,
    }),
  })
  assert.equal(decision.isValidMasteryAttempt, false)
  assert.equal(decision.status, 'mastered')
})

test('after forgetting (lastCorrectAt cleared) a correct answer restarts mastery counting', () => {
  // 标记遗忘会清空 lastCorrectAt 并把 correctStreak 归零；
  // 此时即使距上次正确不足 7 天，也应能重新开始累计（否则遗忘后 7 天内无法再掌握）。
  const forgotten = learningSnapshot({
    status: 'learning',
    correctStreak: 0,
    lastCorrectAt: null,
    nextReviewAt: firstCorrectAt,
  })
  const decision = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'scheduled',
    now: new Date(firstCorrectAt.getTime() + 60_000),
    current: forgotten,
  })
  assert.equal(decision.isValidMasteryAttempt, true)
  assert.equal(decision.correctStreak, 1)
  assert.equal(decision.status, 'learning')
})

test('after forgetting (lastCorrectAt cleared) a correct answer restarts mastery counting', () => {
  // 标记遗忘会清空 lastCorrectAt 并把 correctStreak 归零；
  // 此时即使距上次正确不足 7 天，也应能重新开始累计（否则遗忘后 7 天内无法再掌握）。
  const forgotten = learningSnapshot({
    status: 'learning',
    correctStreak: 0,
    lastCorrectAt: null,
    nextReviewAt: firstCorrectAt,
  })
  const decision = evaluateWritingAttempt({
    isCorrect: true,
    isIndependent: true,
    attemptType: 'scheduled',
    now: new Date(firstCorrectAt.getTime() + 60_000),
    current: forgotten,
  })
  assert.equal(decision.isValidMasteryAttempt, true)
  assert.equal(decision.correctStreak, 1)
  assert.equal(decision.status, 'learning')
})
