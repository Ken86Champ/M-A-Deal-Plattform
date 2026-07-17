'use client'
import { useState } from 'react'
import { Plus, Edit2, Copy, Trash2, Save, X, Check } from 'lucide-react'

const DEFAULT_TEMPLATES = [
  {
    id: 'standard-nachfolge',
    name: 'Standard Nachfolge (Off-Market)',
    channel: 'brief',
    subject: 'Vertrauliche Anfrage — {{firma}}',
    body: `Sehr geehrter Herr {{nachname}}

Ihr Unternehmen ist uns durch seine langjährige Verankerung in der {{branche}}-Branche aufgefallen. Wir begleiten Inhaberinnen und Inhaber von Schweizer KMU diskret bei Fragen der Nachfolge — ohne Zeitdruck und ohne Verpflichtung.

Unser Ansatz: Wir suchen nicht das Unternehmen mit dem besten Preis, sondern jenes, das am besten zu unserer Entwicklungsphilosophie passt. Diskretion und Kontinuität für Ihre Mitarbeitenden und Kunden stehen dabei an erster Stelle.

Falls das Thema Nachfolge für Sie in den nächsten Jahren relevant werden könnte, würden wir uns über ein unverbindliches, vertrauliches Gespräch freuen.

Freundliche Grüsse
{{absender_name}}
{{absender_email}}`,
    variables: ['firma', 'nachname', 'branche', 'absender_name', 'absender_email'],
    active: true,
    type: 'off-market',
  },
  {
    id: 'on-market-inserat',
    name: 'Reaktion auf Inserat (On-Market)',
    channel: 'email',
    subject: 'Anfrage zu Ihrem Inserat — {{firma}}',
    body: `Sehr geehrter Herr {{nachname}}

Wir sind auf Ihr Inserat auf {{plattform}} aufmerksam geworden. Als aktiver KMU-Investor mit Fokus auf Deutschschweizer Unternehmen in {{branche}} sehen wir eine interessante Ausgangslage.

Wir handeln diskret und ohne Makler. Unser Team verfügt über operative Erfahrung im {{branche}}-Bereich und legt grossen Wert auf die Kontinuität Ihrer Mitarbeitenden und Kundenbeziehungen.

Wären Sie für ein erstes, unverbindliches Gespräch offen?

Freundliche Grüsse
{{absender_name}}`,
    variables: ['firma', 'nachname', 'branche', 'plattform', 'absender_name'],
    active: true,
    type: 'on-market',
  },
  {
    id: 'follow-up',
    name: 'Follow-up nach Antwort',
    channel: 'email',
    subject: 'Re: {{firma}} — nächste Schritte',
    body: `Sehr geehrter Herr {{nachname}}

Vielen Dank für Ihre Rückmeldung — wir freuen uns über Ihr Interesse.

Als nächsten Schritt würden wir gerne ein vertrauliches Kennenlerngespräch vereinbaren, um gegenseitig zu prüfen, ob eine Zusammenarbeit in Frage kommt. Kein Zeitdruck, kein Mandat — nur ein offenes Gespräch.

Wären Sie in der Woche vom {{woche}} für 30 Minuten verfügbar?

Freundliche Grüsse
{{absender_name}}`,
    variables: ['firma', 'nachname', 'woche', 'absender_name'],
    active: true,
    type: 'follow-up',
  },
]

const TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  'off-market': { bg: '#D1FAE5', color: '#065F46', label: 'Ebene 1 / Off-Market' },
  'on-market':  { bg: '#DBEAFE', color: '#1E40AF', label: 'Ebene 2 / On-Market' },
  'follow-up':  { bg: '#F3F4F6', color: '#374151', label: 'Follow-up' },
}

function VariablePill({ v }: { v: string }) {
  return (
    <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded"
      style={{ background: '#F0FDF4', color: '#059669', border: '1px solid #D1FAE5' }}>
      {'{{'}{v}{'}}'}
    </span>
  )
}

