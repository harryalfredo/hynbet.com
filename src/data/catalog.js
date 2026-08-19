export const FRAMES = [
  '/demo/stream-frame-01.jpg',
  '/demo/stream-frame-02.jpg',
  '/demo/stream-frame-03.jpg',
  '/demo/stream-frame-04.jpg',
]

export const AVATARS = {
  kaiwest: '/demo/avatar-kai.jpg',
  lunapark: '/demo/avatar-luna.jpg',
  rexvoss: '/demo/avatar-rex.jpg',
  novaline: '/demo/avatar-nova.jpg',
}

export const STREAMER_PRESETS = {
  kaiwest: {
    name: 'Kai West',
    handle: 'kaiwest',
    avatar: AVATARS.kaiwest,
    title: 'ranked grind + irl stories — !clips !socials',
    category: 'Just Chatting',
    viewers: 18420,
    frames: [FRAMES[0], FRAMES[1]],
    accent: '#53FC18',
  },
  lunapark: {
    name: 'Luna Park',
    handle: 'lunapark',
    avatar: AVATARS.lunapark,
    title: 'late night just chatting · storytime',
    category: 'Just Chatting',
    viewers: 9210,
    frames: [FRAMES[2], FRAMES[3]],
    accent: '#fb7185',
  },
  rexvoss: {
    name: 'Rex Voss',
    handle: 'rexvoss',
    avatar: AVATARS.rexvoss,
    title: 'tournament finals — winner stays',
    category: 'First Person Shooter',
    viewers: 24110,
    frames: [FRAMES[1], FRAMES[0]],
    accent: '#22d3ee',
  },
  novaline: {
    name: 'Nova Line',
    handle: 'novaline',
    avatar: AVATARS.novaline,
    title: 'unfiltered convos + after dark takes',
    category: 'Podcasts',
    viewers: 13340,
    frames: [FRAMES[3], FRAMES[2]],
    accent: '#a78bfa',
  },
}

export const STYLE_PRESETS = [
  {
    id: 'viral',
    number: '01',
    name: 'Viral Kick',
    tag: 'Primary',
    blurb: 'White headline card, blurred fill, Kick bar. Built for For You pages.',
    intensity: 'Balanced',
    caption: 'bold-viral',
    accent: '#53FC18',
  },
  {
    id: 'clean',
    number: '02',
    name: 'Clean',
    tag: 'Minimal',
    blurb: 'Quiet professional vertical. Soft type, no loud chrome.',
    intensity: 'Minimal',
    caption: 'clean-white',
    accent: '#e4e4e7',
  },
  {
    id: 'news',
    number: '03',
    name: 'News',
    tag: 'Social news',
    blurb: 'Large headline energy with a broadcast lower-third.',
    intensity: 'Balanced',
    caption: 'clean-white',
    accent: '#ef4444',
  },
  {
    id: 'meme',
    number: '04',
    name: 'Meme',
    tag: 'High energy',
    blurb: 'Punch-ins, emphasis zooms, reaction text, meme pacing.',
    intensity: 'Aggressive',
    caption: 'bold-viral',
    accent: '#facc15',
  },
  {
    id: 'gaming',
    number: '05',
    name: 'Gaming',
    tag: 'High energy',
    blurb: 'Dynamic cuts, impact type, designed for clutch moments.',
    intensity: 'Aggressive',
    caption: 'gaming',
    accent: '#22d3ee',
  },
  {
    id: 'podcast',
    number: '06',
    name: 'Podcast',
    tag: 'Talk',
    blurb: 'Subtitle-heavy, readable, built for conversations.',
    intensity: 'Minimal',
    caption: 'karaoke',
    accent: '#c4b5fd',
  },
  {
    id: 'cinematic',
    number: '07',
    name: 'Cinematic',
    tag: 'Film',
    blurb: 'Sparse captions, letterbox feel, slow reframes.',
    intensity: 'Minimal',
    caption: 'minimal',
    accent: '#fdba74',
  },
  {
    id: 'custom',
    number: '08',
    name: 'Custom',
    tag: 'Yours',
    blurb: 'Start from Viral Kick and rebuild every layer.',
    intensity: 'Balanced',
    caption: 'bold-viral',
    accent: '#53FC18',
  },
]

