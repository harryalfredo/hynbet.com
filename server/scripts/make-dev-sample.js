import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { config } from '../src/config.js'

const out = config.devSamplePath
const dir = path.join(config.dataDir, 'samples', 'build')
fs.mkdirSync(dir, { recursive: true })

const lines = [
  { t: 'Alright chat. I did not plan to talk about this tonight, but something just happened.', a: 140 },
  { t: 'She asked me if she could leave, in the middle of the conversation. I was not ready for that.', a: 155 },
  { t: 'Wait. Wait. What did you just say?', a: 185 },
  { t: 'The whole room went quiet. Nobody expected her to ask that.', a: 150 },
  { t: 'And then she said it again, completely serious. That is the moment.', a: 160 },
  { t: 'I still cannot believe that happened.', a: 145 },
]

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.status !== 0) {
    throw new Error(`${cmd} failed: ${r.stderr || r.stdout}`)
  }
}

const wavs = []
lines.forEach((line, i) => {
  const wav = path.join(dir, `line${i}.wav`)
  run('espeak-ng', ['-s', '148', '-a', String(line.a), '-w', wav, line.t])
  wavs.push(wav)
  const silence = path.join(dir, `sil${i}.wav`)
  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', i === 2 ? '0.35' : '0.7', silence])
  wavs.push(silence)
})

const list = path.join(dir, 'list.txt')
fs.writeFileSync(list, wavs.map((w) => `file '${w}'`).join('\n'))
const voice = path.join(dir, 'voice.wav')
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', voice])

const frames = [
  '/home/user/public/demo/stream-frame-01.jpg',
  '/home/user/public/demo/stream-frame-02.jpg',
  '/home/user/public/demo/stream-frame-04.jpg',
].filter((f) => fs.existsSync(f))

if (!frames.length) {
  run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=0x111118:s=1280x720:d=1', path.join(dir, 'frame.jpg')])
  frames.push(path.join(dir, 'frame.jpg'))
}

const stills = path.join(dir, 'stills.mp4')
const concatVid = path.join(dir, 'vidlist.txt')
fs.writeFileSync(
  concatVid,
  frames
    .map((f) => `file '${f}'\nduration 8`)
    .join('\n') + `\nfile '${frames.at(-1)}'\n`
)
run('ffmpeg', [
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  concatVid,
  '-vf',
  'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p',
  '-r',
  '30',
  stills,
])

run('ffmpeg', [
  '-y',
  '-stream_loop',
  '-1',
  '-i',
  stills,
  '-i',
  voice,
  '-shortest',
  '-map',
  '0:v:0',
  '-map',
  '1:a:0',
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-crf',
  '20',
  '-c:a',
  'aac',
  '-b:a',
  '160k',
  '-movflags',
  '+faststart',
  out,
])

console.log('Wrote', out, fs.statSync(out).size, 'bytes')
