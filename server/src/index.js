import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { api } from './routes/api.js'
import { ensureDevUser } from './auth.js'
import { rateLimit } from './auth.js'
import { logger } from './logger.js'
import { startWorker } from './queue.js'

const port = Number.parseInt(process.env.PORT, 10) || config.port || 8787
const host = '0.0.0.0'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(rateLimit)
app.use('/api', api)

const webRoot = path.join(config.root, 'dist')
app.use(express.static(webRoot, { index: false, maxAge: '1h' }))
app.get(/^(?!\/api).*/, (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  res.sendFile(path.join(webRoot, 'index.html'), (err) => {
    if (err) {
      res
        .status(503)
        .type('text/plain')
        .send('HYNBET frontend build is missing. Run npm run build.')
    }
  })
})

app.use((err, _req, res, _next) => {
  logger.error('unhandled', { error: err.message })
  res.status(500).json({ error: 'FAILED', message: err.message })
})

app.listen(port, host, () => {
  logger.info(`HYNBET listening on ${host}:${port}`)
  try {
    ensureDevUser()
  } catch (e) {
    logger.warn('ensureDevUser failed', { error: e.message })
  }
  try {
    startWorker()
  } catch (e) {
    logger.warn('worker not started', { error: e.message })
  }
})
