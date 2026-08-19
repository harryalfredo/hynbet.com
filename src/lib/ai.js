import { CAPTION_STYLES, identityFromHandle, MOMENT_TYPES } from '../data/catalog'
import { clamp, fmtTime, hashStr, pick, seeded, uid } from './utils'

const TITLES = {
  curiosity: [
    ['THEY DID NOT EXPECT THIS', 'WAIT TILL THE END OF THIS'],
    ['SHE ASKED FOR PERMISSION TO GO', 'NOBODY SAW THIS COMING'],
    ['HE SAID IT OUT LOUD', 'CHAT LOST IT AFTER THIS'],
    ['THE ROOM WENT SILENT', 'YOU NEED THE CONTEXT FIRST'],
  ],
  viral: [
    ['THIS IS GOING TO LIVE FOREVER', 'THE CLIP EVERYONE WANTED'],
    ['UNREAL REACTION', 'THIS MOMENT BROKE THE STREAM'],
    ['SAY THAT AGAIN', 'THE INTERNET WAS NOT READY'],
  ],
  news: [
    ['WHAT WAS SAID ON STREAM', 'A STATEMENT THAT CHANGED THE VIBE'],
    ['THE MOMENT THE CONVERSATION TURNED', 'HERE IS WHAT ACTUALLY HAPPENED'],
  ],
  funny: [
    ['THIS SHOULD NOT BE THIS FUNNY', 'THEY TRIED TO KEEP A STRAIGHT FACE'],
    ['THE BIT THAT GOT AWAY FROM THEM', 'CHAT WAS NOT HELPING'],
  ],
  dramatic: [
    ['EVERYTHING SHIFTED HERE', 'THE TONE CHANGED IN SECONDS'],
    ['NO ONE WAS LAUGHING AFTER THIS', 'LISTEN TO THE LAST LINE'],
  ],
  reaction: [
    ['LOOK AT THE FACE', 'THE REACTION SAYS EVERYTHING'],
    ['THEY COULD NOT HIDE IT', 'FROZEN FOR A FULL SECOND'],
  ],
  short: [
    ['WAIT FOR IT', 'SAY LESS'],
    ['OH.', 'THAT FACE'],
    ['NO WAY', 'HOLD ON'],
  ],
}

