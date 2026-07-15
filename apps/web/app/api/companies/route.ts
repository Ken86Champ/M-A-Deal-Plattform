import { NextRequest, NextResponse } from 'next/server'
import { getQualifiedList } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const origination = searchParams.get('origination') as 'latent' | 'listed' | null
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '500', 10), 1000)
    const statuses    = searchParams.get('statuses')?.split(',')

    const companies = await getQualifiedList({
      origination: origination ?? undefined,
      limit,
      statuses,
    })
    return NextResponse.json(companies)
  } catch (err) {
    console.error('[GET /api/companies]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
