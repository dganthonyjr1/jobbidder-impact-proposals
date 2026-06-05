import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Bidpilot" },
      { name: "description", content: "Bidpilot Terms of Service for contractors, proposal recipients, and platform users." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermsPage,
});

const effectiveDate = "June 1, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg">Bidpilot</Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground mt-2">Effective date: {effectiveDate}</p>

        <div className="mt-8 rounded-lg border border-border/60 bg-card/60 p-5 text-sm leading-relaxed text-muted-foreground">
          These Terms of Service govern access to and use of Bidpilot, including the website, application, proposal pages,
          estimate pages, media upload features, communications features, integrations, and related services.
        </div>

        <div className="mt-10 space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account, accessing a proposal, uploading content, sending a proposal, accepting a proposal, or
              otherwise using Bidpilot, you agree to these Terms. If you are using Bidpilot on behalf of a company or
              contractor business, you represent that you have authority to bind that business to these Terms.
            </p>
          </Section>

          <Section title="2. Service Description">
            <p>
              Bidpilot provides software tools that help contractors create, manage, send, and track proposals and estimates.
              The Service may include AI-assisted content generation, voice-call intake, customer follow-up workflows,
              proposal links, estimate links, file uploads, photos, videos, email delivery, SMS delivery, PDF generation,
              acceptance workflows, and third-party integrations.
            </p>
            <p>
              Bidpilot is a software platform only. Bidpilot does not perform contracting work, inspect job sites, verify
              measurements, provide legal advice, provide engineering advice, guarantee pricing, or become a party to any
              agreement between a contractor and a customer.
            </p>
          </Section>

          <Section title="3. Contractor Responsibilities">
            <p>
              Contractors are responsible for reviewing, editing, approving, and verifying every proposal, estimate, scope of
              work, price, line item, material description, warranty statement, project timeline, uploaded photo, uploaded video,
              and customer communication before relying on it or sending it to a customer. Contractors are solely responsible
              for their licenses, insurance, permits, tax obligations, warranties, compliance obligations, marketing claims, and
              performance of the work described in any proposal or estimate.
            </p>
          </Section>

          <Section title="4. Customer and Proposal Recipient Responsibilities">
            <p>
              Customers and proposal recipients should review all proposal details carefully and ask the contractor questions
              before accepting any proposal. Acceptance of a proposal through Bidpilot is an agreement between the contractor
              and the customer, not with Bidpilot. Bidpilot is not responsible for the contractor&apos;s work, workmanship,
              scheduling, pricing, warranties, materials, payment terms, or dispute resolution.
            </p>
          </Section>

          <Section title="5. AI-Generated Content">
            <p>
              Bidpilot may use artificial intelligence and automated systems to help generate drafts of scopes of work,
              summaries, proposal language, pricing explanations, estimate descriptions, and customer-facing communications.
              AI-generated content may be incomplete, inaccurate, outdated, or unsuitable for a particular job. Contractors must
              review and approve AI-generated content before use. Bidpilot does not warrant that AI output will be correct,
              compliant, or appropriate for any project.
            </p>
          </Section>

          <Section title="6. Photos, Videos, and Uploaded Content">
            <p>
              Contractors may upload job-site photos, videos, and related media for use in proposals or internal proposal
              preparation. By uploading content, you represent that you have the right to upload, store, display, and share that
              content and that it does not violate privacy rights, publicity rights, intellectual property rights, property
              restrictions, or applicable law.
            </p>
            <p>
              You must not upload sensitive personal information, payment card information, health information, government
              identification numbers, explicit content, illegal content, malicious files, or content that infringes another party&apos;s
              rights. Bidpilot may remove or restrict access to uploaded content if it appears to violate these Terms, creates
              security risk, or may expose Bidpilot or its users to liability.
            </p>
          </Section>

          <Section title="7. Communications, Email, and SMS">
            <p>
              Bidpilot may allow contractors to send transactional emails, proposal links, estimate links, SMS messages,
              reminders, and related customer communications. Contractors are responsible for ensuring they have appropriate
              consent and lawful authority to contact each recipient. Contractors may not use Bidpilot to send spam, unsolicited
              marketing messages, deceptive messages, or messages that violate the Telephone Consumer Protection Act, CAN-SPAM
              Act, state telemarketing laws, carrier rules, or similar communication requirements.
            </p>
            <p>
              Recipients may opt out of SMS where supported by replying STOP and may use unsubscribe or contact options where
              provided. Bidpilot may suspend messaging features if abuse, excessive complaints, carrier violations, or unlawful
              messaging is suspected.
            </p>
          </Section>

          <Section title="8. Accounts and Security">
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your
              account. You agree to provide accurate account and business information and to promptly update it when it changes.
              You must notify Bidpilot if you believe your account has been compromised.
            </p>
          </Section>

          <Section title="9. Acceptable Use">
            <p>
              You agree not to misuse Bidpilot. Prohibited uses include attempting to disrupt the Service, reverse engineer
              protected parts of the Service, bypass access controls, scrape non-public data, upload malicious files, impersonate
              another person or business, violate applicable law, infringe intellectual property rights, send unlawful
              communications, or use Bidpilot in a way that harms contractors, customers, third-party providers, or the platform.
            </p>
          </Section>

          <Section title="10. Third-Party Services">
            <p>
              Bidpilot relies on third-party services for hosting, database, authentication, storage, communications, voice
              intake, AI processing, analytics, and related infrastructure. These services may include providers such as Vercel,
              Supabase, GoHighLevel, Anthropic, email providers, SMS providers, and other vendors. Third-party
              services are not controlled by Bidpilot, and their availability, functionality, terms, and policies may affect the
              Service.
            </p>
          </Section>

          <Section title="11. Fees and Payments">
            <p>
              If paid features are offered, fees will be disclosed through the applicable pricing page, order form, invoice,
              subscription page, or written agreement. Fees are generally non-refundable except where required by law or expressly
              stated otherwise. Third-party payment processors may impose their own terms and fees.
            </p>
          </Section>

          <Section title="12. Intellectual Property">
            <p>
              Bidpilot and its software, design, trademarks, workflows, templates, and platform content are owned by Bidpilot or
              its licensors. Contractors retain ownership of their business information, customer information, uploaded media, and
              proposal content, subject to the license needed for Bidpilot to operate the Service. You grant Bidpilot a limited
              license to host, process, display, transmit, and use your content as necessary to provide, secure, support, and
              improve the Service.
            </p>
          </Section>

          <Section title="13. Confidentiality and Data">
            <p>
              Bidpilot will use reasonable efforts to protect non-public contractor and customer information. Contractors are
              responsible for deciding what information to enter into the Service and for avoiding unnecessary sensitive data.
              Bidpilot&apos;s handling of personal information is described in the Privacy Policy.
            </p>
          </Section>

          <Section title="14. Service Availability and Changes">
            <p>
              Bidpilot may update, modify, suspend, or discontinue parts of the Service at any time. The Service may be
              unavailable because of maintenance, outages, third-party provider failures, security events, or other causes.
              Bidpilot does not guarantee uninterrupted or error-free operation.
            </p>
          </Section>

          <Section title="15. Disclaimers">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law,
              Bidpilot disclaims all warranties, whether express, implied, statutory, or otherwise, including warranties of
              merchantability, fitness for a particular purpose, title, non-infringement, accuracy, availability, and error-free
              operation.
            </p>
          </Section>

          <Section title="16. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Bidpilot will not be liable for indirect, incidental, special,
              consequential, exemplary, or punitive damages, lost profits, lost revenue, lost business opportunities, loss of
              goodwill, data loss, or service interruption. To the maximum extent permitted by law, Bidpilot&apos;s total liability
              for any claim will not exceed the amount paid by you to Bidpilot for the Service during the twelve months before
              the event giving rise to the claim, or one hundred dollars if no amount was paid.
            </p>
          </Section>

          <Section title="17. Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless Bidpilot from claims, damages, liabilities, costs, and expenses
              arising from your use of the Service, your proposals or estimates, your contracting work, your customer
              communications, your uploaded content, your violation of these Terms, or your violation of law or third-party
              rights.
            </p>
          </Section>

          <Section title="18. Suspension and Termination">
            <p>
              Bidpilot may suspend or terminate access to the Service if you violate these Terms, create security or legal risk,
              fail to pay applicable fees, misuse communications features, or use the Service in a way that may harm Bidpilot,
              users, customers, or third-party providers. You may stop using the Service at any time.
            </p>
          </Section>

          <Section title="19. Governing Law">
            <p>
              These Terms are governed by the laws of the United States and the applicable state law designated by Bidpilot,
              without regard to conflict-of-law rules. If no specific state is designated in a separate agreement, disputes will
              be handled in a court of competent jurisdiction in the United States.
            </p>
          </Section>

          <Section title="20. Changes to These Terms">
            <p>
              Bidpilot may update these Terms from time to time. The updated version will be posted with a new effective date.
              Continued use of the Service after updated Terms are posted means you accept the updated Terms.
            </p>
          </Section>

          <Section title="21. Contact">
            <p>
              Questions about these Terms may be sent to <a href="mailto:legal@suddenimpactagency.io" className="underline">legal@suddenimpactagency.io</a>.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
