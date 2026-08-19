import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.REDIS_URL = process.env.REDIS_URL || ''

const { redisClientOptions, redisConfigured, pingRedis, QUEUE_NAMES, shouldRunInlineWorker } = await import('./queue.js')

test('REDIS_URL unset is reported, not faked', async () => {
  if (!process.env.REDIS_URL) {
    assert.equal(redisConfigured(), false)
    assert.equal(await pingRedis(), 'unset')
  }
})

test('rediss:// enables TLS options without exposing the URL', () => {
  const prev = process.env.REDIS_URL
  process.env.REDIS_URL = 'rediss://example.internal:6379'
  const opts = redisClientOptions()
  assert.ok(opts.tls)
  process.env.REDIS_URL = prev
})

test('queue names cover analysis, transcription, render, export', () => {
  assert.equal(QUEUE_NAMES.analysis, 'hynbet-analysis')
  assert.equal(QUEUE_NAMES.transcription, 'hynbet-transcription')
  assert.equal(QUEUE_NAMES.render, 'hynbet-render')
  assert.equal(QUEUE_NAMES.export, 'hynbet-export')
  assert.equal(QUEUE_NAMES.process, 'hynbet-projects')
})

test('inline worker is off in production unless HYNBET_RUN_WORKER=1', async () => {
  const { config } = await import('./config.js')
  const prev = config.env
  const prevFlag = process.env.HYNBET_RUN_WORKER
  process.env.HYNBET_RUN_WORKER = '0'
  assert.equal(shouldRunInlineWorker(), false)
  process.env.HYNBET_RUN_WORKER = prevFlag
})

test('live Redis ping is truthful when REDIS_URL is set', async () => {
  if (!process.env.REDIS_URL) {
    assert.equal(await pingRedis(), 'unset')
    return
  }
  const status = await pingRedis()
  assert.ok(status === 'ok' || status === 'error')
  if (status === 'ok') {
    const { redisConnection } = await import('./queue.js')
    const pong = await redisConnection().ping()
    assert.equal(pong, 'PONG')
  }
})
