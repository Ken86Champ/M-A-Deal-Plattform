import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

// One-time migration endpoint — DELETE after use
export async function GET() {
  const statements = [
    `ALTER TABLE enrichment ADD COLUMN IF NOT EXISTS contact_email text`,
    `ALTER TABLE enrichment ADD COLUMN IF NOT EXISTS contact_email_source text`,
    `ALTER TABLE outreach ADD COLUMN IF NOT EXISTS recipient_email text`,
    `ALTER TABLE outreach ADD COLUMN IF NOT EXISTS sender_email text`,
    `ALTER TABLE outreach ADD COLUMN IF NOT EXISTS sent_at timestamptz`,
  ]

  const results: Record<string, string> = {}

  for (const stmt of statements) {
    const { error } = await supabaseAdmin.rpc('exec_ddl', { statement: stmt })
    if (error) {
      // Try via raw query
      const { error: e2 } = await (supabaseAdmin as any).from('_migrations').select().limit(0)
      results[stmt.substring(0, 50)] = error.message
    } else {
      results[stmt.substring(0, 50)] = 'OK'
    }
  }

  return NextResponse.json({ results })
}