const BEATS = {
  funny: {
    desc: 'A joke lands and the streamer cannot recover. Chat piles on.',
    hook: 'The setup is ordinary. The punchline is not.',
    words: ['wait', 'wait', 'wait', 'that', 'is', 'actually', 'hilarious', 'stop'],
    emoji: '😂',
  },
  unexpected: {
    desc: 'An unexpected turn in the conversation. The room resets.',
    hook: 'Nobody in the room planned this line.',
    words: ['hold', 'on', 'what', 'did', 'you', 'just', 'say'],
    emoji: '🤯',
  },
  argument: {
    desc: 'A disagreement spikes, then someone says the line that ends it.',
    hook: 'Tension, then a single sentence that flips the table.',
    words: ['no', 'no', 'you', 'are', 'not', 'hearing', 'me', 'right', 'now'],
    emoji: '🔥',
  },
  reaction: {
    desc: 'A clean reaction shot with a complete setup and payoff.',
    hook: 'The face is the clip.',
    words: ['look', 'at', 'this', 'are', 'you', 'serious', 'right', 'now'],
    emoji: '😱',
  },
  shocked: {
    desc: 'A shocked reaction during conversation. Audio stays clean.',
    hook: 'The surprise is honest. The context is intact.',
    words: ['she', 'asked', 'if', 'she', 'could', 'even', 'go', 'what'],
    emoji: '😭',
  },
  emotional: {
    desc: 'A sincere beat. The streamer drops the bit and talks straight.',
    hook: 'The energy falls and the words get specific.',
    words: ['i', 'am', 'being', 'so', 'serious', 'right', 'now'],
    emoji: '💔',
  },
  statement: {
    desc: 'A clear, self-contained statement with enough setup to stand alone.',
    hook: 'One sentence that can live without the rest of the stream.',
    words: ['here', 'is', 'the', 'thing', 'nobody', 'wants', 'to', 'say'],
    emoji: '🎙️',
  },
  controversial: {
    desc: 'A charged take. Headline stays descriptive, not accusatory.',
    hook: 'The clip shows what was said — nothing extra.',
    words: ['okay', 'but', 'that', 'is', 'a', 'crazy', 'thing', 'to', 'say'],
    emoji: '⚡',
  },
  surprise: {
    desc: 'A reveal the streamer did not see coming.',
    hook: 'Setup, then the reveal, then the face.',
    words: ['you', 'are', 'joking', 'you', 'have', 'to', 'be', 'joking'],
    emoji: '👀',
  },
  win: {
    desc: 'A decisive win. Audio peaks, then the celebration.',
    hook: 'The last five seconds are the reason people rewind.',
    words: ['it', 'is', 'over', 'it', 'is', 'actually', 'over', 'lets', 'go'],
    emoji: '🏆',
  },
  loss: {
    desc: 'A brutal fail. The silence after is funnier than the scream.',
    hook: 'Confidence, then the mistake, then the aftermath.',
    words: ['no', 'no', 'no', 'that', 'is', 'so', 'cooked'],
    emoji: '💀',
  },
  convo: {
    desc: 'A back-and-forth that builds into a single quotable exchange.',
    hook: 'Two voices, one payoff.',
    words: ['so', 'you', 'are', 'telling', 'me', 'that', 'was', 'the', 'plan'],
    emoji: '💬',
  },
  chat: {
    desc: 'Chat detonates and the streamer reads the room live.',
    hook: 'The chat is the second character.',
    words: ['chat', 'is', 'not', 'okay', 'right', 'now'],
    emoji: '📈',
  },
  scream: {
    desc: 'A sudden scream with a readable cause. Not noise for noise.',
    hook: 'You hear why it happens, not just the scream.',
    words: ['AHHH', 'what', 'was', 'that', 'what', 'was', 'that'],
    emoji: '📢',
  },
  energy: {
    desc: 'A high-energy stretch with motion, voice, and a clean ending.',
    hook: 'It already feels like a short.',
    words: ['we', 'are', 'so', 'back', 'we', 'are', 'so', 'back'],
    emoji: '⚡',
  },
  story: {
    desc: 'A story with a beginning, a turn, and a last line worth clipping.',
    hook: 'The last sentence is the title.',
    words: ['so', 'anyway', 'that', 'is', 'how', 'we', 'ended', 'up', 'there'],
    emoji: '📖',
  },
  viral: {
    desc: 'A complete interaction: hook, context, reaction, leftover energy.',
    hook: 'It already has a beginning, middle, and face.',
    words: ['this', 'is', 'actually', 'insane', 'this', 'is', 'actually', 'insane'],
    emoji: '🚀',
  },
}

const TYPE_CYCLE = Object.keys(BEATS)

function scoreSet(rng, bias = 0) {
  const base = 72 + Math.floor(rng() * 24) + bias
  const viral = clamp(base + Math.floor(rng() * 6) - 2, 74, 98)
  return {
    viral,
    hook: clamp(viral + Math.floor(rng() * 8) - 6, 62, 99),
    emotion: clamp(60 + Math.floor(rng() * 36), 55, 98),
    conversation: clamp(58 + Math.floor(rng() * 38), 52, 97),
    reaction: clamp(64 + Math.floor(rng() * 34), 58, 99),
    context: clamp(70 + Math.floor(rng() * 26), 64, 98),
  }
}

function buildCaptions(words, duration, emoji, autoEmojis) {
  const usable = duration * 0.82
  const step = usable / Math.max(words.length, 1)
  return words.map((w, i) => ({
    id: `w${i}`,
    text: w,
    from: +(0.35 + i * step).toFixed(2),
    to: +(0.35 + (i + 1) * step).toFixed(2),
    emphasis: /^(what|no|insane|wait|look|over|crazy|stop|AHHH)$/i.test(w),
    emoji: autoEmojis && i === words.length - 1 ? emoji : '',
  }))
}

