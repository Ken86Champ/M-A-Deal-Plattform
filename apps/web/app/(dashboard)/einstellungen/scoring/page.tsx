'use client'
import { useState } from 'react'
import { Save, Plus } from 'lucide-react'

const PROFILES = [
  { id: 'konservativ', label: 'Konservativ', desc: 'Wenige Bälle, klare Signale', rate: '~6 Kandidaten/Woche' },
  { id: 'ausgewogen',  label: 'Ausgewogen',  desc: 'Standard. Empfohlen für den Start.', rate: '~10 Kandidaten/Woche' },
  { id: 'breit',       label: 'Breit',       desc: 'Viele Bälle, mehr Volumen.', rate: '~20 Kandidaten/Woche' },
]

const INIT_CRITERIA = [
  { id: 1, label: 'Alter Inhaber', sub: 'Zefix/HR-Abgleich', type: 'Standard', weight: 25, color: '#10B981' },
  { id: 2, label: 'SHAB/Zefix-Signale', sub: 'VR-Mutationen, Statutenänd.', type: 'Standard', weight: 25, color: '#10B981' },
  { id: 3, label: '2. Führungsebene', sub: 'Website-Scan, Team, Produkte', type: 'Standard', weight: 18, color: '#3B82F6' },
  { id: 4, label: 'Marktattraktivität', sub: 'Claude: Branche, Region', type: 'Standard', weight: 18, color: '#3B82F6' },
  { id: 5, label: 'Wiederkehrender Umsatz', sub: 'Website-Scan, Verträge, Abo', type: 'Standard', weight: 10, color: '#8B5CF6' },
  { id: 6, label: 'Service-/Wartungsverträge', sub: 'Eigene Frage an Claude', type: 'Eigenes', weight: 10, color: '#F59E0B' },
]

const KO_GATES = [
  { label: 'Inhaberabhängigkeit', status: 'Warnung' },
  { label: 'Kundenklumpen > 60 %', status: 'Warnung' },
  { label: 'AI-Disruption > 4/5', status: 'KO' },
  { label: 'Marktattraktivität', status: 'Warnung' },
  { label: 'Bilanzqualität', status: 'Warnung' },
]

export default function ScoringPage() {
  const [activeProfile, setActiveProfile] = useState('ausgewogen')
  const [criteria, setCriteria] = useState(INIT_CRITERIA)

  const totW = criteria.reduce((s, c) => s + c.weight, 0)
  const preview = [
    { label: 'grün (≥60)', count: 33,  color: '#22C55E', pct: 33 },
    { label: 'amber (40–60)', count: 31, color: '#F59E0B', pct: 31 },
    { label: 'grau (<40)',  count: 88,  color: '#E5E7EB', pct: 88 },
  ]
  const maxPrev = 152

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-none px-8 pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Scoring</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>Profil wählen oder eigenes Scoring bauen · gilt ab dem nächsten Lauf (08:00)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Testlauf mit 30 Firmen</span>
            <button className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: 'var(--ink)' }}>
              <Save size={13} className="inline mr-1.5" />Speichern
            </button>
          </div>
        </div>

        {/* Profiles */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {PROFILES.map(p => (
            <button key={p.id} onClick={() => setActiveProfile(p.id)}
              className="text-left p-4 rounded-xl transition-all"
              style={{ background: activeProfile === p.id ? 'var(--l1-soft)' : 'var(--panel)', border: `1px solid ${activeProfile === p.id ? 'var(--l1-line)' : 'var(--line)'}` }}>
              <div className="text-[13px] font-semibold" style={{ color: activeProfile === p.id ? 'var(--l1)' : 'var(--ink)' }}>{p.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{p.desc}</div>
              <div className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--muted)' }}>{p.rate}</div>
            </button>
          ))}
          <div className="p-4 rounded-xl" style={{ background: activeProfile === 'eigenes' ? 'var(--l1-soft)' : 'var(--l1-soft)', border: '1px solid var(--l1-line)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold" style={{ color: 'var(--l1)' }}>Eigenes Scoring</div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--l1)' }}>AKTIV</span>
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: '#065F46' }}>Eigene Kriterien, Gewichte, Gates.</div>
            <div className="text-[10px] mt-1" style={{ color: '#059669' }}>Version 7 · in Betrieb</div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 grid grid-cols-3 gap-5">
        {/* Criteria */}
        <div className="col-span-2 rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Kriterien · auto-normiert auf 100 je Dimension</span>
            <button className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--l1)' }}>
              <Plus size={12} /> Kriterium hinzufügen
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {criteria.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-4 text-[11px]" style={{ color: 'var(--muted)' }}>{i+1}</div>
                <div className="w-2 h-2 rounded-full flex-none" style={{ background: c.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{c.label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{c.sub}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: c.type === 'Eigenes' ? '#FEF3C7' : '#F3F4F6', color: c.type === 'Eigenes' ? '#D97706' : '#6B7280' }}>{c.type}</span>
                <div className="flex items-center gap-2 w-28">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.weight/30)*100}%`, background: c.color }} />
                  </div>
                </div>
                <div className="w-8 text-right text-[12px] font-bold font-mono" style={{ color: 'var(--ink)' }}>{c.weight}</div>
              </div>
            ))}
          </div>
          <div className="px-5 py-2.5 text-[11px]" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
            Kriterien-Klick öffnet den Editor. Frage an Claude: Anhand →Felder →Konfidenz-Minimum →Testlauf an 3 Kandidaten.
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Preview chart */}
          <div className="rounded-xl p-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Vorschau Auswirkung</div>
            <div className="text-[10px] mb-3" style={{ color: 'var(--muted)' }}>102 Kandidaten · neu bewertet</div>
            <div className="flex items-end gap-1 h-20 mb-3">
              {[15,12,18,22,25,30,20,18,15,10,8,5].map((v, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: (v/30)*80, background: i < 4 ? '#E5E7EB' : i < 8 ? '#FDE68A' : '#86EFAC' }} />
              ))}
            </div>
            {preview.map(p => (
              <div key={p.label} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: 'var(--muted)' }}>{p.label}</span>
                </span>
                <span className="font-bold" style={{ color: p.color }}>{p.count}</span>
              </div>
            ))}
          </div>

          {/* KO-Gates */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>KO-Gates · KO oder Warnung</div>
            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {KO_GATES.map(g => (
                <div key={g.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11.5px]" style={{ color: 'var(--ink)' }}>{g.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: g.status === 'KO' ? '#FEE2E2' : '#FEF3C7', color: g.status === 'KO' ? '#DC2626' : '#D97706' }}>
                    {g.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
