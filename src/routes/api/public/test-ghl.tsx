import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/test-ghl")({
  server: {
    handlers: {
      GET: async () => {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jobbidder – GHL Test</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 480px; margin: 60px auto; padding: 0 20px; background: #f8fafc; }
    h1 { font-size: 22px; color: #1e293b; }
    label { display: block; margin-top: 16px; font-size: 13px; color: #64748b; font-weight: 600; }
    input { width: 100%; padding: 10px 12px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
    button { margin-top: 12px; width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; color: #fff; }
    #btn-sms { background: #2563eb; }
    #btn-email { background: #16a34a; margin-top: 8px; }
    #result { margin-top: 20px; padding: 14px; border-radius: 8px; font-size: 13px; display: none; white-space: pre-wrap; word-break: break-all; }
    .ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .err { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  </style>
</head>
<body>
  <h1>Jobbidder – GHL Send Test</h1>

  <label>Phone number</label>
  <input id="phone" type="tel" value="8562001869" />

  <label>Email address</label>
  <input id="email" type="email" value="donganthonyjr@gmail.com" />

  <button id="btn-sms" onclick="sendSms()">Send Test SMS</button>
  <button id="btn-email" onclick="sendEmail()">Send Test Email</button>

  <div id="result"></div>

  <script>
    const base = window.location.origin;

    function show(ok, text) {
      const el = document.getElementById('result');
      el.style.display = 'block';
      el.className = ok ? 'ok' : 'err';
      el.textContent = text;
    }

    async function sendSms() {
      const to = document.getElementById('phone').value.trim();
      show(true, 'Sending SMS...');
      try {
        const r = await fetch(base + '/api/public/test-sms-ghl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, body: 'Test SMS from Jobbidder voice AI — it works!' })
        });
        const d = await r.json();
        show(r.ok, JSON.stringify(d, null, 2));
      } catch(e) { show(false, 'Error: ' + e.message); }
    }

    async function sendEmail() {
      const to = document.getElementById('email').value.trim();
      show(true, 'Sending email...');
      try {
        const r = await fetch(base + '/api/public/test-email-ghl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject: 'Test email from Jobbidder', text: 'This is a test email from the Jobbidder GHL integration.' })
        });
        const d = await r.json();
        show(r.ok, JSON.stringify(d, null, 2));
      } catch(e) { show(false, 'Error: ' + e.message); }
    }
  </script>
</body>
</html>`;
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