function headlineFrom(type, handle, variant = 0) {
  const bank = TITLES
  const map = {
    funny: 'funny',
    unexpected: 'curiosity',
    argument: 'dramatic',
    reaction: 'reaction',
    shocked: 'reaction',
    emotional: 'dramatic',
    statement: 'news',
    controversial: 'news',
    surprise: 'curiosity',
    win: 'viral',
    loss: 'funny',
    convo: 'funny',
    chat: 'viral',
    scream: 'reaction',
    energy: 'viral',
    story: 'curiosity',
    viral: 'viral',
  }
  const cat = map[type] || 'curiosity'
  const pair = bank[cat][variant % bank[cat].length]
  const line = pair[variant % 2]
  if (type === 'shocked' && variant % 3 === 0) {
    return `THEY ASKED ${handle.toUpperCase()} FOR PERMISSION TO GO`
  }
  return line
}

export function generateTitles(clip, streamer) {
  const handle = (streamer?.handle || 'streamer').toUpperCase()
  const type = clip.type || 'viral'
  const cats = ['curiosity', 'viral', 'news', 'funny', 'dramatic', 'reaction', 'short']
  return cats.map((cat, i) => {
    const bank = TITLES[cat]
    const pair = bank[i % bank.length]
    let text = pair[clip.rank % pair.length]
    if (cat === 'curiosity' && type === 'shocked') text = `SHE ASKED ${handle} FOR PERMISSION TO GO`
    if (cat === 'news') text = `WHAT ${handle} SAID NEXT`
    if (cat === 'short') text = pair[clip.rank % pair.length]
    return { id: cat, category: cat, text }
  })
}

export function buildStreamMeta(parsed, seedExtra = '') {
  const ident = identityFromHandle(parsed.handle)
  const rng = seeded(parsed.url + seedExtra)
  const hours = parsed.kind === 'clip' ? 0 : 2 + Math.floor(rng() * 5)
  const mins = Math.floor(rng() * 56) + 4
  const duration = parsed.kind === 'clip' ? 45 + Math.floor(rng() * 40) : hours * 3600 + mins * 60
  const daysAgo = Math.floor(rng() * 9)
  const date = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rng() * 8) * 3600000)
  const potential = parsed.kind === 'clip' ? 1 : 8 + Math.floor(rng() * 14)
  return {
    ...ident,
    url: parsed.url,
    kind: parsed.kind,
    videoId: parsed.videoId,
    duration,
    date: date.toISOString(),
    viewers: ident.viewers + Math.floor(rng() * 4000) - 1200,
    potential,
    thumbnail: ident.frames[0],
    frames: ident.frames,
  }
}

