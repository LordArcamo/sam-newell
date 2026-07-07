import { useState, type FormEvent } from 'react';
import './forms.css';

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function NewsletterForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus('sending');
    setError('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Could not sign you up — try again later.');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setError('Network hiccup — try again in a moment.');
      setStatus('error');
    }
  };

  return status === 'done' ? (
    <p className="nf-done" role="status">
      You’re on the list. Watch for the first Friday Recap in your inbox.
    </p>
  ) : (
    <form className="nf" onSubmit={onSubmit}>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cf-hp" />
      <input type="text" name="name" placeholder="First name" aria-label="First name" required />
      <input type="email" name="email" placeholder="Email address" aria-label="Email address" required />
      <button type="submit" className="btn btn--brass" disabled={status === 'sending'}>
        {status === 'sending' ? 'Joining…' : 'Join the recap'}
      </button>
      {status === 'error' ? (
        <p className="nf-note nf-note--error" role="alert">{error}</p>
      ) : (
        <p className="nf-note">No spam, no selling your info — ever.</p>
      )}
    </form>
  );
}
