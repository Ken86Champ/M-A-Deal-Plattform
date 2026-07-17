'use client'
import { useState } from 'react'
import { Save, Check, UserPlus, Mail, Shield, Trash2 } from 'lucide-react'

const TEAM_MEMBERS = [
  { id: '1', name: 'M. Keller', email: 'm.keller@finalu.ch', role: 'admin',  avatar: 'MK', status: 'aktiv' },
  { id: '2', name: 'S. Huber',  email: 's.huber@finalu.ch',  role: 'analyst', avatar: 'SH', status: 'aktiv' },
]

const ROLE_LABELS: Record<string, { label: string; desc: string; bg: string; color: string }> = {
  admin:   { label: 'Admin',    desc: 'Vollzugriff, E-Mails versenden, Einstellungen',   bg: '#FEF3C7', color: '#D97706' },
  analyst: { label: 'Analyst',  desc: 'Lesen, Inbox bearbeiten, keine Einstellungen',    bg: '#DBEAFE', color: '#1D4ED8' },
  viewer:  { label: 'Betrachter', desc: 'Nur lesen',                                     bg: '#F3F4F6', color: '#6B7280' },
}

export default function TeamPage() {
  const [members,  setMembers]  = useState(TEAM_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<'analyst'|'viewer'>('analyst')
  const [saved, setSaved] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  // Account settings
  const [fromName,  setFromName]  = useState('M. Keller')
  const [fromEmail, setFromEmail] = useState('m.keller@finalu.ch')
  const [company,   setCompany]   = useState('10X Group')

  function saveAccount() {
    // Persist to localStorage for now (API later)
    localStorage.setItem('origination_sender', JSON.stringify({ name: fromName, email: fromEmail }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function sendInvite() {
    if (!inviteEmail) return
    const initials = inviteEmail.split('@')[0].slice(0,2).toUpperCase()
    setMembers(prev => [...prev, {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      avatar: initials,
      status: 'eingeladen',
    }])
    setInviteEmail('')
    setInviteSent(true)
    setTimeout(() => setInviteSent(false), 3000)
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-none px-8 pt-7 pb-5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Team & Konto</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>Benutzer-Verwaltung und Absender-Konfiguration</p>
      </div>

      <div className="p-8 max-w-[900px] space-y-6">

        {/* Account / Absender */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>Absender-Konfiguration</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Standard-Absender für alle ausgehenden Briefe und E-Mails</div>
            </div>
            <button onClick={saveAccount}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white"
              style={{ background: saved ? 'var(--l1)' : 'var(--ink)' }}>
              {saved ? <><Check size={13} /> Gespeichert</> : <><Save size={13} /> Speichern</>}
            </button>
          </div>
          <div className="p-5 grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
                Absender-Name
              </label>
              <input value={fromName} onChange={e => setFromName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
                Absender-E-Mail
              </label>
              <input value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                type="email"
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
                Unternehmen
              </label>
              <input value={company} onChange={e => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
            </div>
          </div>
          <div className="px-5 pb-4">
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <Mail size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11px]" style={{ color: '#92400E' }}>
                Die Absender-E-Mail muss als Domain in <strong>Resend</strong> verifiziert sein.
                Trage deinen Key unter <code style={{ background: '#FDE68A', padding: '0 3px', borderRadius: 3 }}>RESEND_API_KEY</code> in der <code>.env.local</code> ein.
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>Team-Mitglieder</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{members.length} Mitglieder</div>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {members.map(m => {
              const role = ROLE_LABELS[m.role] ?? ROLE_LABELS.viewer
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-none"
                    style={{ background: m.status === 'eingeladen' ? '#9CA3AF' : '#374151' }}>
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{m.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{m.email}</div>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: role.bg, color: role.color }}>{role.label}</span>
                  {m.status === 'eingeladen' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      Einladung ausstehend
                    </span>
                  )}
                  {m.id !== '1' && (
                    <button onClick={() => setMembers(prev => prev.filter(x => x.id !== m.id))}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={13} style={{ color: '#EF4444' }} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Invite form */}
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
            <div className="text-[11px] font-semibold mb-2.5" style={{ color: 'var(--muted)' }}>Mitglied einladen</div>
            <div className="flex items-center gap-2">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                type="email" placeholder="E-Mail-Adresse"
                className="flex-1 px-3 py-2 rounded-xl text-[12.5px] outline-none"
                style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}
                onKeyDown={e => e.key === 'Enter' && sendInvite()} />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-[12px] outline-none"
                style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}>
                <option value="analyst">Analyst</option>
                <option value="viewer">Betrachter</option>
              </select>
              <button onClick={sendInvite} disabled={!inviteEmail}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white disabled:opacity-50"
                style={{ background: inviteSent ? 'var(--l1)' : 'var(--ink)' }}>
                {inviteSent ? <><Check size={13} /> Eingeladen</> : <><UserPlus size={13} /> Einladen</>}
              </button>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Rollen-Übersicht</div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(ROLE_LABELS).map(([key, r]) => (
              <div key={key} className="p-3 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: r.bg, color: r.color }}>{r.label}</span>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
