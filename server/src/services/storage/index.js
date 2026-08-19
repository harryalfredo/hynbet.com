import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../config.js'

function safeKey(key) {
  return String(key || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..')
    .join('/')
}

export const storage = {
  kind() {
    return config.storage.endpoint && config.storage.bucket ? 's3' : 'local'
  },
  abs(key) {
    return path.join(config.storageDir, safeKey(key))
  },
  async putFile(key, srcPath) {
    const dest = this.abs(key)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(srcPath, dest)
    return { key: safeKey(key), bytes: fs.statSync(dest).size }
  },
  async putBuffer(key, buf) {
    const dest = this.abs(key)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, buf)
    return { key: safeKey(key), bytes: buf.length }
  },
  exists(key) {
    return fs.existsSync(this.abs(key))
  },
  read(key) {
    return fs.readFileSync(this.abs(key))
  },
  stat(key) {
    const p = this.abs(key)
    if (!fs.existsSync(p)) return null
    return fs.statSync(p)
  },
  async ping() {
    try {
      fs.accessSync(config.storageDir, fs.constants.W_OK)
      return 'ok'
    } catch {
      return 'error'
    }
  },
}
