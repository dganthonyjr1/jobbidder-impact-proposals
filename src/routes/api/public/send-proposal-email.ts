import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { computeTotals, fmt, type MaterialLine, type LaborLine } from '@/lib/pricing'
import { scheduleProposalFollowups } from '@/lib/followups.server'
import { sendSmsViaGHL, sendEmailViaGHL, type GhlCredentials } from '@/lib/ghl.server'
import { scopeReviewBlocksSend, withScopeReviewAcknowledged, type StoredScopeCheck } from '@/lib/scope-review-gate'

const SITE_NAME = 'Jobbidder'
const FROM_DOMAIN = 'jobbidder.io'

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  recipientEmail: z.string().email().max(254),
  acknowledgeScopeWarning: z.boolean().optional().default(false),
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
        const { proposalId, recipientEmail, acknowledgeScopeWarning } = parsed
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

        // 2. Scope-completeness review gate — an AI-generated proposal that is
        // likely missing priced scope must not reach the client unreviewed. The
        // proposal page already shows this as a warning banner to the owner;
        // this is where that warning is actually enforced instead of skippable.
        const rawInput = (proposal.raw_input || {}) as Record<string, unknown>
        const scopeCheck = rawInput.scope_check as StoredScopeCheck | undefined
        if (scopeReviewBlocksSend(scopeCheck, acknowledgeScopeWarning)) {
          return Response.json(
            {
              success: false,
              reason: 'scope_review_required',
              error: 'This proposal may be missing priced scope. Review the flagged items on the proposal page and confirm before sending.',
              missing: scopeCheck!.missing,
            },
            { status: 409 },
          )
        }
        const acknowledgedScopeCheck = withScopeReviewAcknowledged(scopeCheck, acknowledgeScopeWarning)

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

        // 3. Suppression check
        const { data: suppressed, error: suppressedError } = await supabaseAdmin
          .from('suppressed_emails')
          .select('email')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (suppressedError) console.error('[send-proposal-email] Suppression check failed:', suppressedError.message)
        if (suppressed) {
          return Response.json({ success: false, reason: 'email_suppressed' }, { status: 200 })
        }

        // 4. Compute totals
        const materials = (proposal.materials || []) as MaterialLine[]
        const labor = (proposal.labor || []) as LaborLine[]
        const tier = (proposal.selected_tier as any) || 'better'
        const totals = computeTotals(materials, labor, tier, Number(proposal.tax_rate) || 0.07, Number(proposal.overhead_percentage) || 0)

        const origin = new URL(request.url).origin
        const proposalUrl = `${origin}/p/${proposal.id}`

        const proposalLang = (proposal as any).language || 'en'

        const templateData = {
          clientName: proposal.client_name,
          businessName: contractor?.business_name,
          proposalNumber: proposal.proposal_number,
          jobAddress: proposal.job_address,
          tradeType: proposal.trade_type,
          totalAmount: fmt(totals.grandTotal),
          proposalUrl,
          language: proposalLang,
        }

        // 5. Render email template
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

        // 6. Send email via GHL
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

        // 7. Update proposal status, recording the scope-review event if this
        // send only went through because a human just acknowledged the warning.
        await supabaseAdmin
          .from('proposals')
          .update({
            client_email: normalizedEmail,
            status: 'sent',
            expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            ...(acknowledgedScopeCheck !== scopeCheck
              ? { raw_input: { ...rawInput, scope_check: acknowledgedScopeCheck } as any }
              : {}),
          })
          .eq('id', proposal.id)

        // 8. Schedule follow-up cadence (24h / 72h / 7d). Non-fatal on error.
        try {
          await scheduleProposalFollowups(proposal.id)
        } catch (e) {
          console.warn('schedule followups failed:', (e as Error).message)
        }

        // 9. Send SMS with the proposal link if client phone is on file
        const SMS_TEMPLATES: Record<string, (b: string, n: string, a: string, u: string) => string> = {
          en: (b, n, a, u) => `${b} sent your proposal ${n}${a ? ` (${a})` : ''}: ${u} — Reply STOP to opt out`,
          es: (b, n, a, u) => `${b} envió tu propuesta ${n}${a ? ` (${a})` : ''}: ${u} — Responde STOP para cancelar`,
          fr: (b, n, a, u) => `${b} vous a envoyé la proposition ${n}${a ? ` (${a})` : ''}: ${u} — Répondez STOP pour vous désabonner`,
          pt: (b, n, a, u) => `${b} enviou sua proposta ${n}${a ? ` (${a})` : ''}: ${u} — Responda STOP para cancelar`,
          ht: (b, n, a, u) => `${b} voye pwopozisyon ${n} pou ou${a ? ` (${a})` : ''}: ${u} — Reponn STOP pou kanpe`,
        }
        const smsTpl = SMS_TEMPLATES[proposalLang] || SMS_TEMPLATES.en

        let smsRes: any = { skipped: 'no client phone' }
        if (proposal.client_phone) {
          const smsBody = smsTpl(businessName, proposal.proposal_number, totals.grandTotal ? fmt(totals.grandTotal) : '', proposalUrl)
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
