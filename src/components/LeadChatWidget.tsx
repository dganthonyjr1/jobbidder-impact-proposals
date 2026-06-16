import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, CheckCircle2 } from 'lucide-react'

type Step =
  | 'greeting'
  | 'name'
  | 'phone'
  | 'phone_consent'
  | 'email'
  | 'address'
  | 'job_type'
  | 'scope'
  | 'materials'
  | 'timeline'
  | 'terms'
  | 'submitting'
  | 'done'

interface Message {
  role: 'bot' | 'user'
  text: string
}

interface Lead {
  client_name: string
  client_phone: string
  client_email: string
  job_address: string
  trade_type: string
  job_description: string
}

const QUESTIONS: Record<Step, string> = {
  greeting: "Hi! 👋 I'm the Jobbidder AI. I can get you a free, detailed Good/Better/Best estimate in about 60 seconds. Ready to start?",
  name: "What's your full name?",
  phone: "What's the best phone number to reach you?",
  phone_consent: '',
  email: "What's your email address? (Your proposal will be sent here)",
  address: "What's the project address or location? (City and state is fine if you don't have the full address yet)",
  job_type: "What type of work do you need done? (e.g. roof replacement, kitchen remodel, flooring, HVAC, painting…)",
  scope: "Please describe the scope of work in detail. What services will be performed?",
  materials: "What are the key materials or items needed for this project? (Or type 'standard' if you're not sure)",
  timeline: "Do you have a deadline or preferred timeline for this project? (Or type 'flexible' if open)",
  terms: "Any specific payment terms, conditions, or anything else you'd like included in the proposal? (Or type 'standard')",
  submitting: "Perfect! Generating your Good/Better/Best proposal now…",
  done: '',
}

const STEP_ORDER: Step[] = [
  'greeting', 'name', 'phone', 'phone_consent', 'email',
  'address', 'job_type', 'scope', 'materials', 'timeline', 'terms',
  'submitting', 'done'
]

function nextStep(current: Step): Step {
  const idx = STEP_ORDER.indexOf(current)
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)]
}

export function LeadChatWidget() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('greeting')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [lead, setLead] = useState<Partial<Lead>>({})
  const [proposalUrl, setProposalUrl] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>('mikes-roofing') // default fallback
  const [error, setError] = useState<string | null>(null)
  const [smsConsent, setSmsConsent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch default contractor slug on mount
  useEffect(() => {
    fetch('/api/public/default-contractor')
      .then((r) => r.json())
      .then((d) => { if (d.slug) setSlug(d.slug) })
      .catch(() => {}) // keep default fallback
  }, [])

  // When chat opens, show greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'bot', text: QUESTIONS.greeting }])
      setStep('greeting')
    }
  }, [open])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when open
  useEffect(() => {
    if (open && step !== 'submitting' && step !== 'done' && step !== 'phone_consent') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, step])

  function addBot(text: string) {
    setMessages((m) => [...m, { role: 'bot', text }])
  }

  function addUser(text: string) {
    setMessages((m) => [...m, { role: 'user', text }])
  }

  async function handleSend() {
    const val = input.trim()
    if (!val || step === 'submitting' || step === 'done' || step === 'phone_consent') return
    setInput('')

    if (step === 'greeting') {
      addUser(val)
      const ns = nextStep('greeting')
      setStep(ns)
      setTimeout(() => addBot(QUESTIONS[ns]), 400)
      return
    }

    addUser(val)

    const updatedLead = { ...lead }

    if (step === 'name') {
      updatedLead.client_name = val
    } else if (step === 'phone') {
      updatedLead.client_phone = val
      setLead(updatedLead)
      setStep('phone_consent')
      return
    } else if (step === 'email') {
      updatedLead.client_email = val
    } else if (step === 'address') {
      updatedLead.job_address = val
    } else if (step === 'job_type') {
      updatedLead.trade_type = val
    } else if (step === 'scope') {
      // Accumulate description
      updatedLead.job_description = val
    } else if (step === 'materials') {
      if (val.toLowerCase() !== 'standard') {
        updatedLead.job_description = (updatedLead.job_description || '') + `. Materials: ${val}`
      }
    } else if (step === 'timeline') {
      if (val.toLowerCase() !== 'flexible') {
        updatedLead.job_description = (updatedLead.job_description || '') + `. Timeline: ${val}`
      }
    } else if (step === 'terms') {
      if (val.toLowerCase() !== 'standard') {
        updatedLead.job_description = (updatedLead.job_description || '') + `. Terms: ${val}`
      }
    }

    setLead(updatedLead)

    const ns = nextStep(step)
    setStep(ns)

    if (ns === 'submitting') {
      setTimeout(() => addBot(QUESTIONS.submitting), 400)
      await submitLead(updatedLead as Lead)
    } else {
      setTimeout(() => addBot(QUESTIONS[ns]), 400)
    }
  }

  function handleConsentContinue() {
    if (!smsConsent) return
    const ns = nextStep('phone_consent')
    setStep(ns)
    setTimeout(() => addBot(QUESTIONS[ns]), 400)
  }

  async function submitLead(data: Lead) {
    try {
      const res = await fetch('/api/public/intake-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...data }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Submission failed')
      setProposalUrl(json.proposal_url)
      setStep('done')
      setTimeout(() => {
        addBot(
          `✅ Your proposal is ready, ${data.client_name.split(' ')[0]}! We've sent it to ${data.client_email}. You can also view it here:`
        )
        setMessages((m) => [...m, { role: 'bot', text: `__LINK__${json.proposal_url}` }])
      }, 800)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.')
      setStep('terms')
      addBot('Sorry, something went wrong generating your proposal. Please try again or call us at (310) 987-4997.')
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isInputDisabled = step === 'submitting' || step === 'done' || step === 'phone_consent'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus:outline-none"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-primary px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Jobbidder AI</p>
              <p className="text-xs text-white/70">Get a free estimate in 60 seconds</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 overflow-y-auto p-4" style={{ maxHeight: '380px', minHeight: '200px' }}>
            {messages.map((m, i) => {
              if (m.text.startsWith('__LINK__')) {
                const url = m.text.replace('__LINK__', '')
                return (
                  <div key={i} className="flex justify-start">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white underline shadow-sm"
                    >
                      View your proposal →
                    </a>
                  </div>
                )
              }
              return (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              )
            })}
            {step === 'submitting' && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building your Good/Better/Best proposal…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* SMS Consent step */}
          {step === 'phone_consent' && (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  By checking this box, you authorize <strong>Sudden Impact Agency LLC</strong> (Jobbidder) to send you transactional/informational text messages at the number above, possibly using automated technology. Msg &amp; data rates may apply. Message frequency varies (up to 4 msgs per request). Consent is not a condition of purchase.{' '}
                  Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.{' '}
                  <a href="/sms-terms" target="_blank" className="underline">SMS Terms</a>{' '}·{' '}
                  <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>
                </span>
              </label>
              <button
                onClick={handleConsentContinue}
                disabled={!smsConsent}
                className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Normal input */}
          {!isInputDisabled && (
            <div className="flex items-center gap-2 border-t border-border px-3 py-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={step === 'greeting' ? 'Type "yes" to start…' : 'Type your answer…'}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              Proposal sent to your email
            </div>
          )}
        </div>
      )}
    </>
  )
}
