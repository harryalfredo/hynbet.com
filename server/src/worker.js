import { startWorker } from './queue.js'
import { logger } from './logger.js'
import { ensureDevUser } from './auth.js'

ensureDevUser()
startWorker()
logger.info('Standalone worker process up')
