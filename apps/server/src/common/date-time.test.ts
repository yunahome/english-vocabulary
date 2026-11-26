import assert from 'node:assert/strict'
import test from 'node:test'
import {
  dateKeyInTimeZone,
  hourInTimeZone,
  isValidTimeZone,
  parseDateKey,
  resolveTimeZone,
} from './date-time'

test('uses the user natural date at a UTC boundary', () => {
  const now = new Date('2026-11-26T16:30:00.000Z')
  assert.equal(dateKeyInTimeZone(now, 'Asia/Shanghai'), '2026-11-27')
  assert.equal(dateKeyInTimeZone(now, 'America/New_York'), '2026-11-26')
})

test('calculates greeting hour in the user timezone', () => {
  const now = new Date('2026-11-26T16:30:00.000Z')
  assert.equal(hourInTimeZone(now, 'Asia/Shanghai'), 0)
  assert.equal(hourInTimeZone(now, 'America/New_York'), 11)
})

test('validates timezones and falls back to the product default', () => {
  assert.equal(isValidTimeZone('Asia/Shanghai'), true)
  assert.equal(isValidTimeZone('Mars/Olympus'), false)
  assert.equal(resolveTimeZone('Mars/Olympus'), 'Asia/Shanghai')
})

test('parses strict date keys without accepting impossible dates', () => {
  assert.equal(parseDateKey('2026-02-28').toISOString(), '2026-02-28T00:00:00.000Z')
  assert.throws(() => parseDateKey('2026-02-30'))
  assert.throws(() => parseDateKey('2026/02/28'))
})
