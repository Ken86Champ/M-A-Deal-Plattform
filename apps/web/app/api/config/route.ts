import { NextRequest, NextResponse } from 'next/server'
import { getActiveConfig, createConfigVersion } from '@/lib/db'
import { validateConfig } from '@/lib/config-validator'
import type { ConfigPayload } from '@shared/types'

export async function GET() {
  try {
    const config = await getActiveConfig()
    if (!config) return NextResponse.json({ error: 'No active config found' }, { status: 404 })
    return NextResponse.json(config)
  } catch (err) {
    console.error('[GET /api/config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      payload: ConfigPayload
      prompt_text?: string
      created_by?: 'prompt' | 'manual'
    }

    const errors = validateConfig(body.payload)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validierungsfehler', details: errors }, { status: 422 })
    }

    const newVersion = await createConfigVersion(
      body.payload,
      body.prompt_text ?? null,
      body.created_by ?? 'manual'
    )

    return NextResponse.json(newVersion, { status: 201 })
  } catch (err) {
    console.error('[POST /api/config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
