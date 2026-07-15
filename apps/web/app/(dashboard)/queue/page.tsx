'use client'
import { useEffect, useState } from 'react'
import { Check, X, Mail, FileText, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SourceDot } from '@/components/SourceDot'

interface OutreachItem {
  id: string
  company_id: string
  status: 'pending' | 'approved' | 'sent' | 'replied'
  kanal: 'brief' | 'email' | null
  letter_draft: string | null
  follow_up_due: string | null
  created_at: string
  companies?: {
    name: string
    canton: string | null
    branche: string | null
  }
}

export default function QueuePage() {
  const [items,   setItems]   = useState<OutreachItem[]>([])
  const [loading, setLoading] = useState(true)
  const [active,  setActive]  = useState<OutreachItem | null>(null)
  const [acting,  setActing]  = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/outreach?status=pending')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    await fetch('/api/outreach', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, action }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
    if (active?.id === id) setActive(null)
    setActing(null)
  }

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">

      {/* Left: queue list */}
      <aside
        className="w-80 flex-none flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}
      >
        <div className="px-4 py-3 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
            Morning Queue
          </p>
          <p className="text-[18px] font-bold text-ink mt-0.5">
            {loading ? '…' : items.length} ausstehend
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-[12px]" style={{ color: 'var(--muted)' }}>Laden…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <Check size={32} className="mx-auto" style={{ color: 'var(--go)' }} />
              <p className="text-[13px] font-medium text-ink">Queue leer</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Alle Briefe sind genehmigt oder abgelehnt.
              </p>
            </div>
          ) : (
            items.map(item => (
              <button
                key={item.id}
                onClick={() => setActive(item)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background:   active?.id === item.id ? 'var(--bg)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-ink">
                      {item.companies?.name ?? item.company_id}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        {item.companies?.canton ?? '–'}
                      </span>
                      {item.kanal && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--l2-soft)', color: 'var(--l2)' }}>
                          {item.kanal === 'brief' ? '✉ Brief' : '@ E-Mail'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right: letter preview + actions */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <FileText size={40} className="mx-auto" style={{ color: 'var(--grey)' }} />
              <p className="text-[14px]" style={{ color: 'var(--muted)' }}>
                Brief aus der Liste auswählen
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-3 flex-none"
              style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}
            >
              <div>
                <p className="text-[15px] font-semibold text-ink">
                  {active.companies?.name ?? active.company_id}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  {[active.companies?.canton, active.companies?.branche].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={acting === active.id}
                  onClick={() => act(active.id, 'reject')}
                  className="flex items-center gap-1.5"
                  style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                >
                  <X size={13} />
                  Ablehnen
                </Button>
                <Button
                  variant="l1"
                  size="sm"
                  disabled={acting === active.id}
                  onClick={() => act(active.id, 'approve')}
                  className="flex items-center gap-1.5"
                >
                  <Check size={13} />
                  Genehmigen
                </Button>
              </div>
            </div>

            {/* Letter preview */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div
                className="max-w-[640px] mx-auto rounded-2xl p-8"
                style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
              >
                {/* Letter header decoration */}
                <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                    Briefentwurf — Teil 2 · Für Inhaber · Kein Preis · Kein Score
                  </p>
                </div>

                {active.letter_draft ? (
                  <div
                    className="text-[14px] leading-relaxed whitespace-pre-wrap text-ink"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {active.letter_draft}
                  </div>
                ) : (
                  <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
                    Kein Briefentwurf vorhanden.
                  </p>
                )}

                {/* Footer rule */}
                <div
                  className="mt-8 pt-4 text-[10px]"
                  style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)' }}
                >
                  Outreach wird nie automatisch versandt — Genehmigung in dieser Queue erforderlich.
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
