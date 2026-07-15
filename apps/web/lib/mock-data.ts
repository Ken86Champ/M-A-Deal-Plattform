export type DealType = 'off-market' | 'on-market'
export type Confidence = 'A' | 'B' | 'C'
export type DealStatus = 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'outreach-ready' | 'contacted' | 'replied'
export type PipelineStage =
  | 'new-qualified' | 'in-review' | 'shortlisted'
  | 'outreach-ready' | 'contacted' | 'replied'
  | 'negotiation' | 'won' | 'rejected'

export interface ScoreBreakdown {
  strategicFit: number
  companyQuality: number
  salesProbability: number
  outreachPotential: number
  dataQuality: number
}

export interface Deal {
  id: string
  name: string
  legalForm: string
  canton: string
  industry: string
  website?: string
  listingUrl?: string   // Originalinserat-URL (On-Market) oder Zefix-Link (Off-Market)
  listingPlatform?: string  // z.B. "companymarket.ch", "firmenboerse.com", "Zefix"
  type: DealType
  score: number
  confidence: Confidence
  status: DealStatus
  pipelineStage: PipelineStage
  dealReason: string
  founded?: number
  employees?: number
  revenueChf?: number
  ebitdaChf?: number
  summary: string
  dealHypothesis: string
  outreachAngle: string
  signals: string[]
  redFlags: string[]
  sources: string[]
  scoreBreakdown: ScoreBreakdown
  createdAt: string
}

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'new-qualified',  label: 'Neu & Qualifiziert' },
  { id: 'in-review',      label: 'In Prüfung' },
  { id: 'shortlisted',    label: 'Shortlist' },
  { id: 'outreach-ready', label: 'Outreach bereit' },
  { id: 'contacted',      label: 'Kontaktiert' },
  { id: 'replied',        label: 'Geantwortet' },
  { id: 'negotiation',    label: 'Verhandlung' },
  { id: 'won',            label: 'Gewonnen' },
  { id: 'rejected',       label: 'Abgelehnt' },
]

