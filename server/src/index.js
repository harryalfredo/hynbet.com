import path from 'node:path'
import express from 'express'

const port = Number.parseInt(process.env.HYNBET_BIND_PORT || process.env.PORT, 10) || 8787
const host = '0.0.0.0'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

app.get('/api/health', async (_req, res) => {
  try {
    const { healthPayload } = await import('./health.js')
    res.status(200).json(await healthPayload())
  } catch (e) {
    res.status(200).json({
      status: 'ok',
      ready: false,
      error: e.message || 'startup',
    })
  }
})

const server = app.listen(port, host, () => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'info',
    msg: `HYNBET listening on ${host}:${port}`,
  }))
  attach().catch((e) => {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      msg: 'failed to attach application',
      error: e.message,
    }))
  })
})

async function attach() {
  const [{ default: cors }, { config }, { api }, { ensureDevUser }, { rateLimit }, { logger }, { startWorker }] =
    await Promise.all([
      import('cors'),
      import('./config.js'),
      import('./routes/api.js'),
      import('./auth.js'),
      import('./auth.js'),
      import('./logger.js'),
      import('./queue.js'),
    ])

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
        res.status(503).type('text/plain').send('HYNBET frontend build is missing. Run npm run build.')
      }
    })
  })

  app.use((err, _req, res, _next) => {
    logger.error('unhandled', { error: err.message })
    res.status(500).json({ error: 'FAILED', message: err.message })
  })

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
}

server.on('error', (err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: err.message }))
  process.exit(1)
})
