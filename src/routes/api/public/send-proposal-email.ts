import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { computeTotals, fmt, type MaterialLine, type LaborLine } from '@/lib/pricing'
import { scheduleProposalFollowups } from '@/lib/followups.server'
import { sendSmsViaGHL, type GhlCredentials } from '@/lib/ghl.server'
import { sendSms } from '@/lib/twilio.server'

const SITE_NAME = 'Bidpilot'
const SENDER_DOMAIN = 'notify.suddenimpactagency.io'
const FROM_DOMAIN = 'suddenimpactagency.io'

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  recipientEmail: z.string().email().max(254),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const Route = createFileRoute('/api/public/send-proposal-email')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }),
      POST: async ({ request }) => {
        let parsed
        try {
          parsed = BodySchema.parse(await request.json())
        } catch (e) {
          return Response.json(
            { error: 'Invalid request', details: (e as Error).message },
            { status: 400 }
          )
        }
        const { proposalId, recipientEmail } = parsed
        const normalizedEmail = recipientEmail.toLowerCase().trim()

        // 1. Load proposal + contractor
        const { data: proposal, error: pErr } = await supabaseAdmin
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .maybeSingle()
        if (pErr || !proposal) {
          return Response.json({ error: 'Proposal not found' }, { status: 404 })
        }
        const { data: contractor } = proposal.contractor_id ? await supabaseAdmin
          .from('contractors')
          .select('business_name')
          .eq('id', proposal.contractor_id)
          .maybeSingle() : { data: null as { business_name: string | null } | null }
        const { data: integration, error: integrationError } = proposal.contractor_id ? await supabaseAdmin
          .from('contractor_integrations')
          .select('ghl_api_token, ghl_location_id, ghl_from_number, ghl_from_email, contractor_sms_notifications_enabled')
          .eq('contractor_id', proposal.contractor_id)
          .maybeSingle() : { data: null as any, error: null as any }
        if (integrationError) console.warn('contractor integration lookup failed:', integrationError.message)
        const ghlCredentials: GhlCredentials | null = integration?.ghl_api_token && integration?.ghl_location_id ? {
          apiToken: integration.ghl_api_token,
          locationId: integration.ghl_location_id,
          fromNumber: integration.ghl_from_number,
          fromEmail: integration.ghl_from_email,
        } : null

        // 2. Suppression check
        const { data: suppressed } = await supabaseAdmin
          .from('suppressed_emails')
          .select('email')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (suppressed) {
          return Response.json(
            { success: false, reason: 'email_suppressed' },
            { status: 200 }
          )
        }

        // 3. Compute totals for templateData
        const materials = (proposal.materials || []) as MaterialLine[]
        const labor = (proposal.labor || []) as LaborLine[]
        const tier = (proposal.selected_tier as any) || 'better'
        const totals = computeTotals(
          materials,
          labor,
          tier,
          Number(proposal.tax_rate) || 0.07
        )

        const origin = new URL(request.url).origin
        const proposalUrl = `${origin}/p/${proposal.id}`

        const templateData = {
          clientName: proposal.client_name,
          businessName: contractor?.business_name,
          proposalNumber: proposal.proposal_number,
          jobAddress: proposal.job_address,
          tradeType: proposal.trade_type,
          totalAmount: fmt(totals.grandTotal),
          proposalUrl,
        }

        // 4. Ensure unsubscribe token
        const { data: existing } = await supabaseAdmin
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()
        let unsubscribeToken: string
        if (existing?.token && !existing.used_at) {
          unsubscribeToken = existing.token
        } else if (existing?.used_at) {
          return Response.json(
            { success: false, reason: 'email_suppressed' },
            { status: 200 }
          )
        } else {
          const token = generateToken()
          await supabaseAdmin
            .from('email_unsubscribe_tokens')
            .upsert({ email: normalizedEmail, token }, { onConflict: 'email' })
          const { data: stored } = await supabaseAdmin
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (!stored)
            return Response.json(
              { error: 'Failed to prepare email' },
              { status: 500 }
            )
          unsubscribeToken = stored.token
        }

        // 5. Render template
        const template = TEMPLATES['proposal-ready']
        if (!template)
          return Response.json(
            { error: 'Template missing' },
            { status: 500 }
          )
        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const plainText = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        // 6. Enqueue
        const messageId = crypto.randomUUID()
        await supabaseAdmin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'proposal-ready',
          recipient_email: normalizedEmail,
          status: 'pending',
        })
        const { error: enqErr } = await supabaseAdmin.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: normalizedEmail,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text: plainText,
            purpose: 'transactional',
            label: 'proposal-ready',
            idempotency_key: `proposal-${proposal.id}-${normalizedEmail}-${Date.now()}`,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })
        if (enqErr) {
          await supabaseAdmin.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'proposal-ready',
            recipient_email: normalizedEmail,
            status: 'failed',
            error_message: enqErr.message,
          })
          return Response.json(
            { error: 'Failed to enqueue email' },
            { status: 500 }
          )
        }

        // 7. Save the recipient email on the proposal (so the contractor sees it)
        await supabaseAdmin
          .from('proposals')
          .update({ client_email: normalizedEmail, status: 'sent', expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() })
          .eq('id', proposal.id)

        // 8. Schedule follow-up cadence (24h / 72h / 7d). Non-fatal on error.
        try { await scheduleProposalFollowups(proposal.id) } catch (e) { console.warn('schedule followups failed:', (e as Error).message) }

        // 9. Also send SMS with the link if a client phone is on file.
        let smsRes: any = { skipped: 'no client phone' }
        if (proposal.client_phone && integration?.contractor_sms_notifications_enabled !== false) {
          const smsBody = `${contractor?.business_name || 'Your contractor'} sent your proposal ${proposal.proposal_number}${totals.grandTotal ? ` (${fmt(totals.grandTotal)})` : ''}: ${proposalUrl}`
          smsRes = await sendSmsViaGHL({ to: proposal.client_phone, body: smsBody, credentials: ghlCredentials })
          if (!smsRes.ok && !ghlCredentials) {
            const tw = await sendSms({ to: proposal.client_phone, body: smsBody })
            if (tw.ok) smsRes = tw
          }
        } else if (proposal.client_phone) {
          smsRes = { skipped: 'contractor SMS disabled' }
        }

        return Response.json({
          success: true,
          queued: true,
          message_id: messageId,
          sms: smsRes,
        })
      },
    },
  },
})