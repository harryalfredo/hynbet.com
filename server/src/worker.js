import { logger } from './logger.js'
import { ensureDevUser } from './auth.js'
import { startWorker, stopWorkers, redisConfigured } from './queue.js'

if (!redisConfigured()) {
  logger.warn('Standalone worker exiting — REDIS_URL is not set')
  process.exit(1)
}

ensureDevUser()
startWorker()
logger.info('Standalone worker process up')

async function shutdown(signal) {
  logger.info('worker stopping', { signal })
  try {
    await stopWorkers()
  } catch (e) {
    logger.warn('worker shutdown error', { error: e.message })
  }
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
