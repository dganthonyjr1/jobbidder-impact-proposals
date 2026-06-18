import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { computeTotals, fmt, type MaterialLine, type LaborLine } from '@/lib/pricing'
import { scheduleProposalFollowups } from '@/lib/followups.server'
import { sendSmsViaGHL, sendEmailViaGHL, type GhlCredentials } from '@/lib/ghl.server'

const SITE_NAME = 'Jobbidder'
const FROM_DOMAIN = 'jobbidder.io'

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  recipientEmail: z.string().email().max(254),
})

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

        const { data: contractor } = proposal.contractor_id
          ? await supabaseAdmin
              .from('contractors')
              .select('business_name, phone, email')
              .eq('id', proposal.contractor_id)
              .maybeSingle()
          : { data: null as { business_name: string | null; phone: string | null; email: string | null } | null }

        const { data: integration, error: integrationError } = proposal.contractor_id
          ? await supabaseAdmin
              .from('contractor_integrations')
              .select('ghl_api_token, ghl_location_id, ghl_from_number, ghl_from_email, contractor_sms_notifications_enabled')
              .eq('contractor_id', proposal.contractor_id)
              .maybeSingle()
          : { data: null as any, error: null as any }

        if (integrationError) console.warn('contractor integration lookup failed:', integrationError.message)

        const ghlCredentials: GhlCredentials | null =
          integration?.ghl_api_token && integration?.ghl_location_id
            ? {
                apiToken: integration.ghl_api_token,
                locationId: integration.ghl_location_id,
                fromNumber: integration.ghl_from_number,
                fromEmail: integration.ghl_from_email,
              }
            : null

        // 2. Suppression check
        const { data: suppressed } = await supabaseAdmin
          .from('suppressed_emails')
          .select('email')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (suppressed) {
          return Response.json({ success: false, reason: 'email_suppressed' }, { status: 200 })
        }

        // 3. Compute totals
        const materials = (proposal.materials || []) as MaterialLine[]
        const labor = (proposal.labor || []) as LaborLine[]
        const tier = (proposal.selected_tier as any) || 'better'
        const totals = computeTotals(materials, labor, tier, Number(proposal.tax_rate) || 0.07)

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

        // 4. Render email template
        const template = TEMPLATES['proposal-ready']
        if (!template) {
          return Response.json({ error: 'Template missing' }, { status: 500 })
        }
        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const plainText = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        // 5. Send email via GHL
        // For SIA-backed contractors: use their GHL from_email (their own domain/address)
        // For all others: send from support@jobbidder.io with contractor's email as reply-to
        const businessName = contractor?.business_name || SITE_NAME
        const isSiaClient = !!(integration?.ghl_api_token && integration?.ghl_location_id)
        const fromEmail = isSiaClient
          ? (integration?.ghl_from_email || `support@${FROM_DOMAIN}`)
          : `support@${FROM_DOMAIN}`
        const replyTo = isSiaClient
          ? null
          : (contractor?.email || null)

        const emailRes = await sendEmailViaGHL({
          to: normalizedEmail,
          subject,
          html,
          text: plainText,
          fromEmail,
          replyTo,
          contactName: proposal.client_name,
          contactPhone: proposal.client_phone,
          tags: ['jobbidder', 'proposal'],
          credentials: ghlCredentials,
        })

        if (!emailRes.ok) {
          console.error('GHL email send failed:', emailRes.error)
          return Response.json(
            { error: 'Failed to send email', details: emailRes.error },
            { status: 500 }
          )
        }

        // 6. Update proposal status
        await supabaseAdmin
          .from('proposals')
          .update({
            client_email: normalizedEmail,
            status: 'sent',
            expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', proposal.id)

        // 7. Schedule follow-up cadence (24h / 72h / 7d). Non-fatal on error.
        try {
          await scheduleProposalFollowups(proposal.id)
        } catch (e) {
          console.warn('schedule followups failed:', (e as Error).message)
        }

        // 8. Send SMS with the proposal link if client phone is on file
        let smsRes: any = { skipped: 'no client phone' }
        if (proposal.client_phone) {
          const smsBody = `${businessName} sent your proposal ${proposal.proposal_number}${totals.grandTotal ? ` (${fmt(totals.grandTotal)})` : ''}: ${proposalUrl} — Reply STOP to opt out`
          // Use contractor's own phone as the from number if no GHL-specific number is configured
          const smsCredentials: GhlCredentials | null = ghlCredentials
            ? ghlCredentials
            : contractor?.phone
              ? { fromNumber: contractor.phone }
              : null
          smsRes = await sendSmsViaGHL({
            to: proposal.client_phone,
            body: smsBody,
            contactName: proposal.client_name,
            contactEmail: normalizedEmail,
            tags: ['jobbidder', 'proposal'],
            credentials: smsCredentials,
          })
          if (!smsRes.ok) {
            console.warn('GHL SMS send failed:', smsRes.error)
          }
        }

        return Response.json({
          success: true,
          email: { ok: true, messageId: emailRes.messageId },
          sms: smsRes,
        })
      },
    },
  },
})
