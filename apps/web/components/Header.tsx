'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/inbox',        label: 'Inbox' },
  { href: '/',             label: 'Übersicht' },
  { href: '/deals',        label: 'Pipeline' },
  { href: '/score-studio', label: 'Score Studio' },
  { href: '/queue',        label: 'Queue' },
]

export function Header() {
  const path = usePathname()

  return (
    <header
      className="flex-none"
      style={{ background: 'var(--panel)', borderBottom: '1px solid var(--line)' }}
    >
      {/* Brand gradient accent */}
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background: 'var(--brand-gradient)',
          boxShadow: '0 0 12px rgba(108,74,150,0.3), 0 0 24px rgba(61,92,166,0.15)',
        }}
      />

      <div className="flex items-center justify-between px-6 h-12">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full transition-all duration-300 group-hover:scale-110"
              style={{ background: 'var(--l1)', boxShadow: '0 0 6px var(--l1)' }}
            />
            <span
              className="w-2 h-2 rounded-full transition-all duration-300 group-hover:scale-110"
              style={{ background: 'var(--l2)', boxShadow: '0 0 6px var(--l2)' }}
            />
          </div>
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            Deal Origination
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(92,110,255,0.08)',
              color: 'var(--muted)',
              border: '1px solid var(--line)',
            }}
          >
            10X Group
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV.map(({ href, label }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                style={{
                  color:      active ? '#5C6EFF' : 'var(--muted)',
                  background: active ? 'rgba(92,110,255,0.1)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  border:     active ? '1px solid rgba(92,110,255,0.25)' : '1px solid transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
