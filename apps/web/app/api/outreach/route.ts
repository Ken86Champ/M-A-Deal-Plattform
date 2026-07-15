import { NextRequest, NextResponse } from 'next/server'
import { getOutreachQueue, supabaseAdmin } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'pending'
    const queue = await getOutreachQueue(status)
    return NextResponse.json(queue)
  } catch (err) {
    console.error('[GET /api/outreach]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, action } = await req.json() as { id: string; action: 'approve' | 'reject' }

    if (!id || !action) {
      return NextResponse.json({ error: 'id und action sind Pflicht' }, { status: 400 })
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action muss approve oder reject sein' }, { status: 400 })
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin.from('outreach').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ id, status: 'rejected' })
    }

    const { data, error } = await supabaseAdmin
      .from('outreach')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[POST /api/outreach]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
