import assert from 'node:assert/strict'
import test from 'node:test'
import { signSessionToken, verifySessionToken } from './token'

const secret = 'test-secret-with-enough-entropy'

test('signs and verifies a session token', () => {
  const token = signSessionToken('user-1', secret, 3600, 1000)
  assert.deepEqual(verifySessionToken(token, secret, 1001), {
    sub: 'user-1',
    iat: 1000,
    exp: 4600,
  })
})

test('rejects tampering and expired tokens', () => {
  const token = signSessionToken('user-1', secret, 60, 1000)
  assert.equal(verifySessionToken(`${token}x`, secret, 1001), null)
  assert.equal(verifySessionToken(token, secret, 1060), null)
  assert.equal(verifySessionToken(token, 'different-secret', 1001), null)
})
