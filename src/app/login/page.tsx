'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../../components/brand-logo.tsx';
import { LpCard, LpMessage } from '../../components/lepidus-ui.tsx';
import { ClientApiError, fetchSession, signIn } from '../../lib/client-api.ts';

const MESSAGE_ID = 'login-message';

function describeError(error: unknown): string {
  if (error instanceof ClientApiError && error.status === 401) {
    return 'Email or password is incorrect.';
  }
  if (error instanceof ClientApiError) return error.message;
  return 'Something went wrong. Try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSession()
      .then(signedIn => {
        if (active && signedIn) router.replace('/upload');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/upload');
    } catch (caught) {
      setError(describeError(caught));
      setSubmitting(false);
    }
  }

  const invalid = error !== null;

  return (
    <main className="login-page">
      <div className="login-page__card">
        <div className="login-page__logo">
          <BrandLogo />
        </div>
        <LpCard title="Sign in to MiniDSP" elevated>
          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            {error ? (
              <LpMessage id={MESSAGE_ID} variant="error" title="Sign in failed">
                {error}
              </LpMessage>
            ) : null}

            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="login-email">Email address</label>
                <div className={invalid ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
                  <input
                    className="lp-input__input"
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    aria-invalid={invalid || undefined}
                    aria-describedby={error ? MESSAGE_ID : undefined}
                  />
                </div>
              </div>
            </div>

            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="login-password">Password</label>
                <div className={invalid ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
                  <input
                    className="lp-input__input"
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    aria-invalid={invalid || undefined}
                    aria-describedby={error ? MESSAGE_ID : undefined}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="lp-button lp-button--primary lp-button--md lp-button--full-width" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </LpCard>
      </div>
    </main>
  );
}
