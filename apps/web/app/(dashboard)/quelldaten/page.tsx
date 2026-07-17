'use client'
import { Database, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'

const SOURCES = [
  {
    id: 'zefix',
    name: 'Zefix — Handelsregister',
    type: 'Off-Market',
    typeColor: 'var(--l1)',
    desc: 'Amtliche Handelsregisterdaten der Schweiz. Delta-Scan auf VR-Rücktritt, Inhaberwechsel, Löschungen.',
    lastRun: 'Heute 06:12',
    status: 'ok',
    count: 612,
    fields: ['Firmenname', 'Rechtsform', 'Kanton', 'Gründungsdatum', 'UID', 'Publikationen'],
  },
  {
    id: 'shab',
    name: 'SHAB — Schweiz. Handelsamtsblatt',
    type: 'Off-Market',
    typeColor: 'var(--l1)',
    desc: 'Amtliche Publikationen: VR-Rücktritt, Kapitalerhöhungen, Liquidationen, Erbgänge.',
    lastRun: 'Heute 06:14',
    status: 'ok',
    count: 98,
    fields: ['Publikationstext', 'Datum', 'Handelsregister-Nr.', 'Ereignistyp'],
  },
  {
    id: 'companymarket',
    name: 'companymarket.ch',
    type: 'On-Market',
    typeColor: 'var(--l2)',
    desc: 'Grösste Schweizer Plattform für KMU-Inserate. Inhaber inseriert aktiv — explizite Verkaufsbereitschaft.',
    lastRun: 'Heute 07:01',
    status: 'ok',
    count: 184,
    fields: ['Titel', 'Branche', 'Umsatz (Bereich)', 'Kanton', 'Beschreibung', 'Inserats-URL'],
  },
  {
    id: 'firmenboerse',
    name: 'firmenboerse.com',
    type: 'On-Market',
    typeColor: 'var(--l2)',
    desc: 'DACH-weite Firmenbörse, Schweizer Inserate gefiltert. Ergänzt companymarket.ch.',
    lastRun: 'Heute 07:03',
    status: 'ok',
    count: 106,
    fields: ['Titel', 'Branche', 'Region', 'Kaufpreis (wenn angegeben)', 'Inserats-URL'],
  },
  {
    id: 'enrichment',
    name: 'Web-Enrichment (Claude Haiku)',
    type: 'Anreicherung',
    typeColor: 'var(--amber)',
    desc: 'Besucht Firmenwebsites, extrahiert Inhabernamen, Gründungsjahr, EBITDA-Schätzung, Teamgrösse.',
    lastRun: 'Heute 07:45',
    status: 'warn',
    count: 780,
    fields: ['Inhabername', 'Website-Datum', 'Mitarbeiterschätzung', 'EBITDA-Marge (B)', 'Branche (verfeinert)'],
  },
]

const STATUS_MAP = {
  ok:   { icon: CheckCircle, color: 'var(--go)',   label: 'Aktiv' },
  warn: { icon: AlertCircle, color: 'var(--amber)', label: 'Teilweise' },
  err:  { icon: AlertCircle, color: 'var(--red)',   label: 'Fehler' },
}

export default function QuelldatenPage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-[10px] font-semibold tracking-widest uppercase mb-1"
            style={{ color: 'var(--muted)' }}
          >
            Origination · Datenquellen
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            Quelldaten
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>
            Alle Datenquellen die täglich automatisch gescannt werden.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-medium"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}
        >
          <RefreshCw size={13} />
          Jetzt aktualisieren
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Aktive Quellen', value: '5', color: 'var(--go)' },
          { label: 'Off-Market', value: '710', color: 'var(--l1)' },
          { label: 'On-Market', value: '290', color: 'var(--l2)' },
          { label: 'Letzter Scan', value: '07:45', color: 'var(--muted)' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-4"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <div className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>{s.label}</div>
            <div className="text-[24px] font-bold tabular-nums font-mono" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sources */}
      <div className="space-y-3">
        {SOURCES.map(src => {
          const st = STATUS_MAP[src.status as keyof typeof STATUS_MAP]
          const StatusIcon = st.icon
          return (
            <div
              key={src.id}
              className="rounded-xl p-5"
              style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-none mt-0.5"
                  style={{ background: `color-mix(in srgb, ${src.typeColor} 12%, transparent)` }}
                >
                  <Database size={16} style={{ color: src.typeColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {src.name}
                    </h3>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${src.typeColor} 12%, transparent)`,
                        color: src.typeColor,
                      }}
                    >
                      {src.type}
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px]" style={{ color: st.color }}>
                      <StatusIcon size={11} />
                      {st.label}
                    </span>
                  </div>

                  <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--muted)' }}>
                    {src.desc}
                  </p>

                  {/* Fields */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {src.fields.map(f => (
                      <span
                        key={f}
                        className="text-[10px] px-2 py-0.5 rounded-md"
                        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--muted)' }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Meta */}
                <div className="text-right flex-none">
                  <div className="text-[22px] font-bold tabular-nums font-mono" style={{ color: 'var(--ink)' }}>
                    {src.count.toLocaleString('de-CH')}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Einträge</div>
                  <div className="flex items-center gap-1 mt-2 justify-end" style={{ color: 'var(--muted)' }}>
                    <Clock size={10} />
                    <span className="text-[10px]">{src.lastRun}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
