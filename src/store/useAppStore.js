import { create } from 'zustand'
import { api } from '../lib/api'

const DEFAULT_BRAND = {
  name: 'My Viral Template',
  logo: '',
  watermark: '',
  font: 'Bebas Neue',
  intro: '',
  handles: { kick: '', tiktok: '', instagram: '', youtube: '' },
  barLeft: 'KICK',
  customRight: '',
  barRightMode: 'handle',
  barHeight: 86,
  barEnabled: true,
  applyOnNew: true,
}

export const useAppStore = create((set, get) => ({
  user: { name: 'HYNBET Studio', plan: 'Local', initials: 'HY' },
  health: null,
  brand: DEFAULT_BRAND,
  templates: [],
  setBrand: (patch) => set((s) => ({ brand: { ...s.brand, ...patch } })),
  saveTemplate: (tpl) => set((s) => ({ templates: [{ id: `tpl_${Date.now()}`, ...tpl }, ...s.templates] })),
  deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
  toasts: [],
  toast: (t) => {
    const item = { id: Math.random().toString(36).slice(2), at: Date.now(), ...t }
    set((s) => ({ toasts: [...s.toasts.slice(-4), item] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== item.id) })), t.ttl || 5000)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  loadHealth: async () => {
    try {
      const health = await api.health()
      set({ health })
      return health
    } catch {
      return null
    }
  },
}))
