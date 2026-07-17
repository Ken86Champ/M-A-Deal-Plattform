import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

// ── POST /api/outreach/send ────────────────────────────────────────────────────
// Sendet den Teil-2-Brief per E-Mail.
//
// Body: {
//   company_id:      string   — UUID (oder demo-*)
//   company_name:    string
//   recipient_email: string   — Empfänger
//   recipient_name:  string
//   sender_email:    string   — Absender (frei wählbar, muss Resend-Domain nutzen)
//   sender_name:     string
//   letter_draft:    string
// }

export async function POST(req: NextRequest) {
  try {
    const {
      company_id,
      company_name,
      recipient_email,
      recipient_name,
      sender_email,
      sender_name,
      letter_draft,
    } = await req.json() as {
      company_id:      string
      company_name:    string
      recipient_email: string
      recipient_name:  string
      sender_email:    string
      sender_name:     string
      letter_draft:    string
    }

    // ── Auto-lookup recipient email if not provided ───────────────────────────
    let finalRecipientEmail = recipient_email
    if (!finalRecipientEmail && !company_id.startsWith('demo-')) {
      // Try to get from enrichment table
      const { data: enr } = await supabaseAdmin
        .from('enrichment')
        .select('contact_email')
        .eq('company_id', company_id)
        .single()
      if (enr?.contact_email) finalRecipientEmail = enr.contact_email
    }

    if (!finalRecipientEmail) {
      return NextResponse.json({ error: 'Keine Empfänger-E-Mail gefunden. Bitte manuell eintragen.' }, { status: 400 })
    }

    // ── Validation ──────────────────────────────────────────────────────────
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!company_id || !recipient_email || !letter_draft || !sender_email) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }
    if (!emailRx.test(finalRecipientEmail)) {
      return NextResponse.json({ error: 'Ungültige Empfänger-E-Mail' }, { status: 400 })
    }
    if (!emailRx.test(sender_email)) {
      return NextResponse.json({ error: 'Ungültige Absender-E-Mail' }, { status: 400 })
    }

    const fromStr = sender_name ? `${sender_name} <${sender_email}>` : sender_email

    // ── 1. Decision + Outreach in Supabase ──────────────────────────────────
    let decisionId:  string | null = null
    let outreachId:  string | null = null

    if (!company_id.startsWith('demo-')) {
      const [dec, out] = await Promise.allSettled([
        supabaseAdmin.from('decisions')
          .insert({ company_id, kind: 'ansprechen' })
          .select('id').single(),
        supabaseAdmin.from('outreach')
          .insert({ company_id, status: 'pending', kanal: 'email', letter_draft })
          .select('id').single(),
      ])
      if (dec.status === 'fulfilled' && !dec.value.error) decisionId  = dec.value.data?.id ?? null
      if (out.status === 'fulfilled' && !out.value.error) outreachId  = out.value.data?.id ?? null
    }

    // ── 2. E-Mail senden ────────────────────────────────────────────────────
    const htmlBody = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;font-size:14px;color:#1a1a1a;max-width:600px;margin:0 auto;padding:40px 20px;line-height:1.8;">
      ${letter_draft.split('\n').map(l => l.trim() ? `<p style="margin:0 0 18px">${l}</p>` : '<br>').join('')}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
      <p style="font-size:11px;color:#9ca3af">Diese Nachricht wurde vertraulich an Sie gesendet. Bitte antworten Sie direkt.</p>
    </body></html>`

    const { data: emailData, error: emailErr } = await resend.emails.send({
      from:    fromStr,
      to:      finalRecipientEmail,
      replyTo: sender_email,
      subject: `Vertrauliche Anfrage — ${company_name}`,
      text:    letter_draft,
      html:    htmlBody,
    })

    if (emailErr) {
      console.error('[send] Resend error:', emailErr)
      return NextResponse.json({ error: emailErr.message }, { status: 502 })
    }

    // ── 3. Outreach → sent ──────────────────────────────────────────────────
    if (outreachId) {
      await supabaseAdmin.from('outreach').update({ status: 'sent' }).eq('id', outreachId)
    }

    return NextResponse.json({ success: true, email_id: emailData?.id, outreach_id: outreachId, decision_id: decisionId })

  } catch (err) {
    console.error('[POST /api/outreach/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


// ── POST /api/outreach/send ────────────────────────────────────────────────────
// Sendet den Teil-2-Brief per E-Mail, erstellt Decision + Outreach-Eintrag.
//
// Body: {
//   company_id:      string   — UUID der Firma (oder mock-ID)
//   company_name:    string   — Anzeigename für Logs
//   recipient_email: string   — Empfänger-Adresse
//   recipient_name:  string   — Ansprechperson
//   letter_draft:    string   — Brieftext (bereits ohne Preis/Score)
//   sender_name?:    string   — Absender (default aus ENV)
// }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      company_id:      string
      company_name:    string
      recipient_email: string
      recipient_name:  string
      letter_draft:    string
      sender_name?:    string
    }

    const {
      company_id,
      company_name,
      recipient_email,
      recipient_name,
      letter_draft,
      sender_name,
    } = body

    // ── Validation ─────────────────────────────────────────────────────────
    if (!company_id || !recipient_email || !letter_draft) {
      return NextResponse.json(
        { error: 'company_id, recipient_email und letter_draft sind Pflicht' },
        { status: 400 },
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev'
    const fromName  = sender_name ?? process.env.RESEND_FROM_NAME ?? 'Origination'

    // ── 1. Decision record (ansprechen) ─────────────────────────────────────
    // Nur für echte Supabase-IDs (nicht demo-*)
    let decisionId: string | null = null
    if (!company_id.startsWith('demo-')) {
      const { data: dec, error: decErr } = await supabaseAdmin
        .from('decisions')
        .insert({ company_id, kind: 'ansprechen' })
        .select('id')
        .single()
      if (decErr) console.warn('[send] Decision insert:', decErr.message)
      else decisionId = dec?.id ?? null
    }

    // ── 2. Outreach record ────────────────────────────────────────────────
    let outreachId: string | null = null
    if (!company_id.startsWith('demo-')) {
      const { data: out, error: outErr } = await supabaseAdmin
        .from('outreach')
        .insert({
          company_id,
          status:       'pending',
          kanal:        'email',
          letter_draft,
        })
        .select('id')
        .single()
      if (outErr) console.warn('[send] Outreach insert:', outErr.message)
      else outreachId = out?.id ?? null
    }

    // ── 3. E-Mail senden via Resend ───────────────────────────────────────
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Georgia, serif; font-size: 14px; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px; line-height: 1.7;">
          ${letter_draft
            .split('\n')
            .map(line => line.trim() ? `<p style="margin: 0 0 16px 0;">${line}</p>` : '<br>')
            .join('\n')}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="font-size: 11px; color: #9ca3af;">
            Diese Nachricht wurde vertraulich an Sie gesendet. Bitte antworten Sie direkt auf diese E-Mail.
          </p>
        </body>
      </html>
    `

    const { data: emailData, error: emailErr } = await resend.emails.send({
      from:    `${fromName} <${fromEmail}>`,
      to:      recipient_email,
      subject: `Vertrauliche Anfrage — ${company_name}`,
      text:    letter_draft,
      html:    htmlBody,
    })

    if (emailErr) {
      console.error('[send] Resend error:', emailErr)
      return NextResponse.json(
        { error: 'E-Mail konnte nicht gesendet werden', detail: emailErr.message },
        { status: 502 },
      )
    }

    // ── 4. Outreach auf 'sent' setzen ──────────────────────────────────────
    if (outreachId) {
      await supabaseAdmin
        .from('outreach')
        .update({ status: 'sent' })
        .eq('id', outreachId)
    }

    return NextResponse.json({
      success:    true,
      email_id:   emailData?.id,
      outreach_id: outreachId,
      decision_id: decisionId,
    })

  } catch (err) {
    console.error('[POST /api/outreach/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
