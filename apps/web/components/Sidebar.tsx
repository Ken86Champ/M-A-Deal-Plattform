'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutGrid, Inbox as InboxIcon, Users, Radio, CheckSquare, MessageSquare, BarChart2, Settings, ChevronDown, ChevronRight as ChevronR, BookOpen, SlidersHorizontal, Database, FileText, UserCog } from 'lucide-react'

const MAIN_NAV = [
  { href: '/',           label: 'Übersicht',       icon: LayoutGrid,    badge: null    },
  { href: '/inbox',      label: 'Inbox',           icon: InboxIcon,     badge: 7,  badgeColor: '#F59E0B' },
  { href: '/kandidaten', label: 'Kandidaten',       icon: Users,         badge: 140     },
  { href: '/radar',      label: 'Radar',            icon: Radio,         badge: null    },
  { href: '/queue',      label: 'Approval-Queue',   icon: CheckSquare,   badge: 2,  badgeColor: '#F59E0B' },
  { href: '/kontakte',   label: 'Kontakte',         icon: MessageSquare, badge: 8,  badgeColor: '#6B7280' },
  { href: '/berichte',   label: 'Berichte',         icon: BarChart2,     badge: null    },
]

const SETTINGS_NAV = [
  { href: '/einstellungen/scoring',  label: 'Scoring',           icon: SlidersHorizontal },
  { href: '/einstellungen/quellen',  label: 'Quellen & Pipeline',icon: Database          },
  { href: '/einstellungen/vorlagen', label: 'Vorlagen',          icon: FileText          },
  { href: '/einstellungen/team',     label: 'Team & Konto',      icon: UserCog           },
]

export function Sidebar() {
  const path = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(path.startsWith('/einstellungen'))

  function active(href: string) {
    if (href === '/') return path === '/'
    return path.startsWith(href)
  }

  return (
    <aside className="flex-none flex flex-col select-none" style={{ width: 200, minHeight: '100vh', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-line)' }}>
      {/* Logo */}
      <div className="px-4 py-5 flex-none">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex-none flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10B981,#3B82F6)' }}>
            <span className="text-white font-bold text-[11px] leading-none">O</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>Origination</div>
            <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Schweiz</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {MAIN_NAV.map(item => {
          const Icon = item.icon
          const isActive = active(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all"
              style={{ background: isActive ? 'var(--active-bg)' : 'transparent', color: isActive ? 'var(--active-text)' : 'var(--ink-muted)' }}
            >
              <Icon size={14} className="flex-none" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{ background: isActive ? 'rgba(255,255,255,0.2)' : (item.badgeColor ? item.badgeColor + '22' : 'var(--line)'), color: isActive ? '#fff' : (item.badgeColor ?? 'var(--muted)') }}
                >
                  {item.badge}
                </span>
              )}
              {isActive && !item.badge && (
                <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: '#F59E0B' }} />
              )}
            </Link>
          )
        })}

        {/* Einstellungen collapsible */}
        <div className="pt-1">
          <button
            onClick={() => setSettingsOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all"
            style={{ background: path.startsWith('/einstellungen') ? 'var(--active-bg)' : 'transparent', color: path.startsWith('/einstellungen') ? '#fff' : 'var(--ink-muted)' }}
          >
            <Settings size={14} className="flex-none" />
            <span className="flex-1 text-left">Einstellungen</span>
            {settingsOpen ? <ChevronDown size={12} /> : <ChevronR size={12} />}
          </button>
          {settingsOpen && (
            <div className="ml-5 mt-0.5 space-y-0.5">
              {SETTINGS_NAV.map(item => {
                const Icon = item.icon
                const isActive = path === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all"
                    style={{ color: isActive ? 'var(--l1)' : 'var(--muted)', fontWeight: isActive ? 600 : 400 }}
                  >
                    <Icon size={12} className="flex-none" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 flex-none" style={{ borderTop: '1px solid var(--sidebar-line)' }}>
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-none" style={{ background: '#6B7280' }}>
            MK
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium truncate" style={{ color: 'var(--ink)' }}>M. Keller</div>
            <div className="text-[9px] truncate" style={{ color: 'var(--muted)' }}>m.keller@finalu.ch</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
