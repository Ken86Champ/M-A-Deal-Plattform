import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Du bist ein Suchfilter-Interpreter für eine Schweizer M&A-Plattform für KMU-Akquisitionen.
Extrahiere strukturierte Filterkriterien aus der natürlichsprachigen Suchanfrage des Benutzers.
Gib NUR valides JSON zurück — kein Markdown, keine Erklärung davor oder danach.

Rückgabe-Schema (alle Felder optional, null wenn nicht erwähnt):
{
  "canton": "ZH" | null,
  "branche": "Branchenbezeichnung auf Deutsch" | null,
  "type": "on-market" | "off-market" | null,
  "umsatz_min": Zahl in CHF | null,
  "umsatz_max": Zahl in CHF | null,
  "mitarbeiter_min": Zahl | null,
  "mitarbeiter_max": Zahl | null,
  "score_min": Zahl 0-100 | null,
  "interpretation": "Ein Satz auf Deutsch: Was wurde aus der Anfrage extrahiert"
}

Kantoncodes (exakt so zurückgeben): ZH BE LU UR SZ OW NW GL ZG FR SO BS BL SH AR AI SG GR AG TG TI VD VS NE GE JU
Umsatz: "1 Mio" = 1000000, "500k" = 500000, "2.5M" = 2500000
on-market = öffentlich inseriert/zu verkaufen, off-market = latent, nicht inseriert
score_min: nur setzen wenn Benutzer explizit nach "guten", "hochwertigen" oder Score-Zahlen fragt
Branche: kurzes deutsches Stichwort (z.B. "IT", "Gastronomie", "Handwerk", "Gesundheit", "Bau")`

export async function POST(req: NextRequest) {
  const { query } = await req.json() as { query: string }
  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query fehlt' }, { status: 400 })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: 'user', content: query }],
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()

    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[api/search/interpret]', err)
    return NextResponse.json({ error: 'Interpretation fehlgeschlagen' }, { status: 500 })
  }
}
