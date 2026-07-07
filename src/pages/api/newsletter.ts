import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM = import.meta.env.RESEND_FROM || 'Sam Newell Website <onboarding@resend.dev>';
const TO = import.meta.env.RESEND_TO;
// Optional: a Resend Audience to collect subscribers in. Without it,
// signups arrive as notification emails instead.
const AUDIENCE_ID = import.meta.env.RESEND_AUDIENCE_ID;

export const POST: APIRoute = async ({ request }) => {
  if (!RESEND_API_KEY || (!TO && !AUDIENCE_ID)) {
    return json(503, { error: 'Signups are not configured yet — check back soon.' });
  }

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json(400, { error: 'Invalid request.' });
  }

  const { name = '', email = '', company = '' } = data;
  if (company) return json(200, { ok: true }); // honeypot

  if (!isEmail(email)) {
    return json(400, { error: 'Please enter a valid email address.' });
  }

  const resend = new Resend(RESEND_API_KEY);

  if (AUDIENCE_ID) {
    const { error } = await resend.contacts.create({
      email,
      firstName: name || undefined,
      audienceId: AUDIENCE_ID,
    });
    if (error) {
      console.error('Resend contacts error:', error);
      return json(502, { error: 'Could not sign you up right now — try again later.' });
    }
    return json(200, { ok: true });
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: TO!,
    subject: `[Friday Recap] New signup: ${email}`,
    text: `Name: ${name || '—'}\nEmail: ${email}`,
  });

  if (error) {
    console.error('Resend error:', error);
    return json(502, { error: 'Could not sign you up right now — try again later.' });
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
