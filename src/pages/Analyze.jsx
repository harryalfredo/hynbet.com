import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, subscribeJob } from '../lib/api'
import { Button } from '../components/ui/primitives'

const ORDER = [
  'QUEUED',
  'FETCHING_SOURCE',
  'DOWNLOADING',
  'PROBING_VIDEO',
  'EXTRACTING_AUDIO',
  'TRANSCRIBING',
  'ANALYZING',
  'DETECTING_MOMENTS',
  'GENERATING_TITLES',
  'GENERATING_CAPTIONS',
  'GENERATING_CLIPS',
  'RENDERING',
  'UPLOADING',
  'COMPLETED',
]

const LABELS = {
  QUEUED: 'Queued',
  FETCHING_SOURCE: 'Resolving source',
  DOWNLOADING: 'Obtaining media',
  PROBING_VIDEO: 'Video metadata extracted',
  EXTRACTING_AUDIO: 'Audio extracted',
  TRANSCRIBING: 'Transcript generated',
  ANALYZING: 'Audio / scene analysis',
  DETECTING_MOMENTS: 'Finding best moments',
  GENERATING_TITLES: 'Writing headlines',
  GENERATING_CAPTIONS: 'Building captions',
  GENERATING_CLIPS: 'Cutting clips',
  RENDERING: 'Rendering 9:16',
  UPLOADING: 'Storing outputs',
  COMPLETED: 'Ready',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
}

export default function Analyze() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [job, setJob] = useState(null)
  const [project, setProject] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let stop = () => {}
    let poll
    const pull = async () => {
      try {
        const p = await api.project(id)
        setProject(p.project)
        if (p.job) setJob(p.job)
        if (p.job?.status === 'COMPLETED') nav(`/project/${id}/results`)
      } catch (e) {
        setErr(e.message)
      }
    }
    pull()
    const jobId = params.get('job')
    if (jobId) {
      stop = subscribeJob(jobId, (ev) => {
        setJob(ev)
        if (ev.status === 'COMPLETED') nav(`/project/${id}/results`)
      })
    }
    poll = setInterval(pull, 2000)
    return () => {
      stop()
      clearInterval(poll)
    }
  }, [id, params, nav])

  const idx = useMemo(() => Math.max(0, ORDER.indexOf(job?.currentStep || job?.status || 'QUEUED')), [job])

  if (err && !project) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold">Project not found</h1>
          <Button className="mt-4" onClick={() => nav('/new')}>Use another link</Button>
        </div>
      </div>
    )
  }

  if (job?.status === 'FAILED') {
    return (
      <div className="min-h-[70vh] grid place-items-center px-6">
        <div className="max-w-lg text-center">
          <div className="text-[11px] tracking-[0.2em] text-red-300">{job.errorCode || 'FAILED'}</div>
          <h1 className="text-3xl font-semibold mt-3">{job.message || 'Processing failed'}</h1>
          <p className="text-zinc-400 text-sm mt-3">{job.error}</p>
          <div className="flex justify-center gap-2 mt-6">
            <Button onClick={() => api.reprocess(id).then((r) => nav(`/analyze/${id}?job=${r.jobId}`))}>Try again</Button>
            <Button variant="ghost" onClick={() => nav('/new')}>Use another link</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-10">
      <div>
        <div className="text-[11px] tracking-[0.22em] uppercase text-zinc-500">HYNBET AI is analyzing your stream</div>
        <h1 className="text-3xl font-semibold mt-2">Real worker progress</h1>
        <p className="text-zinc-400 text-sm mt-2">
          {project?.sourceKind === 'dev-sample'
            ? 'Development sample — this is not a Kick VOD.'
            : project?.sourceUrl}
        </p>
        <div className="mt-6 rounded-3xl hairline bg-ink-850 p-4 text-[13px] space-y-2">
          <Row k="Streamer" v={project?.streamer || '—'} />
          <Row k="Title" v={project?.title || '—'} />
          <Row k="Duration" v={project?.duration ? `${project.duration.toFixed(1)}s` : 'probing…'} />
          <Row k="Job" v={job?.jobId || params.get('job')} />
          <Row k="Stage" v={job?.currentStep || 'QUEUED'} />
        </div>
        {job?.jobId && (
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => api.cancel(job.jobId).then(() => nav('/dashboard'))}
          >
            Cancel processing
          </Button>
        )}
      </div>
      <div className="rounded-3xl glass p-6">
        <div className="flex justify-between text-[12px] text-zinc-500">
          <span>{job?.message || 'Waiting for worker'}</span>
          <span className="font-mono text-zinc-200">{job?.progress || 0}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-ink-700 overflow-hidden">
          <div className="h-full bg-lime transition-all" style={{ width: `${job?.progress || 0}%` }} />
        </div>
        <ol className="mt-8 space-y-2">
          {ORDER.map((s, i) => {
            const done = i < idx || job?.status === 'COMPLETED'
            const on = i === idx && job?.status !== 'COMPLETED'
            return (
              <li key={s} className="flex gap-3 items-center text-sm">
                <span
                  className={`h-5 w-5 rounded-full grid place-items-center text-[10px] ${
                    done ? 'bg-lime text-ink-950' : on ? 'bg-lime/20 text-lime ring-1 ring-lime/40' : 'bg-ink-700 text-zinc-600'
                  }`}
                >
                  {done ? '✓' : on ? '●' : '○'}
                </span>
                <span className={done || on ? 'text-white' : 'text-zinc-600'}>{LABELS[s]}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{k}</span>
      <span className="text-right truncate max-w-[240px]">{v}</span>
    </div>
  )
}
