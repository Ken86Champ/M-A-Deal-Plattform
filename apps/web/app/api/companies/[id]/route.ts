import { NextRequest, NextResponse } from 'next/server'
import { getCompanyFull } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const company = await getCompanyFull(id)
    return NextResponse.json(company)
  } catch (err) {
    console.error('[GET /api/companies/[id]]', err)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
