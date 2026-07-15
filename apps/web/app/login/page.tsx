'use client'

import { useState, FormEvent, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push(next)
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #ECEEE8)',
    }}>
      <div style={{
        background: 'var(--panel, #FCFCFA)',
        border: '1px solid var(--border, #D8DBD3)',
        borderRadius: 12,
        padding: '40px 48px',
        width: 360,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <span style={{
            display: 'inline-flex',
            gap: 4,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--l1, #0E7C66)', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--l2, #3B4B8C)', display: 'inline-block' }} />
          </span>
          <span style={{
            fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--ink, #191B18)',
          }}>
            10X Deal Origination
          </span>
        </div>

        <h1 style={{
          fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--ink, #191B18)',
          marginBottom: 24,
        }}>
          Anmelden
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink-muted, #5A5E56)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              E-Mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@10xgroup.ch"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border, #D8DBD3)',
                borderRadius: 6,
                fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                fontSize: 14,
                background: 'var(--panel, #FCFCFA)',
                color: 'var(--ink, #191B18)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink-muted, #5A5E56)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Passwort
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border, #D8DBD3)',
                borderRadius: 6,
                fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                fontSize: 14,
                background: 'var(--panel, #FCFCFA)',
                color: 'var(--ink, #191B18)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{
              fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
              fontSize: 13,
              color: '#C0392B',
              margin: 0,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px 0',
              background: loading ? '#8BA89C' : 'var(--l1, #0E7C66)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              marginTop: 4,
            }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
