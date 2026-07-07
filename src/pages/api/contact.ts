import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
// Until samnewellrealestate.com is verified in Resend, the default sender
// must be onboarding@resend.dev (Resend's sandbox address).
const FROM = import.meta.env.RESEND_FROM || 'Sam Newell Website <onboarding@resend.dev>';
const TO = import.meta.env.RESEND_TO;

export const POST: APIRoute = async ({ request }) => {
  if (!RESEND_API_KEY || !TO) {
    return json(503, { error: 'Email is not configured yet. Call (801) 995-2220 instead.' });
  }

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json(400, { error: 'Invalid request.' });
  }

  const { name = '', email = '', phone = '', subject = '', message = '', company = '' } = data;

  // Honeypot — real users never see or fill this field
  if (company) return json(200, { ok: true });

  if (!name.trim() || !isEmail(email) || !message.trim()) {
    return json(400, { error: 'Please fill in your name, a valid email, and a message.' });
  }

  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: TO,
    replyTo: email,
    subject: `[samnewellrealestate.com] ${subject || 'New message'} — ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || '—'}`,
      `Interested in: ${subject || '—'}`,
      '',
      message,
    ].join('\n'),
  });

  if (error) {
    console.error('Resend error:', error);
    return json(502, { error: 'Could not send right now. Call (801) 995-2220 instead.' });
  }

  return json(200, { ok: true });
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