export function generateMoments(meta, opts = {}) {
  const {
    count = 8,
    length = 'auto',
    ai = { autoEmojis: true, intensity: 'balanced', detection: {} },
  } = opts
  const rng = seeded(meta.url + '|' + count + '|' + length)
  const enabled = Object.entries(ai.detection || {})
    .filter(([, v]) => v)
    .map(([k]) => k)
  const types = TYPE_CYCLE.filter((t) => {
    if (!enabled.length) return true
    if (t === 'win' || t === 'loss' || t === 'scream' || t === 'energy') return enabled.includes('gaming') || enabled.includes('energy')
    if (t === 'argument' || t === 'controversial') return enabled.includes('drama') || enabled.includes('newsworthy')
    if (t === 'emotional') return enabled.includes('emotional')
    if (t === 'convo' || t === 'story' || t === 'statement') return enabled.includes('conversation') || enabled.includes('newsworthy')
    if (t === 'funny') return enabled.includes('funny')
    if (t === 'reaction' || t === 'shocked' || t === 'surprise') return enabled.includes('reaction')
    return true
  })
  const pool = types.length ? types : TYPE_CYCLE
  const moments = []
  const used = new Set()
  const span = Math.max(meta.duration - 90, 90)

  for (let i = 0; i < count; i++) {
    const type = pool[i % pool.length]
    const beat = BEATS[type]
    let start = Math.floor(rng() * span) + 18
    let guard = 0
    while ([...used].some((t) => Math.abs(t - start) < 40) && guard++ < 20) {
      start = Math.floor(rng() * span) + 18
    }
    used.add(start)
    const peakPad = 6 + Math.floor(rng() * 7)
    const afterPad = 7 + Math.floor(rng() * 10)
    const natural = peakPad + afterPad + 8 + Math.floor(rng() * 10)
    let dur
    if (length === 'auto') dur = clamp(natural, 18, 54)
    else dur = Number(length)
    const contextBefore = length === 'auto' ? peakPad : Math.min(8, Math.floor(dur * 0.28))
    const clipStart = Math.max(0, start - contextBefore)
    const clipEnd = Math.min(meta.duration, clipStart + dur)
    const scores = scoreSet(rng, i === 0 ? 6 : Math.max(0, 4 - i))
    const variant = Math.floor(rng() * 6)
    const headline = headlineFrom(type, meta.handle, variant)
    const words = beat.words
    const captions = buildCaptions(words, clipEnd - clipStart, beat.emoji, ai.autoEmojis !== false)
    const typeMeta = MOMENT_TYPES.find((m) => m.id === type) || MOMENT_TYPES[0]
    moments.push({
      id: uid('clip'),
      rank: i + 1,
      type,
      typeLabel: typeMeta.label,
      emoji: typeMeta.emoji,
      viralScore: scores.viral,
      metrics: {
        hook: scores.hook,
        emotion: scores.emotion,
        conversation: scores.conversation,
        reaction: scores.reaction,
        context: scores.context,
      },
      description: beat.desc,
      hook: beat.hook,
      headline,
      titles: [],
      start: clipStart,
      end: clipEnd,
      duration: clipEnd - clipStart,
      suggested: `${fmtTime(clipStart)} → ${fmtTime(clipEnd)}`,
      peak: start,
      transcript: words.join(' '),
      captions,
      captionOn: true,
      captionStyle: 'bold-viral',
      favorite: false,
      exported: false,
      status: 'ready',
      version: 1,
      headlineSettings: {
        font: 'Bebas Neue',
        size: 54,
        weight: 700,
        align: 'center',
        background: '#ffffff',
        color: '#0a0a0a',
        radius: 18,
        shadow: true,
        y: 4.6,
        emoji: ai.autoEmojis !== false,
        lines: 2,
      },
      videoSettings: {
        zoom: 1.04,
        reframeX: 0,
        reframeY: 0,
        blur: 22,
        darken: 0.42,
        saturate: 0.72,
        vignette: 0.55,
        kenBurns: true,
        faceTrack: true,
      },
      branding: {
        enabled: true,
        left: 'KICK',
        right: `KICK.COM/${meta.handle.toUpperCase()}`,
        height: 8.6,
        color: '#050505',
      },
      audio: { gain: 1, normalize: true, sfx: ai.intensity === 'aggressive' },
      effects: {
        jumpCuts: ai.intensity !== 'minimal',
        silenceRemoval: ai.silenceRemoval !== false,
        punchIns: ai.intensity !== 'minimal',
        freeze: false,
        intensity: ai.intensity || 'balanced',
      },
      exportPreset: 'tiktok',
    })
  }

  moments.sort((a, b) => b.viralScore - a.viralScore)
  moments.forEach((m, i) => {
    m.rank = i + 1
    m.titles = generateTitles(m, meta)
  })
  return moments
}