export default function VorlagenPage() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<typeof DEFAULT_TEMPLATES[0] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function startEdit(t: typeof DEFAULT_TEMPLATES[0]) {
    setEditing(t.id)
    setEditData({ ...t })
  }

  function saveEdit() {
    if (!editData) return
    setTemplates(prev => prev.map(t => t.id === editData.id ? editData : t))
    setEditing(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function duplicateTemplate(t: typeof DEFAULT_TEMPLATES[0]) {
    const newT = { ...t, id: t.id + '-kopie-' + Date.now(), name: t.name + ' (Kopie)', active: false }
    setTemplates(prev => [...prev, newT])
  }

  function copyBody(body: string, id: string) {
    navigator.clipboard.writeText(body)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const active = editing && editData

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex-none px-8 pt-7 pb-5 flex items-start justify-between"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Vorlagen</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
            Brief- und E-Mail-Vorlagen · Variablen werden beim Versand ersetzt
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--l1)' }}>
              <Check size={13} /> Gespeichert
            </span>
          )}
          <button
            onClick={() => {
              const newT = {
                id: 'vorlage-' + Date.now(),
                name: 'Neue Vorlage',
                channel: 'email',
                subject: 'Betreff',
                body: 'Text hier…',
                variables: ['firma', 'nachname'],
                active: false,
                type: 'off-market',
              }
              setTemplates(prev => [...prev, newT])
              startEdit(newT)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white"
            style={{ background: 'var(--ink)' }}>
            <Plus size={13} /> Neue Vorlage
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-4">
        {templates.map(t => {
          const typeInfo = TYPE_COLORS[t.type] ?? TYPE_COLORS['off-market']
          const isEditing = editing === t.id

          return (
            <div key={t.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--panel)', border: isEditing ? '1.5px solid var(--l1)' : '1px solid var(--line)' }}>
              {/* Template header */}
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isEditing && editData ? (
                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                      className="text-[14px] font-semibold outline-none px-2 py-0.5 rounded-lg flex-1"
                      style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
                  ) : (
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{t.name}</span>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: typeInfo.bg, color: typeInfo.color }}>{typeInfo.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: t.channel === 'brief' ? '#FEF3C7' : '#F3F4F6', color: t.channel === 'brief' ? '#D97706' : '#6B7280' }}>
                    {t.channel === 'brief' ? '✉ Brief' : '@ E-Mail'}
                  </span>
                  {!t.active && <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Inaktiv</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  {isEditing ? (
                    <>
                      <button onClick={saveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                        style={{ background: 'var(--l1)' }}>
                        <Save size={12} /> Speichern
                      </button>
                      <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                        <X size={14} style={{ color: 'var(--muted)' }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Bearbeiten">
                        <Edit2 size={14} style={{ color: 'var(--muted)' }} />
                      </button>
                      <button onClick={() => copyBody(t.body, t.id)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Kopieren">
                        {copied === t.id
                          ? <Check size={14} style={{ color: 'var(--l1)' }} />
                          : <Copy size={14} style={{ color: 'var(--muted)' }} />}
                      </button>
                      <button onClick={() => duplicateTemplate(t)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Duplizieren">
                        <Plus size={14} style={{ color: 'var(--muted)' }} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Template body */}
              <div className="p-5 grid grid-cols-3 gap-5">
                {/* Subject + Variables */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Betreff</div>
                    {isEditing && editData ? (
                      <input value={editData.subject} onChange={e => setEditData({ ...editData, subject: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg text-[12.5px] outline-none"
                        style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
                    ) : (
                      <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{t.subject}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Variablen</div>
                    <div className="flex flex-wrap gap-1">
                      {t.variables.map(v => <VariablePill key={v} v={v} />)}
                    </div>
                  </div>
                  {isEditing && editData && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Typ</div>
                      <select value={editData.type} onChange={e => setEditData({ ...editData, type: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none"
                        style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }}>
                        <option value="off-market">Ebene 1 / Off-Market</option>
                        <option value="on-market">Ebene 2 / On-Market</option>
                        <option value="follow-up">Follow-up</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Body preview / editor */}
                <div className="col-span-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Brieftext</div>
                  {isEditing && editData ? (
                    <textarea
                      value={editData.body}
                      onChange={e => setEditData({ ...editData, body: e.target.value })}
                      rows={10}
                      className="w-full px-3 py-2.5 rounded-xl text-[12.5px] outline-none resize-none"
                      style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'Georgia, serif', lineHeight: 1.7 }}
                    />
                  ) : (
                    <div className="rounded-xl p-3.5 text-[12.5px] leading-relaxed whitespace-pre-line"
                      style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Georgia, serif',
                               maxHeight: 200, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)' }}>
                      {t.body}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
