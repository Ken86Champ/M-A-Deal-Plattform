import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { GateStatus, Gate, GateKey } from '@shared/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtChf(n: number | null | undefined): string {
  if (n == null) return '–'
  if (n >= 1_000_000) return `CHF ${(n / 1_000_000).toFixed(1)} Mio.`
  if (n >= 1_000)     return `CHF ${(n / 1_000).toFixed(0)}k`
  return `CHF ${n}`
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'var(--grey)'
  if (score >= 60)   return 'var(--go)'
  if (score >= 45)   return 'var(--amber)'
  return 'var(--grey)'
}

export function gateColor(status: GateStatus): string {
  return status === 'gruen' ? 'var(--go)'
       : status === 'gelb'  ? 'var(--amber)'
       : status === 'rot'   ? 'var(--red)'
       : 'var(--grey)'
}

export const GATE_LABELS: Record<GateKey, string> = {
  inhaberabh: 'Inhaberabhängigkeit',
  klumpen:    'Klumpenrisiko',
  ai_disrupt: 'AI-Disruption',
  markt:      'Marktstruktur',
  bilanz:     'Bilanz',
}

export const GATE_ORDER: GateKey[] = ['inhaberabh', 'klumpen', 'ai_disrupt', 'markt', 'bilanz']

export function gatesOrdered(gates: Gate[]): Gate[] {
  return GATE_ORDER.map(k => gates.find(g => g.gate === k)).filter(Boolean) as Gate[]
}

export function sinceYears(year: number | null | undefined): string {
  if (!year) return '–'
  return `${new Date().getFullYear() - year} J`
}