export const CAPTION_STYLES = [
  { id: 'bold-viral', name: 'Bold Viral', weight: 800, fill: '#ffffff', stroke: '#111111', highlight: '#53FC18', size: 42, emoji: true },
  { id: 'clean-white', name: 'Clean White', weight: 600, fill: '#ffffff', stroke: 'transparent', highlight: '#ffffff', size: 36, emoji: false },
  { id: 'karaoke', name: 'Karaoke', weight: 700, fill: '#d4d4d8', stroke: '#111111', highlight: '#53FC18', size: 38, emoji: false },
  { id: 'gaming', name: 'Gaming', weight: 800, fill: '#f4f4f5', stroke: '#06140a', highlight: '#22d3ee', size: 40, emoji: true },
  { id: 'minimal', name: 'Minimal', weight: 500, fill: '#fafafa', stroke: 'transparent', highlight: '#fafafa', size: 30, emoji: false },
]

export const HEADLINE_FONTS = ['Bebas Neue', 'Anton', 'Oswald', 'Impact', 'Outfit', 'Inter']

export const MOMENT_TYPES = [
  { id: 'funny', label: 'Funny moments', emoji: '😂' },
  { id: 'unexpected', label: 'Unexpected moments', emoji: '🤯' },
  { id: 'argument', label: 'Arguments', emoji: '🔥' },
  { id: 'reaction', label: 'Reactions', emoji: '😱' },
  { id: 'shocked', label: 'Shocked reactions', emoji: '😭' },
  { id: 'emotional', label: 'Emotional moments', emoji: '💔' },
  { id: 'statement', label: 'Important statements', emoji: '🎙️' },
  { id: 'controversial', label: 'Controversial moments', emoji: '⚡' },
  { id: 'surprise', label: 'Surprising moments', emoji: '👀' },
  { id: 'win', label: 'Major wins', emoji: '🏆' },
  { id: 'loss', label: 'Losses / fails', emoji: '💀' },
  { id: 'convo', label: 'Funny conversations', emoji: '💬' },
  { id: 'chat', label: 'Chat reactions', emoji: '📈' },
  { id: 'scream', label: 'Sudden screaming', emoji: '📢' },
  { id: 'energy', label: 'High-energy moments', emoji: '⚡' },
  { id: 'story', label: 'Storytelling moments', emoji: '📖' },
  { id: 'viral', label: 'Viral-worthy interactions', emoji: '🚀' },
]

export const DETECTION_TOGGLES = [
  { id: 'funny', label: 'Funny' },
  { id: 'drama', label: 'Drama' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'newsworthy', label: 'Newsworthy' },
  { id: 'energy', label: 'High energy' },
  { id: 'custom', label: 'Custom' },
]

export const ANALYSIS_STAGES = [
  { id: 'fetch', label: 'Fetching stream information…', hint: 'Reading public metadata' },
  { id: 'transcript', label: 'Analyzing transcript…', hint: 'Speech, overlap, emphasis' },
  { id: 'reactions', label: 'Detecting reactions…', hint: 'Face, voice, chat spikes' },
  { id: 'energy', label: 'Finding high-energy moments…', hint: 'Audio peaks + motion' },
  { id: 'rank', label: 'Ranking viral potential…', hint: 'Hook, payoff, completeness' },
  { id: 'select', label: 'Selecting best moments…', hint: 'Quality over volume' },
]

export const EDIT_STAGES = [
  { id: 'analyze', label: 'Analyzing stream' },
  { id: 'conversation', label: 'Understanding conversation' },
  { id: 'reactions', label: 'Detecting reactions' },
  { id: 'ranking', label: 'Ranking moments' },
  { id: 'hooks', label: 'Writing hooks' },
  { id: 'captions', label: 'Creating captions' },
  { id: 'reframe', label: 'Reframing video' },
  { id: 'template', label: 'Applying template' },
  { id: 'render', label: 'Rendering clip' },
  { id: 'ready', label: 'Ready' },
]

export const JOB_FLOW = ['queued', 'analyzing', 'editing', 'rendering', 'complete']