export function regenerateClip(clip, meta, ai = {}) {
  const rng = seeded(clip.id + '|' + clip.version + '|' + Date.now())
  const next = { ...clip, version: clip.version + 1, id: clip.id }
  const titles = generateTitles(clip, meta)
  next.headline = pick(rng, titles).text
  next.titles = titles
  next.captionStyle = pick(rng, CAPTION_STYLES).id
  next.videoSettings = {
    ...clip.videoSettings,
    zoom: 1 + rng() * 0.18,
    reframeX: Math.round((rng() - 0.5) * 12),
    reframeY: Math.round((rng() - 0.5) * 8),
  }
  next.headlineSettings = {
    ...clip.headlineSettings,
    size: 48 + Math.floor(rng() * 14),
    radius: 12 + Math.floor(rng() * 14),
  }
  const shift = Math.floor((rng() - 0.5) * 6)
  next.start = Math.max(0, clip.start + shift)
  next.end = Math.min(meta.duration || clip.end + 10, clip.end + shift)
  next.duration = next.end - next.start
  next.suggested = `${fmtTime(next.start)} → ${fmtTime(next.end)}`
  next.viralScore = clamp(clip.viralScore + Math.floor(rng() * 5) - 2, 76, 98)
  if (ai.autoEmojis === false) next.captions = clip.captions.map((c) => ({ ...c, emoji: '' }))
  return next
}

export function applyAutoEdit(clip, meta, styleId, brand, ai) {
  const edited = { ...clip }
  edited.status = 'edited'
  edited.captionOn = ai?.autoCaptions !== false
  edited.headlineSettings = { ...clip.headlineSettings }
  edited.videoSettings = {
    ...clip.videoSettings,
    faceTrack: ai?.autoReframe !== false,
    kenBurns: styleId !== 'clean' && styleId !== 'cinematic',
    zoom: styleId === 'meme' || styleId === 'gaming' ? 1.14 : styleId === 'cinematic' ? 1.02 : 1.06,
    blur: styleId === 'cinematic' ? 28 : 22,
  }
  edited.effects = {
    ...clip.effects,
    punchIns: styleId === 'meme' || styleId === 'gaming' || styleId === 'viral',
    jumpCuts: styleId !== 'cinematic' && styleId !== 'podcast',
    silenceRemoval: ai?.silenceRemoval !== false,
    intensity: styleId === 'meme' || styleId === 'gaming' ? 'aggressive' : styleId === 'clean' || styleId === 'cinematic' ? 'minimal' : 'balanced',
  }
  edited.captionStyle =
    styleId === 'gaming' ? 'gaming' :
    styleId === 'podcast' ? 'karaoke' :
    styleId === 'cinematic' ? 'minimal' :
    styleId === 'clean' || styleId === 'news' ? 'clean-white' : 'bold-viral'
  if (brand?.applyOnNew) {
    edited.branding = {
      ...clip.branding,
      enabled: brand.barEnabled !== false,
      left: brand.barLeft || 'KICK',
      right: brand.barRightMode === 'custom' && brand.customRight
        ? brand.customRight
        : `KICK.COM/${meta.handle.toUpperCase()}`,
      color: brand.barColor || '#050505',
      height: ((brand.barHeight || 86) / 1920) * 100,
    }
  }
  if (styleId === 'news') {
    edited.headlineSettings.background = '#f5f5f5'
    edited.headlineSettings.color = '#111'
  }
  if (styleId === 'cinematic') {
    edited.headlineSettings.background = 'rgba(0,0,0,0.0)'
    edited.headlineSettings.color = '#fff'
    edited.headlineSettings.shadow = false
  }
  if (ai?.autoTitle === false) {
    /* keep existing */
  }
  return edited
}

export function qualityGate(clip) {
  const m = clip.metrics
  const reasons = []
  if (m.hook < 62) reasons.push('Weak hook')
  if (m.context < 64) reasons.push('Incomplete context')
  if (m.reaction < 58 && m.emotion < 58) reasons.push('Low reaction / emotion')
  if (clip.duration < 8) reasons.push('Too short to land')
  if (clip.duration > 95) reasons.push('Overlong — dead air risk')
  return { pass: reasons.length === 0, reasons }
}

export function projectThumbHash(id) {
  return hashStr(id) % 4
}
