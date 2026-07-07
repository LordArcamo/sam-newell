import { useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './forms.css';

gsap.registerPlugin(useGSAP);

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactForm() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const { contextSafe } = useGSAP({ scope: rootRef });

  const onSubmit = contextSafe(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error || 'Something went wrong — call (801) 995-2220 instead.');
        setStatus('error');
        return;
      }

      setStatus('sent');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.from('.cf-done', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out' });
      }
    } catch {
      setError('Network hiccup — try again, or call (801) 995-2220.');
      setStatus('error');
    }
  });

  return (
    <div ref={rootRef}>
      {status === 'sent' ? (
        <div className="cf-done" role="status">
          <span className="cf-done-mark">✓</span>
          <h3 className="cf-done-title">Sent. Sam reads these himself.</h3>
          <p>
            Expect a reply within a business day — usually faster. Can’t wait? Call{' '}
            <a href="tel:+18019952220">(801) 995-2220</a> or{' '}
            <a href="https://calendly.com/sam_newell_real_estate" target="_blank" rel="noopener">
              grab a time on his calendar
            </a>
            .
          </p>
        </div>
      ) : (
        <form className="cf" onSubmit={onSubmit}>
          {/* Honeypot — hidden from real users, catnip for bots */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="cf-hp"
          />
          <div className="cf-row">
            <label className="cf-field">
              <span>Name</span>
              <input type="text" name="name" placeholder="Your full name" required />
            </label>
            <label className="cf-field">
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>
          </div>
          <div className="cf-row">
            <label className="cf-field">
              <span>Phone</span>
              <input type="tel" name="phone" placeholder="(801) 555-0100" />
            </label>
            <label className="cf-field">
              <span>I’m interested in</span>
              <select name="subject" defaultValue="Buying a home">
                <option>Buying a home</option>
                <option>Selling a home</option>
                <option>Multifamily investing</option>
                <option>Framing services</option>
                <option>Something else</option>
              </select>
            </label>
          </div>
          <label className="cf-field">
            <span>Message</span>
            <textarea
              name="message"
              rows={5}
              placeholder="Tell Sam what you’re working toward — a first home, a 1031, a fourplex…"
              required
            />
          </label>
          {status === 'error' && (
            <p className="cf-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--ink" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send message'} <span className="arrow">→</span>
          </button>
        </form>
      )}
    </div>
  );
}