export const CLIP_COUNTS = [1, 3, 5, 10, 20]
export const CLIP_LENGTHS = [
  { id: 15, label: '15 seconds' },
  { id: 30, label: '30 seconds' },
  { id: 45, label: '45 seconds' },
  { id: 60, label: '60 seconds' },
  { id: 90, label: '90 seconds' },
  { id: 'auto', label: 'Auto' },
]

export const EXPORT_PRESETS = [
  { id: 'tiktok', name: 'TikTok', w: 1080, h: 1920, fps: 30, bitrate: 8 },
  { id: 'reels', name: 'Instagram Reels', w: 1080, h: 1920, fps: 30, bitrate: 8 },
  { id: 'shorts', name: 'YouTube Shorts', w: 1080, h: 1920, fps: 30, bitrate: 10 },
  { id: 'fb', name: 'Facebook Reels', w: 1080, h: 1920, fps: 30, bitrate: 8 },
  { id: 'kick', name: 'Kick Clips', w: 1080, h: 1920, fps: 30, bitrate: 8 },
]

export const DEFAULT_BRAND = {
  name: 'My Viral Template',
  logo: '',
  watermark: '',
  font: 'Bebas Neue',
  backgrounds: [],
  intro: '',
  outro: '',
  handles: { kick: '', tiktok: '', instagram: '', youtube: '' },
  barEnabled: true,
  barColor: '#050505',
  barHeight: 86,
  barLeft: 'KICK',
  barRightMode: 'handle',
  customRight: '',
  applyOnNew: true,
}

export const DEFAULT_AI = {
  detection: {
    funny: true,
    drama: true,
    reaction: true,
    gaming: true,
    emotional: true,
    conversation: true,
    newsworthy: true,
    energy: true,
    custom: false,
  },
  intensity: 'balanced',
  autoTitle: true,
  autoCaptions: true,
  autoReframe: true,
  silenceRemoval: true,
  autoEmojis: true,
}

export const LAYOUT_ELEMENTS = [
  { id: 'background', label: 'Background', lock: true },
  { id: 'video', label: 'Video', lock: false },
  { id: 'headline', label: 'Headline', lock: false },
  { id: 'captions', label: 'Captions', lock: false },
  { id: 'logo', label: 'Logo', lock: false },
  { id: 'watermark', label: 'Watermark', lock: false },
  { id: 'bar', label: 'Bottom bar', lock: false },
  { id: 'handle', label: 'Social handle', lock: false },
  { id: 'progress', label: 'Progress bar', lock: false },
  { id: 'emoji', label: 'Emoji', lock: false },
  { id: 'text', label: 'Text', lock: false },
]

export const DEFAULT_LAYOUT = {
  background: { on: true, x: 0, y: 0, w: 100, h: 100 },
  video: { on: true, x: 8, y: 24, w: 84, h: 52 },
  headline: { on: true, x: 6, y: 4.2, w: 88, h: 16 },
  captions: { on: true, x: 8, y: 68, w: 84, h: 12 },
  logo: { on: false, x: 6, y: 88, w: 16, h: 6 },
  watermark: { on: false, x: 78, y: 88, w: 16, h: 6 },
  bar: { on: true, x: 0, y: 91.2, w: 100, h: 8.8 },
  handle: { on: true, x: 38, y: 93, w: 58, h: 5 },
  progress: { on: false, x: 0, y: 90.4, w: 100, h: 0.8 },
  emoji: { on: false, x: 78, y: 20, w: 16, h: 8 },
  text: { on: false, x: 10, y: 80, w: 80, h: 6 },
}

export function identityFromHandle(handle) {
  const key = String(handle || '').toLowerCase()
  if (STREAMER_PRESETS[key]) return { ...STREAMER_PRESETS[key] }
  const keys = Object.keys(STREAMER_PRESETS)
  const idx = Math.abs(key.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % keys.length
  const base = STREAMER_PRESETS[keys[idx]]
  const pretty = key.replace(/[_\d]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Streamer'
  return {
    ...base,
    name: pretty,
    handle: key,
    title: `${pretty} · live on Kick`,
  }
}
