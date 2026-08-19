import { useAppStore } from '../store/useAppStore'
import { Button, Field, Input, Toggle } from '../components/ui/primitives'
import { fileToDataUrl } from '../lib/utils'

export default function BrandKit() {
  const brand = useAppStore((s) => s.brand)
  const setBrand = useAppStore((s) => s.setBrand)
  const toast = useAppStore((s) => s.toast)

  const up = (key) => async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = await fileToDataUrl(f)
    setBrand({ [key]: url })
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold">Brand kit</h1>
      <p className="text-zinc-400 text-sm mt-1">Saved as a reusable preset and applied to every new stream.</p>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl hairline bg-ink-850 p-5 space-y-4">
          <Field label="Preset name">
            <Input value={brand.name} onChange={(e) => setBrand({ name: e.target.value })} />
          </Field>
          <Field label="Logo">
            <input type="file" accept="image/*" onChange={up('logo')} />
            {brand.logo && <img src={brand.logo} alt="" className="mt-2 h-12 object-contain" />}
          </Field>
          <Field label="Watermark">
            <input type="file" accept="image/*" onChange={up('watermark')} />
          </Field>
          <Field label="Custom font name">
            <Input value={brand.font} onChange={(e) => setBrand({ font: e.target.value })} />
          </Field>
          <Field label="Intro / outro notes">
            <Input placeholder="2s sting, no voiceover" value={brand.intro} onChange={(e) => setBrand({ intro: e.target.value })} />
          </Field>
        </div>
        <div className="rounded-3xl hairline bg-ink-850 p-5 space-y-4">
          <Field label="Kick handle">
            <Input value={brand.handles.kick} onChange={(e) => setBrand({ handles: { ...brand.handles, kick: e.target.value } })} />
          </Field>
          <Field label="TikTok">
            <Input value={brand.handles.tiktok} onChange={(e) => setBrand({ handles: { ...brand.handles, tiktok: e.target.value } })} />
          </Field>
          <Field label="Instagram">
            <Input value={brand.handles.instagram} onChange={(e) => setBrand({ handles: { ...brand.handles, instagram: e.target.value } })} />
          </Field>
          <Field label="YouTube">
            <Input value={brand.handles.youtube} onChange={(e) => setBrand({ handles: { ...brand.handles, youtube: e.target.value } })} />
          </Field>
          <Field label="Bar left">
            <Input value={brand.barLeft} onChange={(e) => setBrand({ barLeft: e.target.value })} />
          </Field>
          <Field label="Custom bar text">
            <Input value={brand.customRight} onChange={(e) => setBrand({ customRight: e.target.value, barRightMode: 'custom' })} />
          </Field>
          <Field label="Bar height (px)">
            <input type="range" className="range w-full" min={56} max={120} value={brand.barHeight}
              onChange={(e) => setBrand({ barHeight: Number(e.target.value) })} />
          </Field>
          <Toggle checked={brand.barEnabled} onChange={(v) => setBrand({ barEnabled: v })} label="Show branding bar" />
          <Toggle checked={brand.applyOnNew} onChange={(v) => setBrand({ applyOnNew: v })} label="Auto-apply on new streams" />
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={() => toast({ title: `Saved “${brand.name}”`, body: 'Will apply on the next analyze.', tone: 'ok' })}>
          Save preset
        </Button>
      </div>
    </div>
  )
}
