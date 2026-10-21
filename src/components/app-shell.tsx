'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from './brand-logo.tsx';
import { useLepidusRoot } from './lepidus.tsx';
import { LpMessage } from './lepidus-ui.tsx';
import { fetchSession, signOut } from '../lib/client-api.ts';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M4 4H10V12H4V4ZM4 16H10V20H4V16ZM14 12H20V20H14V12ZM14 4H20V8H14V4Z' },
  { href: '/upload', label: 'Upload', icon: 'M12 15V4M7 9l5-5 5 5M4 15v4h16v-4' },
  { href: '/history', label: 'History', icon: 'M12 7v5l3 2M4 12a8 8 0 1 0 2.3-5.6L4 9M4 4v5h5' },
  { href: '/findings', label: 'Findings', icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l4 4' },
] as const;

type SessionState = 'checking' | 'signed-in' | 'signed-out' | 'error';

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [session, setSession] = useState<SessionState>('checking');
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSession()
      .then(signedIn => {
        if (!active) return;
        if (signedIn) {
          setSession('signed-in');
        } else {
          setSession('signed-out');
          router.replace('/login');
        }
      })
      .catch(() => {
        if (active) setSession('error');
      });
    return () => {
      active = false;
    };
  }, [router]);

  useLepidusRoot(mainRef, session === 'signed-in');

  async function handleSignOut() {
    setSignOutFailed(false);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      setSignOutFailed(true);
    }
  }

  if (session !== 'signed-in') {
    return (
      <main className="app-status" aria-busy={session === 'checking'}>
        {session === 'error' ? (
          <LpMessage variant="error" title="Unable to check your session. Refresh the page to try again." />
        ) : (
          <span className="visually-hidden" role="status">Checking your session</span>
        )}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <nav className="lp-sidebar app-shell__nav" aria-label="Primary">
        <ul className="lp-sidebar__items">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={active ? 'lp-sidebar__item lp-sidebar__item--active' : 'lp-sidebar__item'}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="lp-sidebar__icon-box">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                      <path d={item.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="lp-sidebar__label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="app-shell__content">
        <header className="app-shell__topbar">
          <span className="app-shell__product">
            <BrandLogo size="sm" />
            MiniDSP
          </span>
          <button type="button" className="lp-button lp-button--secondary lp-button--sm" onClick={handleSignOut}>
            Sign out
          </button>
        </header>
        {signOutFailed ? (
          <LpMessage variant="error" title="Sign out failed. Try again.">
            Your session is still active.
          </LpMessage>
        ) : null}
        <main id="main" ref={mainRef} className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  );
}
