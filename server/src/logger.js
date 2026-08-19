const REDACT_KEY = /secret|password|authorization|api[_-]?key|client[_-]?secret|access[_-]?token/i

function redact(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEY.test(k) ? '[redacted]' : redact(v)
    }
    return out
  }
  return value
}

export function log(fields) {
  const row = redact({
    ts: new Date().toISOString(),
    ...fields,
  })
  const line = [
    row.jobId ? `[JOB ${row.jobId}]` : '',
    row.stage ? `[STAGE ${row.stage}]` : '',
    row.status ? `[STATUS ${row.status}]` : '',
    row.msg || row.message || '',
    row.duration != null ? `duration=${row.duration}s` : '',
    row.error ? `error=${row.error}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  console.log(JSON.stringify({ ...row, line }))
}

export const logger = {
  info: (msg, extra = {}) => log({ level: 'info', msg, ...extra }),
  warn: (msg, extra = {}) => log({ level: 'warn', msg, ...extra }),
  error: (msg, extra = {}) => log({ level: 'error', msg, ...extra }),
  stage: (jobId, stage, status, extra = {}) =>
    log({ jobId, stage, status, ...extra }),
}
