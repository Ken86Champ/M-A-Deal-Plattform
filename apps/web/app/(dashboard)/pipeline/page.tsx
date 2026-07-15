'use client'
import { useRef, useState } from 'react'
import { Play, Square, RefreshCw, Zap, Search, TrendingUp, LayoutList } from 'lucide-react'

type Stage = 'process' | 'all' | 'radar' | 'enrichment' | 'scoring'
type RunState = 'idle' | 'running' | 'done' | 'error'

const STAGES: { id: Stage; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    id:    'process',
    label: 'Verarbeiten',
    desc:  'Bestehende Firmen anreichern + scoren (kein neuer Scan). Ideal nach erstem Import.',
    icon:  <Zap size={15} />,
    color: 'var(--go)',
  },
  {
    id:    'all',
    label: 'Alles ausführen',
    desc:  'Vollständige Pipeline: Radar (Zefix + Broker) → Anreichern → Scoren → Dossier',
    icon:  <Play size={15} />,
    color: 'var(--l2)',
  },
  {
    id:    'radar',
    label: 'Radar (nur Scan)',
    desc:  'Neue Firmen aus Zefix + companymarket.ch + firmenboerse.com einlesen (kein Scoring)',
    icon:  <Search size={15} />,
    color: 'var(--l1)',
  },
  {
    id:    'enrichment',
    label: 'Anreichern',
    desc:  'Websites besuchen, Inhaberdaten + Kennzahlen extrahieren (Claude Haiku)',
    icon:  <RefreshCw size={15} />,
    color: 'var(--amber)',
  },
  {
    id:    'scoring',
    label: 'Scoren',
    desc:  'Nachfolge- & Investierbarkeits-Score berechnen, KO-Gates setzen',
    icon:  <TrendingUp size={15} />,
    color: 'var(--amber)',
  },
]

export default function PipelinePage() {
  const [runState,   setRunState]   = useState<RunState>('idle')
  const [activeStage, setActiveStage] = useState<Stage | null>(null)
  const [logs,       setLogs]       = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const logBoxRef = useRef<HTMLDivElement>(null)

  async function startStage(stage: Stage) {
    if (runState === 'running') return

    setLogs([])
    setRunState('running')
    setActiveStage(stage)

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/pipeline/run?stage=${stage}`, {
        signal: abortRef.current.signal,
      })

      if (!res.body) {
        setLogs(['[Kein Stream erhalten]'])
        setRunState('error')
        return
      }

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let   buf    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.replace(/^data:\s?/, '').trim()
          if (line) {
            setLogs(prev => {
              const next = [...prev, line]
              // Auto-scroll
              setTimeout(() => {
                if (logBoxRef.current) {
                  logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
                }
              }, 0)
              return next
            })
          }
        }
      }

      setRunState('done')
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setLogs(prev => [...prev, '[Abgebrochen]'])
        setRunState('idle')
      } else {
        setLogs(prev => [...prev, `[Fehler: ${e?.message}]`])
        setRunState('error')
      }
    } finally {
      setActiveStage(null)
    }
  }

  function abort() {
    abortRef.current?.abort()
  }

  const stateColor = runState === 'done'    ? 'var(--go)'
                   : runState === 'error'   ? 'var(--red)'
                   : runState === 'running' ? 'var(--amber)'
                   : 'var(--muted)'

  const stateLabel = runState === 'done'    ? 'Abgeschlossen'
                   : runState === 'error'   ? 'Fehler'
                   : runState === 'running' ? `Läuft: ${activeStage ?? '…'}`
                   : 'Bereit'

  return (
    <div className="max-w-[900px] mx-auto px-6 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
          Pipeline
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
          Firmen anreichern, scoren und qualifizieren. Läuft täglich automatisch (06:00–09:00 Uhr).
        </p>
      </div>

      {/* Stage cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {STAGES.map(s => (
          <button
            key={s.id}
            onClick={() => startStage(s.id)}
            disabled={runState === 'running'}
            className="text-left rounded-xl px-4 py-3.5 transition-all group"
            style={{
              background:  'var(--panel)',
              border:      `1px solid ${runState === 'running' && activeStage === s.id ? s.color : 'var(--line)'}`,
              opacity:     runState === 'running' && activeStage !== s.id ? 0.5 : 1,
              cursor:      runState === 'running' ? 'not-allowed' : 'pointer',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                {s.label}
              </span>
              {runState === 'running' && activeStage === s.id && (
                <span
                  className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded animate-pulse"
                  style={{ background: s.color + '22', color: s.color }}
                >
                  läuft…
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              {s.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Log window */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        {/* Log toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2">
            <LayoutList size={12} style={{ color: 'var(--muted)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
              Log
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: stateColor, background: stateColor + '18' }}
            >
              {stateLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {runState === 'running' && (
              <button
                onClick={abort}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors"
                style={{ color: 'var(--red)', border: '1px solid var(--line)', background: 'transparent' }}
              >
                <Square size={10} />
                Abbrechen
              </button>
            )}
            {logs.length > 0 && runState !== 'running' && (
              <button
                onClick={() => setLogs([])}
                className="text-[11px] px-2.5 py-1 rounded-md transition-colors"
                style={{ color: 'var(--muted)', border: '1px solid var(--line)', background: 'transparent' }}
              >
                Leeren
              </button>
            )}
          </div>
        </div>

        {/* Log content */}
        <div
          ref={logBoxRef}
          className="font-mono text-[11px] leading-relaxed p-4 overflow-y-auto"
          style={{
            height:     '420px',
            color:      'var(--ink)',
            background: '#0f1012',
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: '#555' }}>
              Wähle eine Stage um die Pipeline zu starten…
            </span>
          ) : (
            logs.map((line, i) => {
              const isWarn  = /\[(WARNING|WARN)\]/.test(line)
              const isError = /\[(ERROR|CRITICAL)\]/.test(line) || line.startsWith('[Fehler')
              const isDone  = line.startsWith('[Pipeline beendet') || line.startsWith('[Verarbeitung') || line.startsWith('[Pipeline: Stage')
              const color   = isError ? '#f87171'
                            : isWarn  ? '#fbbf24'
                            : isDone  ? '#86efac'
                            : '#d1d5db'
              return (
                <div key={i} style={{ color }}>
                  {line}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Info box */}
      <div
        className="rounded-xl px-4 py-3 text-[11px] leading-relaxed"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}
      >
        <strong style={{ color: 'var(--ink)' }}>Tipp:</strong> Beim ersten Start → "Verarbeiten" klicken (enrichment + scoring der bestehenden Firmen).{' '}
        Danach erscheinen qualifizierte Firmen automatisch in der Qualified-Liste.{' '}
        Tägliche Automatisierung läuft über Inngest-Crons (06:00–09:00).
      </div>
    </div>
  )
}