export const DEALS: Deal[] = [
  {
    id: 'mock-001',
    name: 'Steuerberatung Zimmermann & Partner AG',
    legalForm: 'AG',
    canton: 'ZH',
    industry: 'Steuer- & Unternehmensberatung',
    website: 'www.zimmermann-partner.ch',
    listingUrl: 'https://www.zefix.ch/de/search/entity/list/firm?name=Zimmermann+Partner',
    listingPlatform: 'Zefix',
    type: 'off-market',
    score: 92,
    confidence: 'B',
    status: 'new',
    pipelineStage: 'new-qualified',
    dealReason: 'Senior Partner 71 J., Nachfolge nicht geregelt',
    founded: 1989,
    employees: 12,
    revenueChf: 2_800_000,
    ebitdaChf: 840_000,
    summary: 'Etabliertes Steuer- und Unternehmensberatungsbüro in Zürich mit 35 Jahren Marktpräsenz. Exzellente Mandantenbindung, wiederkehrender Umsatz >90%. Fokus auf KMU und inhabergeführte Unternehmen.',
    dealHypothesis: 'Der Gründer und einzige Senior Partner ist 71 Jahre alt. Kein Nachfolger intern vorhanden. Die Mandantenstruktur (23 Kernkunden, alle seit >8 Jahren) ist sehr stabil. Hochprofitables Geschäftsmodell mit kaum Kapitalintensität — klassisches Roll-up Target.',
    outreachAngle: 'Persönliches Schreiben an Herrn Zimmermann über Nachfolgethematik — kein Kauf, sondern Partnerschaft und Kontinuitätssicherung für seine Mandanten.',
    signals: [
      'Senior Partner: 71 Jahre, kein kommunizierter Nachfolger',
      'Personenname prominent im Firmennamen',
      'Website seit 6 Jahren nicht inhaltlich aktualisiert',
      'SHAB: Rücktritt aus Verwaltungsrat (VP) letzten März',
      'Keine Social-Media-Präsenz / digitale Inaktivität',
    ],
    redFlags: [
      'Starke persönliche Abhängigkeit vom Gründer (Mandanten-Relationship)',
      'Teamseite zeigt nur 3 Junior-Mitarbeitende',
    ],
    sources: ['Zefix (CHE-112.345.678)', 'SHAB Meldung 2025-03-14', 'Website-Analyse'],
    scoreBreakdown: { strategicFit: 95, companyQuality: 90, salesProbability: 94, outreachPotential: 88, dataQuality: 82 },
    createdAt: '2026-07-07',
  },
  {
    id: 'mock-002',
    name: 'Büchler Präzisionstechnik AG',
    legalForm: 'AG',
    canton: 'ZH',
    industry: 'Maschinenbau / Präzisionsteile',
    website: 'www.buechler-praezision.ch',
    listingUrl: 'https://www.zefix.ch/de/search/entity/list/firm?name=B%C3%BCchler+Pr%C3%A4zisionstechnik',
    listingPlatform: 'Zefix',
    type: 'off-market',
    score: 84,
    confidence: 'B',
    status: 'new',
    pipelineStage: 'new-qualified',
    dealReason: 'Inhaber 67 J., kein Nachfolger identifiziert',
    founded: 1971,
    employees: 28,
    revenueChf: 4_200_000,
    ebitdaChf: 630_000,
    summary: 'Spezialisierter Auftragsfertiger für Hochpräzisionskomponenten (±0.001mm). Kernkunden aus Medtech, Uhrenindustrie und Verteidigung. Stabile Auftragslage, ausgelastete Kapazitäten.',
    dealHypothesis: 'Klassisches KMU-Nachfolge-Szenario. Hoher Spezialisierungsgrad schützt vor Standardwettbewerb. Medtech-Kunden zahlen Premiumpreise. Mit professionellem Management-Layer könnte Umsatz auf 6M+ skalieren.',
    outreachAngle: 'Herr Büchler über sein Lebenswerk ansprechen — nicht "Kauf" sondern Weiterführung des Präzisionshandwerks in professioneller Struktur.',
    signals: [
      'Inhaber: 67 Jahre (laut SHAB-Einträgen seit 1999)',
      'Familienname im Firmennamen',
      'Keine öffentliche Nachfolgeankündigung',
      'Website-Impressum zeigt nur Inhaber als Kontakt',
      'Technologie: CNC-Fertigung, schwer ersetzbar',
    ],
    redFlags: [
      'Kundenklumpen: Top 3 Kunden = ~60% Umsatz',
      'Stark maschinenintensiv (Capex bei Übernahme)',
    ],
    sources: ['Zefix (CHE-234.567.890)', 'SHAB', 'Website-Analyse', 'LinkedIn'],
    scoreBreakdown: { strategicFit: 88, companyQuality: 82, salesProbability: 85, outreachPotential: 79, dataQuality: 76 },
    createdAt: '2026-07-06',
  },
  {
    id: 'mock-003',
    name: 'Alpin Dental Labor GmbH',
    legalForm: 'GmbH',
    canton: 'BE',
    industry: 'Dental-Labordienstleistungen',
    listingUrl: 'https://www.zefix.ch/de/search/entity/list/firm?name=Alpin+Dental',
    listingPlatform: 'Zefix',
    type: 'off-market',
    score: 78,
    confidence: 'B',
    status: 'reviewed',
    pipelineStage: 'in-review',
    dealReason: 'Inhaberin 63 J., wiederkehrender Umsatz mit 14 Zahnarztpraxen',
    founded: 2001,
    employees: 8,
    revenueChf: 1_600_000,
    ebitdaChf: 320_000,
    summary: 'Spezialisiertes Dentallabor mit 25 Jahren Stammkundschaft. 14 Zahnarztpraxen als Dauerkunden. Hohe Qualitätsspezialisierung (CAD/CAM-Technologie). Inhaberin plant Rückzug in 3–5 Jahren.',
    dealHypothesis: 'Defensives Geschäftsmodell mit sehr stabilem Kundenstamm. Dental-Outsourcing wächst. Praxis-Konsolidierungen erhöhen Nachfragedruck auf spezialisierte Labors. Gute Roll-up-Grundlage.',
    outreachAngle: 'Inhaberin über Qualitätssicherung und Kontinuität für ihre Zahnarzt-Kunden ansprechen. Gemeinsam Übergang planen statt Exit-Druck.',
    signals: [
      'Inhaberin: 63 Jahre',
      'Wiederkehrender Umsatz: >95% aus Jahresverträgen',
      'Kundenbindung: Durchschnitt 9 Jahre pro Praxis',
      'Keine aktive Stellenausschreibung für Führungsrollen',
    ],
    redFlags: [
      'Regulierungsrisiko Dentalbereich (CE-Zertifizierung)',
      'Technologieinvestitionen (CAD/CAM) können komplex sein',
    ],
    sources: ['Zefix', 'SHAB', 'Website-Analyse'],
    scoreBreakdown: { strategicFit: 80, companyQuality: 78, salesProbability: 76, outreachPotential: 74, dataQuality: 72 },
    createdAt: '2026-07-05',
  },
  {
    id: 'mock-004',
    name: 'Weberei Spirig AG',
    legalForm: 'AG',
    canton: 'SG',
    industry: 'Technische Textilien / Spezialstoffe',
    website: 'www.spirig-textil.ch',
    listingUrl: 'https://www.zefix.ch/de/search/entity/list/firm?name=Spirig',
    listingPlatform: 'Zefix',
    type: 'off-market',
    score: 76,
    confidence: 'A',
    status: 'shortlisted',
    pipelineStage: 'shortlisted',
    dealReason: '3. Familiengeneration, Übergabe unklar — Firma seit 1948',
    founded: 1948,
    employees: 45,
    revenueChf: 8_500_000,
    ebitdaChf: 1_190_000,
    summary: 'Traditionsunternehmen der technischen Textilindustrie. Kernkompetenz in Spezialgeweben für Bau, Filtration und Medizin. 78 Jahre Marktpräsenz, Exportquote 40%.',
    dealHypothesis: 'Dritte Generation ohne klare Nachfolgeregelung. Nischenprodukt mit hohem Know-how-Schutz. Exportmärkte bieten Skalierungspotenzial. Historisch sehr stabile Kunden (Bauzulieferer und Industriefilter).',
    outreachAngle: 'Familie Spirig auf dem Thema Marktnachfolge und strategische Partnerschaft ansprechen — Tradition und Qualität erhalten.',
    signals: [
      'Familienunternehmen 3. Generation',
      'Firmengründung 1948 — 78 Jahre Betrieb',
      'Personenname Spirig im Firmennamen',
      'SHAB: Keine Kadermutation seit 4 Jahren',
      'Exportumsatz stabil (D, AT, IT)',
    ],
    redFlags: [
      'Preisdruck durch asiatische Standardweber',
      'Digitalisierungsrückstand in Vertrieb',
    ],
    sources: ['Zefix (CHE-345.678.901)', 'SHAB', 'Website-Analyse', 'Handelsregister SG'],
    scoreBreakdown: { strategicFit: 78, companyQuality: 82, salesProbability: 72, outreachPotential: 68, dataQuality: 90 },
    createdAt: '2026-07-03',
  },
  {
    id: 'mock-005',
    name: 'Logistik Reithaar GmbH',
    legalForm: 'GmbH',
    canton: 'SH',
    industry: 'Transport & Logistik',
    listingUrl: 'https://www.zefix.ch/de/search/entity/list/firm?name=Reithaar',
    listingPlatform: 'Zefix',
    type: 'off-market',
    score: 73,
    confidence: 'B',
    status: 'new',
    pipelineStage: 'new-qualified',
    dealReason: 'GF 68 J., Rücktritt VP gemäss SHAB, kein Nachfolger',
    founded: 2003,
    employees: 22,
    revenueChf: 5_700_000,
    ebitdaChf: 570_000,
    summary: 'Regionaler Transport- und Logistikanbieter mit starker Position im Kanton Schaffhausen und angrenzenden deutschen Märkten (Hegau). Eigene Flotte, Lagerkapazitäten.',
    dealHypothesis: 'Klassisches Owner-Managed-Logistik-KMU. Grenzlage SH/DE bietet Wettbewerbsvorteil. Eigene Flotte und Lager sind aktiviert — Asset-Play möglich. Konsolidierungsmarkt, ideal für Roll-up.',
    outreachAngle: 'Herrn Reithaar direkt ansprechen: Nachhaltigkeit der Flotte, Übergabe an professionellen Partner.',
    signals: [
      'GF: 68 Jahre (SHAB-Eintrag)',
      'Rücktritt aus Verwaltungsrat VP letzten Oktober',
      'Keine offene Nachfolge kommuniziert',
      'Eigene Lagerimmobilien (Wertsteigerungspotenzial)',
    ],
    redFlags: [
      'Treibstoffkostenrisiko (Margendruck)',
      'Fahrermarkt sehr angespannt',
      'Asset-heavy: Flottenrenovierung nötig',
    ],
    sources: ['Zefix', 'SHAB 2025-10-08', 'Website-Analyse'],
    scoreBreakdown: { strategicFit: 72, companyQuality: 74, salesProbability: 78, outreachPotential: 68, dataQuality: 74 },
    createdAt: '2026-07-07',
  },
  {
    id: 'mock-006',
    name: 'Hürlimann Elektro AG',
    legalForm: 'AG',
    canton: 'AG',
    industry: 'Elektroinstallation & Haustechnik',
    listingUrl: 'https://www.zefix.ch/de/search/entity/list/firm?name=H%C3%BCrlimann+Elektro',
    listingPlatform: 'Zefix',
    type: 'off-market',
    score: 69,
    confidence: 'C',
    status: 'new',
    pipelineStage: 'new-qualified',
    dealReason: 'Inhaber 60 J., prüft laut SHAB-Rücktritt möglichen Verkauf',
    founded: 1988,
    employees: 18,
    revenueChf: 3_100_000,
    ebitdaChf: 310_000,
    summary: 'Regionaler Elektroinstallateur mit breitem Kundenstamm (Neubau, Renovation, Industriekunden). Gute Reputation im Kanton AG. Inhaber signalisiert über SHAB-Eintrag mögliche Veränderung.',
    dealHypothesis: 'Elektrohandwerk konsolidiert sich. Guter Zeitpunkt für Kauf vor weiterer Konsolidierung. Kundenstamm aus Bau/Renovation ist zyklisch, aber strukturell stabil.',
    outreachAngle: 'Herrn Hürlimann über Nachfolgethematik ansprechen, auf SHAB-Eintrag reagieren.',
    signals: [
      'Inhaber: 60 Jahre',
      'SHAB: Rücktritt als VR-Präsident',
      'Personenname im Firmennamen',
    ],
    redFlags: [
      'Datenlage dünn — Confidence C',
      'Stark abhängig von lokaler Bautätigkeit',
      'Zertifizierungsaufwand bei Eigentümerwechsel',
    ],
    sources: ['Zefix', 'SHAB 2026-02-20'],
    scoreBreakdown: { strategicFit: 70, companyQuality: 68, salesProbability: 72, outreachPotential: 65, dataQuality: 45 },
    createdAt: '2026-07-06',
  },
  {
    id: 'mock-007',
    name: 'Import- und Handelsunternehmen (B2B) – Schweiz',
    legalForm: 'GmbH',
    canton: 'BS',
    industry: 'Grosshandel / B2B-Import',
    listingUrl: 'https://www.companymarket.ch/listing/import-handelsunternehmen-b2b-schweiz',
    listingPlatform: 'companymarket.ch',
    type: 'on-market',
    score: 69,
    confidence: 'B',
    status: 'new',
    pipelineStage: 'new-qualified',
    dealReason: 'Auf companymarket.ch inseriert — Inhaber sucht Käufer',
    employees: 6,
    revenueChf: 700_000,
    ebitdaChf: 280_000,
    summary: 'Kleines Import- und Handelsunternehmen mit etablierten Lieferantenbeziehungen in Asien. Fokus auf B2B-Kunden in der Schweiz. EBITDA-Marge von 40% ist sehr attraktiv.',
    dealHypothesis: 'EBITDA-Marge von 40% ist aussergewöhnlich für Handelsunternehmen — deutet auf starke Nischenposition oder exklusive Lieferverträge hin. Verifizierungsbedarf hoch. Wenn Zahlen stimmen, sehr interessantes kleines Asset.',
    outreachAngle: 'Direktkontakt über companymarket.ch Plattform. Interesse signalisieren, Treffen vereinbaren.',
    signals: [
      'Öffentlich zum Verkauf inseriert',
      'EBITDA-Marge ~40% (sehr hoch für Handel)',
      'Kleines, fokussiertes Team (6 Personen)',
      'Keine Namennennung — diskrete Transaktion',
    ],
    redFlags: [
      'Zahlen nicht verifiziert (Listing-Angaben)',
      'Abhängigkeit von Lieferanten unklar',
      'Kleingrösse — Skalierung begrenzt',
    ],
    sources: ['companymarket.ch'],
    scoreBreakdown: { strategicFit: 72, companyQuality: 70, salesProbability: 88, outreachPotential: 80, dataQuality: 45 },
    createdAt: '2026-07-07',
  },
  {
    id: 'mock-008',
    name: 'Druckerei Schönbuhl AG',
    legalForm: 'AG',
    canton: 'BE',
    industry: 'Druckvorstufe & Digitaldruck',
    listingUrl: 'https://www.firmenboerse.com/inserat/druckerei-schoenbuhl-ag',
    listingPlatform: 'firmenboerse.com',
    type: 'on-market',
    score: 65,
    confidence: 'B',
    status: 'shortlisted',
    pipelineStage: 'shortlisted',
    dealReason: 'Auf firmenboerse.com inseriert — Inhaber sucht Nachfolger',
    founded: 1992,
    employees: 14,
    revenueChf: 2_200_000,
    ebitdaChf: 242_000,
    summary: 'Digitale Druckerei mit 34 Jahren Marktpräsenz. Fokus auf professionelle Druckvorstufe, Grossformatdruck und Veredelung. Stammkunden aus KMU, Verlagen und Agenturen.',
    dealHypothesis: 'Druckmarkt unter Druck durch Digitalisierung, aber Spezialdruck (Grossformat, Veredelung) wächst. Bestehender Kundenstamm ist wertvoll. Niedrige Bewertung antizipiert.',
    outreachAngle: 'Inhaber über firmenboerse.com kontaktieren. Schwerpunkt: Mitarbeiter erhalten, Kundenkontinuität.',
    signals: [
      'Öffentlich inseriert auf firmenboerse.com',
      'Inhaberwechsel kommuniziert',
      '34 Jahre Marktpräsenz',
      'Stammkunden aus Agenturbereich (stabil)',
    ],
    redFlags: [
      'Druckmarkt strukturell unter Druck',
      'Technologieinvestitionen nötig',
      'Branche: AI-Disruption mittel',
    ],
    sources: ['firmenboerse.com'],
    scoreBreakdown: { strategicFit: 60, companyQuality: 66, salesProbability: 90, outreachPotential: 82, dataQuality: 60 },
    createdAt: '2026-07-04',
  },
  {
    id: 'mock-009',
    name: 'Beauty Concept Basel GmbH',
    legalForm: 'GmbH',
    canton: 'BS',
    industry: 'Kosmetik & Beauty Services',
    listingUrl: 'https://www.companymarket.ch/listing/beauty-concept-basel',
    listingPlatform: 'companymarket.ch',
    type: 'on-market',
    score: 61,
    confidence: 'C',
    status: 'outreach-ready',
    pipelineStage: 'outreach-ready',
    dealReason: 'Auf companymarket.ch inseriert — Inhaberin zieht sich zurück',
    employees: 7,
    summary: 'Etablierter Kosmetiksalon in Basel mit treuer Stammkundschaft. Inhaberin hat das Unternehmen 18 Jahre geführt und sucht Nachfolgerin.',
    dealHypothesis: 'Kleines lokales Dienstleistungsunternehmen. Geringe Investierbarkeit für institutionelle Käufer, aber interessant als Plattform für Beauty-Roll-up oder Einzelperson.',
    outreachAngle: 'Direktkontakt über Inserat. Fokus auf Kontinuität der Stammkundschaft.',
    signals: [
      'Öffentlich inseriert',
      'Inhaberin kommuniziert Abgabe',
      '18 Jahre Betrieb — etabliert',
    ],
    redFlags: [
      'Personenabhängigkeit sehr hoch (Beauty = People Business)',
      'Geringe Skalierbarkeit',
      'Datenlage dünn',
    ],
    sources: ['companymarket.ch'],
    scoreBreakdown: { strategicFit: 50, companyQuality: 62, salesProbability: 92, outreachPotential: 70, dataQuality: 35 },
    createdAt: '2026-07-05',
  },
  {
    id: 'mock-010',
    name: 'Motorradgeschäft Zürich GmbH',
    legalForm: 'GmbH',
    canton: 'ZH',
    industry: 'Fahrzeughandel & Service',
    listingUrl: 'https://www.companymarket.ch/listing/motorradgeschaeft-zuerich',
    listingPlatform: 'companymarket.ch',
    type: 'on-market',
    score: 58,
    confidence: 'C',
    status: 'contacted',
    pipelineStage: 'contacted',
    dealReason: 'Auf companymarket.ch inseriert',
    summary: 'Motorrad-Händler und Werkstatt in der Agglomeration Zürich. Markenvertreter und freier Service.',
    dealHypothesis: 'Nischenmarkt mit treuer Community. Motorräder als Lifestyle-Produkt sind robust. Bewertung abhängig von Lagerbestand.',
    outreachAngle: 'Über Plattform kontaktiert — warten auf Antwort.',
    signals: ['Öffentlich inseriert', 'Autobranche: Nachfrage stabil'],
    redFlags: ['Hoher Lagerbestand (Kapitalintensiv)', 'Regulierung E-Mobilität', 'Saisonales Geschäft'],
    sources: ['companymarket.ch'],
    scoreBreakdown: { strategicFit: 55, companyQuality: 58, salesProbability: 88, outreachPotential: 65, dataQuality: 30 },
    createdAt: '2026-07-02',
  },
  {
    id: 'mock-011',
    name: 'Sportsbar Zürich Nord GmbH',
    legalForm: 'GmbH',
    canton: 'ZH',
    industry: 'Gastronomie / F&B',
    listingUrl: 'https://www.companymarket.ch/listing/sportsbar-zuerich-nord',
    listingPlatform: 'companymarket.ch',
    type: 'on-market',
    score: 52,
    confidence: 'C',
    status: 'reviewed',
    pipelineStage: 'in-review',
    dealReason: 'Auf companymarket.ch inseriert — Inhaber-Exit',
    employees: 12,
    revenueChf: 1_200_000,
    summary: 'Etablierte Sportsbar mit Events und Spielübertragungen. Gute Lage in Zürich Nord. Bekannte Marke im Quartier.',
    dealHypothesis: 'Gastronomie ist risikoreich und personalintensiv. Nur relevant als strategische Ergänzung zu bestehendem F&B-Portfolio.',
    outreachAngle: 'Nicht priorisieren.',
    signals: ['Öffentlich inseriert', 'Gute Lage ZH-Nord'],
    redFlags: ['Hohe Personalintensität', 'Mietrisiko', 'COVID-Nachwehen in Eventbetrieb', 'Margen im F&B sehr dünn'],
    sources: ['companymarket.ch'],
    scoreBreakdown: { strategicFit: 45, companyQuality: 52, salesProbability: 85, outreachPotential: 60, dataQuality: 30 },
    createdAt: '2026-07-01',
  },
  {
    id: 'mock-012',
    name: 'Restaurant Luzern GmbH',
    legalForm: 'GmbH',
    canton: 'LU',
    industry: 'Gastronomie / Restaurant',
    listingUrl: 'https://www.companymarket.ch/listing/restaurant-luzern',
    listingPlatform: 'companymarket.ch',
    type: 'on-market',
    score: 44,
    confidence: 'C',
    status: 'rejected',
    pipelineStage: 'rejected',
    dealReason: 'Auf companymarket.ch inseriert',
    summary: 'Mittleres Restaurant in Luzern. Traditionelle Küche.',
    dealHypothesis: 'Zu kleines, zu risikoreiches Asset. Keine strategische Relevanz.',
    outreachAngle: '—',
    signals: ['Öffentlich inseriert'],
    redFlags: ['F&B — strukturell unattraktiv', 'Personalintensiv', 'Mietabhängig', 'Keine Skalierung möglich'],
    sources: ['companymarket.ch'],
    scoreBreakdown: { strategicFit: 35, companyQuality: 45, salesProbability: 80, outreachPotential: 45, dataQuality: 25 },
    createdAt: '2026-06-28',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function dealsByStage(): Record<PipelineStage, Deal[]> {
  const map: Record<string, Deal[]> = {}
  for (const s of PIPELINE_STAGES) map[s.id] = []
  for (const d of DEALS) map[d.pipelineStage]?.push(d)
  return map as Record<PipelineStage, Deal[]>
}

export function topDeals(n = 5): Deal[] {
  return [...DEALS].sort((a, b) => b.score - a.score).slice(0, n)
}

export function scoreColor(score: number): string {
  if (score >= 60) return '#00B88A'
  if (score >= 45) return '#E8920A'
  return '#8B92B2'
}

export function scoreBg(score: number): string {
  if (score >= 60) return 'rgba(0,184,138,0.12)'
  if (score >= 45) return 'rgba(232,146,10,0.12)'
  return 'rgba(139,146,178,0.10)'
}

export function confidenceLabel(c: Confidence): string {
  return c === 'A' ? 'Hoch' : c === 'B' ? 'Mittel' : 'Niedrig'
}
