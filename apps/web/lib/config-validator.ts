import type { ConfigPayload } from '@shared/types'

const SUM_TOL = 0.001

function sumWeights(w: Record<string, number>): number {
  return Object.values(w).reduce((a, b) => a + b, 0)
}

export interface ValidationError {
  field: string
  message: string
}

export function validateConfig(c: ConfigPayload): ValidationError[] {
  const errors: ValidationError[] = []

  const nachfolgeSum = sumWeights(c.weights_nachfolge)
  if (Math.abs(nachfolgeSum - 1) > SUM_TOL) {
    errors.push({
      field: 'weights_nachfolge',
      message: `Summe muss 1.0 sein (aktuell: ${nachfolgeSum.toFixed(4)})`,
    })
  }

  const investSum = sumWeights(c.weights_invest)
  if (Math.abs(investSum - 1) > SUM_TOL) {
    errors.push({
      field: 'weights_invest',
      message: `Summe muss 1.0 sein (aktuell: ${investSum.toFixed(4)})`,
    })
  }

  if (c.thresholds.ansprechen < 0 || c.thresholds.ansprechen > 100) {
    errors.push({ field: 'thresholds.ansprechen', message: 'Muss zwischen 0 und 100 liegen' })
  }
  if (c.thresholds.beobachten < 0 || c.thresholds.beobachten > 100) {
    errors.push({ field: 'thresholds.beobachten', message: 'Muss zwischen 0 und 100 liegen' })
  }
  if (c.thresholds.beobachten >= c.thresholds.ansprechen) {
    errors.push({ field: 'thresholds', message: 'beobachten muss kleiner als ansprechen sein' })
  }

  if (c.gates.klumpenrisiko_max_pct < 1 || c.gates.klumpenrisiko_max_pct > 100) {
    errors.push({ field: 'gates.klumpenrisiko_max_pct', message: 'Muss zwischen 1 und 100 liegen' })
  }
  if (c.gates.ai_resilienz_min_klasse < 1 || c.gates.ai_resilienz_min_klasse > 5) {
    errors.push({ field: 'gates.ai_resilienz_min_klasse', message: 'Muss zwischen 1 und 5 liegen' })
  }

  if (c.groesse_zielband_chf.min < 0) {
    errors.push({ field: 'groesse_zielband_chf.min', message: 'Muss positiv sein' })
  }
  if (c.groesse_zielband_chf.max <= c.groesse_zielband_chf.min) {
    errors.push({ field: 'groesse_zielband_chf', message: 'max muss grösser als min sein' })
  }

  return errors
}
