// Shared TypeScript types — generated from db/schema.sql
// Used by apps/web and any future TS consumers.

export type Status = 'neu' | 'angereichert' | 'bewertet' | 'qualified' | 'verworfen'
export type Origination = 'latent' | 'listed'
export type GateKey = 'inhaberabh' | 'klumpen' | 'ai_disrupt' | 'markt' | 'bilanz'
export type GateStatus = 'gruen' | 'gelb' | 'rot' | 'offen'
export type Conf = 'A' | 'B' | 'C'
export type DecisionKind = 'ansprechen' | 'spaeter' | 'weg'
export type OutreachStatus = 'pending' | 'approved' | 'sent' | 'replied'
export type Kanal = 'brief' | 'email'

// ── DB Row Types ──────────────────────────────────────────────────────────────

export interface Company {
  id: string
  uid: string | null
  name: string
  canton: string | null
  legal_form: string | null
  founded_year: number | null
  branche: string | null
  purpose: string | null
  status: Status
  created_at: string
  updated_at: string
}

export interface CompanySource {
  id: string
  company_id: string
  origination: Origination
  source_name: string
  external_ref: string | null
  listed_since: string | null   // ISO date
  first_seen: string
}

export interface Enrichment {
  company_id: string
  inhaber_name: string | null
  inhaber_alter: number | null
  inhaber_alter_conf: Conf | null
  kein_nachfolger: boolean | null
  kein_nachfolger_conf: Conf | null
  shab_ruecktritt: boolean | null
  web_last_update_years: number | null
  personenname_in_name: boolean | null
  team_seite_tiefe: number | null
  wiederkehr_signal: number | null
  kundendiversifikation: number | null
  umsatz_est_chf: number | null
  umsatz_conf: Conf | null
  ebitda_marge_est: number | null
  mitarbeiter_est: number | null
  auf_plattform: boolean
  enriched_at: string
}

export interface Score {
  id: string
  company_id: string
  nachfolge: number
  investierbar: number
  combined: number
  config_version: number
  computed_at: string
}

export interface Gate {
  id: string
  company_id: string
  gate: GateKey
  status: GateStatus
  begruendung: string | null
}

export interface ConfigVersion {
  version: number
  payload: ConfigPayload
  created_by: 'prompt' | 'manual'
  prompt_text: string | null
  active: boolean
  created_at: string
}

export interface Decision {
  id: string
  company_id: string
  kind: DecisionKind
  reason: string | null
  decided_at: string
}

export interface Outreach {
  id: string
  company_id: string
  status: OutreachStatus
  kanal: Kanal | null
  letter_draft: string | null
  follow_up_due: string | null
  created_at: string
}

// ── Config Payload ─────────────────────────────────────────────────────────────

export interface ConfigPayload {
  weights_nachfolge: {
    inhaberalter: number
    kein_nachfolger: number
    shab_ruecktritt: number
    web_inaktiv: number
    firmenalter: number
  }
  weights_invest: {
    wiederkehr: number
    kundendiversifikation: number
    inhaber_unabhaengigkeit: number
    groesse: number
    ebitda_marge: number
  }
  thresholds: {
    ansprechen: number
    beobachten: number
  }
  gates: {
    klumpenrisiko_max_pct: number
    ai_resilienz_min_klasse: number
    markt_schrumpf_ko: boolean
  }
  groesse_zielband_chf: {
    min: number
    max: number
  }
  ebitda_multiple: {
    low: number
    high: number
  }
}

// ── Composite / API Types ─────────────────────────────────────────────────────

export interface CompanyFull extends Company {
  sources: CompanySource[]
  enrichment: Enrichment | null
  latestScore: Score | null
  gates: Gate[]
  latestDecision: Decision | null
}

export interface CompanyListItem extends Company {
  origination: Origination | null   // dominant source
  combined: number | null
  gates: Gate[]
}

export interface ConfigDiffItem {
  field: string
  from: unknown
  to: unknown
}

export interface ConfigInterpretResponse {
  interpretation: string
  new_config: ConfigPayload
  diff: ConfigDiffItem[]
}
