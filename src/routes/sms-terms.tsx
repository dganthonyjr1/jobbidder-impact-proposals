import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sms-terms")({
  component: SmsTermsPage,
});

function SmsTermsPage() {
  const effectiveDate = "June 15, 2025";
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-display font-bold text-lg">
            Jobbidder
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">SMS Terms &amp; Conditions</h1>
        <p className="mt-2 text-muted-foreground">Effective date: {effectiveDate}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">

          {/* Program Description */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Program Description</h2>
            <p>
              <strong>Jobbidder</strong> (operated by Sudden Impact Agency LLC) sends transactional and informational SMS messages
              to homeowners and project leads who have provided their mobile phone number and consented to receive text messages
              through the Jobbidder chat widget or intake form. Messages may include:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Proposal delivery notifications and links</li>
              <li>Proposal follow-up reminders</li>
              <li>Appointment confirmations and reminders</li>
              <li>Status updates related to your project estimate</li>
            </ul>
          </section>

          {/* Message Frequency */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Message Frequency</h2>
            <p>
              Message frequency varies. You may receive up to <strong>4 messages per proposal request</strong> (initial delivery,
              24-hour follow-up, 72-hour follow-up, and a 7-day reminder). You will not receive unsolicited marketing messages.
            </p>
          </section>

          {/* Opt-In */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. How to Opt In</h2>
            <p>
              You opt in to receive SMS messages by checking the consent checkbox in the Jobbidder AI chat widget or intake form
              and providing your mobile phone number. By opting in, you authorize Sudden Impact Agency LLC to send you
              transactional and informational text messages at the number provided, which may be sent using automated technology.
              <strong> Consent is not a condition of any purchase.</strong>
            </p>
          </section>

          {/* Opt-Out */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. How to Opt Out (STOP)</h2>
            <p>
              You may opt out of SMS messages at any time by replying <strong>STOP</strong> to any message you receive from us.
              After opting out, you will receive a single confirmation message and no further SMS messages will be sent to your
              number. You can re-subscribe at any time by texting <strong>START</strong>.
            </p>
          </section>

          {/* Help */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Help</h2>
            <p>
              For help, reply <strong>HELP</strong> to any message or contact us at{" "}
              <a href="mailto:support@suddenimpactagency.io" className="underline">
                support@suddenimpactagency.io
              </a>{" "}
              or call <a href="tel:+13109874997" className="underline">(310) 987-4997</a>.
            </p>
          </section>

          {/* Rates */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Message &amp; Data Rates</h2>
            <p>
              <strong>Message and data rates may apply.</strong> Standard carrier rates for SMS and data apply depending on your
              mobile plan. Jobbidder does not charge for SMS messages, but your carrier may. Check with your carrier for details.
            </p>
          </section>

          {/* Supported Carriers */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Supported Carriers</h2>
            <p>
              Jobbidder SMS is supported by major U.S. wireless carriers including AT&amp;T, T-Mobile, Verizon, Sprint, Boost
              Mobile, MetroPCS, U.S. Cellular, and others. Carrier availability may vary.
            </p>
          </section>

          {/* Privacy */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Privacy</h2>
            <p>
              Your mobile phone number and message data are used solely to deliver proposal-related communications as described
              above. We do not sell, rent, or share your phone number with third parties for marketing purposes. For full details,
              see our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p>
              Sudden Impact Agency LLC
              <br />
              Email:{" "}
              <a href="mailto:support@suddenimpactagency.io" className="underline">
                support@suddenimpactagency.io
              </a>
              <br />
              Phone: <a href="tel:+13109874997" className="underline">(310) 987-4997</a>
            </p>
          </section>

          {/* Changes */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Changes to These Terms</h2>
            <p>
              We may update these SMS Terms from time to time. The updated version will be posted at{" "}
              <strong>jobbidder.io/sms-terms</strong> with a new effective date. Continued use of the SMS program after an update
              constitutes acceptance of the revised terms.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
