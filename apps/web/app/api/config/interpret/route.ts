import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateConfig } from '@/lib/config-validator'
import type { ConfigPayload, ConfigInterpretResponse } from '@shared/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Du bist der Config-Übersetzer einer M&A-Origination-Plattform für Schweizer KMU.
Eingabe: aktuelle Config (JSON) + eine natürlichsprachige Änderung.
Aufgabe: Gib NUR ein JSON zurück (kein Text, kein Markdown, keine Backticks) mit exakt diesem Schema:
{
  "interpretation": "<ein Satz was du änderst und warum>",
  "new_config": { ...vollständige neue Config mit allen Feldern... },
  "diff": [ { "field": "...", "from": "...", "to": "..." } ]
}
Regeln:
- Gewichte in weights_nachfolge müssen auf genau 1.0 summieren (passe andere Gewichte proportional an)
- Gewichte in weights_invest müssen auf genau 1.0 summieren
- Ändere nur, was der Prompt verlangt; alles andere bleibt identisch
- Bei Unklarheit: konservativ bleiben, nicht raten
- thresholds.ansprechen und .beobachten: Ganzzahlen zwischen 0 und 100
- gates.ai_resilienz_min_klasse: Ganzzahl zwischen 1 und 5
- Gib ausschliesslich valides JSON zurück, keine Erklärungen davor oder danach`

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, currentConfig } = await req.json() as {
      prompt: string
      currentConfig: ConfigPayload
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt darf nicht leer sein' }, { status: 400 })
    }

    const userMessage = `Aktuelle Config:\n${JSON.stringify(currentConfig, null, 2)}\n\nÄnderung:\n${prompt}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    let parsed: ConfigInterpretResponse
    try {
      parsed = JSON.parse(stripJsonFences(rawText))
    } catch {
      return NextResponse.json(
        { error: 'LLM-Antwort ist kein valides JSON', raw: rawText },
        { status: 502 }
      )
    }

    // Server-side config validation before returning the proposal
    const errors = validateConfig(parsed.new_config)
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'LLM-generierte Config ist ungültig', details: errors, raw: parsed },
        { status: 422 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[POST /api/config/interpret]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
