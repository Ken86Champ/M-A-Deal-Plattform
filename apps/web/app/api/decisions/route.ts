import { NextRequest, NextResponse } from 'next/server'
import { saveDecision } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { company_id, kind, reason } = await req.json()
    if (!company_id || !kind) {
      return NextResponse.json({ error: 'company_id und kind sind Pflicht' }, { status: 400 })
    }
    const decision = await saveDecision(company_id, kind, reason)
    return NextResponse.json(decision, { status: 201 })
  } catch (err) {
    console.error('[POST /api/decisions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
