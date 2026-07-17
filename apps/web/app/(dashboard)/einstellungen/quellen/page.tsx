'use client'
import { useState } from 'react'
import { Plus, RefreshCw, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

const OFF_SOURCES = [
  { id: 'shab',            label: 'SHAB', desc: 'VR-Mutationen, Inhaberwechsel, Liquidationen', lastRun: 'Heute 06:00', count: '+1350 geprüft', status: 'ok' },
  { id: 'zefix',           label: 'Zefix', desc: 'Amtlicher HR-Abgleich, neue AG/GmbH', lastRun: 'Heute 06:05', count: '+OK', status: 'ok' },
  { id: 'eigenrecherche',  label: 'Eigenrecherche', desc: 'Manuell erfasste Firmen', lastRun: 'Laufend', count: '+20 Firmen', status: 'ok' },
]

const ON_SOURCES = [
  { id: 'companymarket',    label: 'companymarket.ch',   desc: 'Grösste CH Nachfolgeplattform · B2B+B2C', lastRun: 'Heute 06:15', count: '+6',  status: 'ok',   url: 'https://www.companymarket.ch' },
  { id: 'firmenboerse',     label: 'firmenboerse.com',   desc: 'DACH-weite Plattform, CH-Filter', lastRun: 'Heute 06:27', count: 'Retry OK', status: 'warn', url: 'https://www.firmenboerse.com' },
  { id: 'nachfolgeportal',  label: 'nachfolgeportal.ch', desc: '~250 Inserate · Deutschschweiz · selbst inserierend', lastRun: 'Heute 06:30', count: '+4', status: 'ok', url: 'https://nachfolgeportal.ch' },
  { id: 'firmo',            label: 'firmo.ch',           desc: '275+ Firmenangebote · WordPress · 3000+ Mitglieder', lastRun: 'Heute 06:35', count: '+3', status: 'ok', url: 'https://firmo.ch' },
  { id: 'firm4sale',        label: 'firm4sale.ch',       desc: '386 Angebote · grösste Gastro-Börse · kein Makler', lastRun: 'Heute 06:40', count: '+5', status: 'ok', url: 'https://firm4sale.ch' },
  { id: 'biztrade',         label: 'biz-trade.ch',       desc: 'DACH-Plattform · CH-Filter aktiv', lastRun: 'Heute 06:45', count: '+2', status: 'ok', url: 'https://www.biz-trade.ch' },
  { id: 'businessbroker',   label: 'business-broker.ch', desc: 'Marktführer CH · Hybrid-Modell · eigene Berater', lastRun: 'Heute 06:50', count: 'Sitemap-Scan', status: 'warn', url: 'https://www.business-broker.ch' },
  { id: 'localch',          label: 'local.ch',           desc: 'Branchenbuch-Scan · ältere KMU ohne Plattform-Listing', lastRun: 'Heute 07:00', count: '+12', status: 'ok', url: 'https://www.local.ch' },
  { id: 'handelszeitung',   label: 'Handelszeitung',     desc: 'M&A-News Schweiz · Ankündigungen', lastRun: '–', count: 'Geplant', status: 'off', url: 'https://www.handelszeitung.ch' },
  { id: 'acquify',          label: 'acquify.com',        desc: 'Domain geparkt – temporär inaktiv', lastRun: '–', count: '–', status: 'off', url: '' },
]

const ADDITIONAL_SOURCES = [
  {
    category: 'Weitere Ebene-1-Quellen',
    color: '#10B981',
    items: [
      { label: 'IHK/HKG Mitgliederverzeichnisse', desc: 'Handelskammer-Mitglieder — Kontaktdaten älterer Inhaber', status: 'geplant' },
      { label: 'EXPERTsuisse / Treuhand-Netzwerk', desc: 'Treuhand-Mandate kennen oft Nachfolgebedarf ihrer Klienten', status: 'geplant' },
      { label: 'LinkedIn Company Signals', desc: 'Inhaber 55+, Gründungsjahr alt, kein Nachfolger erwähnt — via API', status: 'geplant' },
      { label: 'Google Maps / My Business', desc: 'Lokale Firmen mit altem Gründungsjahr + Email im Profil', status: 'geplant' },
    ]
  },
  {
    category: 'Netzwerk & Empfehlungen',
    color: '#6B7280',
    items: [
      { label: 'Raiffeisen / BEKB Nachfolgeservice', desc: 'Banken mit eigenem Nachfolge-Vermittlungsangebot', status: 'partnerschaft' },
      { label: 'UBS / ZKB Firmenkundenberatung', desc: 'Grossbank-Netzwerke mit KMU-Nachfolgemandaten', status: 'partnerschaft' },
      { label: 'Steuerberater-Netzwerk', desc: 'Direktzugang zu Inhabern ohne Plattform-Listing', status: 'partnerschaft' },
    ]
  },
]

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok:   <CheckCircle size={13} style={{ color: '#22C55E' }} />,
  warn: <AlertCircle size={13} style={{ color: '#F59E0B' }} />,
  err:  <XCircle size={13} style={{ color: '#EF4444' }} />,
  off:  <Clock size={13} style={{ color: '#9CA3AF' }} />,
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className="w-10 h-5.5 rounded-full flex items-center cursor-pointer transition-colors" style={{ background: on ? 'var(--l1)' : '#D1D5DB', padding: 2, minWidth: 40, height: 22 }}>
      <div className="w-4 h-4 rounded-full bg-white transition-all" style={{ marginLeft: on ? 'auto' : 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

export default function QuellenPage() {
  const off = OFF_SOURCES.map(s => s.id)
  const on_ = ON_SOURCES.filter(s => s.status !== 'off').map(s => s.id)
  const [offToggles, setOffToggles] = useState<Record<string,boolean>>(Object.fromEntries(off.map(id => [id, true])))
  const [onToggles,  setOnToggles]  = useState<Record<string,boolean>>(Object.fromEntries(on_.map(id => [id, id !== 'acquify'])))

  const activeOff = OFF_SOURCES.filter(s => offToggles[s.id]).length
  const activeOn  = ON_SOURCES.filter(s => onToggles[s.id]).length

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex-none px-8 pt-7 pb-5 flex items-start justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Quellen & Pipeline</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {activeOff} Off-Market-Quellen · {activeOn} On-Market-Plattformen aktiv
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
          <RefreshCw size={12} /> Jetzt scannen
        </button>
      </div>

      <div className="px-8 pb-8 space-y-5 pt-5">
        {/* Ebene 1 */}
        <div className="rounded-xl overflow-hidden" style={{ border: '2px solid var(--l1-line)', background: 'var(--panel)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--l1-soft)', borderBottom: '1px solid var(--l1-line)' }}>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: '#065F46' }}>Ebene 1 — Off-Market-Quellen</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#059669' }}>Register & Eigenrecherche — fix, nicht abbestellbar</div>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {OFF_SOURCES.map(src => (
              <div key={src.id} className="flex items-start gap-4 px-5 py-3.5">
                <Toggle on={offToggles[src.id] ?? true} onChange={() => setOffToggles(t => ({ ...t, [src.id]: !t[src.id] }))} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{src.label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{src.desc}</div>
                </div>
                <div className="text-right flex-none">
                  <div className="flex items-center gap-1 justify-end" style={{ color: src.status === 'ok' ? 'var(--l1)' : '#D97706' }}>
                    {STATUS_ICON[src.status]}
                    <span className="text-[10px] font-mono">{src.count}</span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>{src.lastRun}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ebene 2 */}
        <div className="rounded-xl overflow-hidden" style={{ border: '2px solid var(--l2-line)', background: 'var(--panel)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--l2-soft)', borderBottom: '1px solid var(--l2-line)' }}>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: '#1E3A8A' }}>Ebene 2 — On-Market-Plattformen</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#1D4ED8' }}>10 Plattformen — aktivierbar/deaktivierbar</div>
            </div>
            <button className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'var(--l2)', color: '#fff' }}>
              <Plus size={12} /> Plattform
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {ON_SOURCES.map(src => (
              <div key={src.id} className="flex items-start gap-4 px-5 py-3.5" style={{ opacity: src.status === 'off' ? 0.5 : 1 }}>
                <Toggle on={onToggles[src.id] ?? false} onChange={() => setOnToggles(t => ({ ...t, [src.id]: !t[src.id] }))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{src.label}</div>
                    {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[10px] underline" style={{ color: 'var(--l2)' }}>↗</a>}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{src.desc}</div>
                </div>
                <div className="text-right flex-none">
                  <div className="flex items-center gap-1 justify-end" style={{ color: src.status === 'ok' ? 'var(--l1)' : src.status === 'warn' ? '#D97706' : 'var(--muted)' }}>
                    {STATUS_ICON[src.status]}
                    <span className="text-[10px] font-mono">{src.count}</span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>{src.lastRun}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weitere Quellen */}
        {ADDITIONAL_SOURCES.map(group => (
          <div key={group.category} className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{group.category}</span>
              <span className="text-[11px] ml-1" style={{ color: 'var(--muted)' }}>— noch nicht automatisiert</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {group.items.map(item => (
                <div key={item.label} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{item.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{item.desc}</div>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex-none"
                    style={{ background: item.status === 'geplant' ? '#FEF3C7' : '#F3F4F6', color: item.status === 'geplant' ? '#D97706' : '#6B7280' }}>
                    {item.status === 'geplant' ? 'In Planung' : 'Partnerschaft'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Cron */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Cron-Pipeline (täglich)</span>
            <span className="text-[11px]" style={{ color: 'var(--l1)' }}>Alle Jobs aktiv · Europe/Zurich</span>
          </div>
          <div className="p-5 grid grid-cols-5 gap-4">
            {[
              { time: '06:00', label: 'radar',      desc: 'SHAB + Zefix + 8 Plattformen',    color: '#10B981' },
              { time: '07:00', label: 'enrichment', desc: 'Website-Crawl + Claude Haiku',    color: '#3B82F6' },
              { time: '08:00', label: 'scoring',    desc: 'Score-Berechnung + KO-Gates',     color: '#8B5CF6' },
              { time: '08:30', label: 'dossier',    desc: 'KI-Dossier + Brief-Entwurf',      color: '#F59E0B' },
              { time: '09:00', label: 'digest',     desc: 'Tages-Digest an Team',            color: '#6B7280' },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-[10px] font-mono font-semibold mb-1" style={{ color: 'var(--muted)' }}>{s.time}</div>
                <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{s.label}</div>
                <div className="text-[10px] mt-1" style={{ color: s.color }}>{s.desc}</div>
                {i < 4 && <div className="absolute top-5 -right-2 text-[14px]" style={{ color: 'var(--line)' }}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
