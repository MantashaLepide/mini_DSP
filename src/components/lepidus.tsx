'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import type { RefObject } from 'react';

const READY_EVENT = 'lepidus:ready';

interface LepidusApi {
  init?: (root?: Element) => void;
}

declare global {
  interface Window {
    Lepidus?: LepidusApi;
  }
}

// Lepidus.init(container) is not documented as idempotent, so each root is initialised once.
const initialisedRoots = new WeakSet<Element>();

function initLepidusRoot(root: HTMLElement | null): void {
  const api = window.Lepidus;
  if (!api?.init || !root || initialisedRoots.has(root)) return;
  initialisedRoots.add(root);
  api.init(root);
}

/** Loads lepidus.js after the page is interactive and signals when it has run. */
export function LepidusScript() {
  return (
    <Script
      src="https://lepide-design-system.vercel.app/v1/lepidus.js"
      strategy="afterInteractive"
      onLoad={() => window.dispatchEvent(new Event(READY_EVENT))}
    />
  );
}

/** Initialises Lepidus behaviour (dropdowns, modals, tabs) inside `ref` once the script is ready. */
export function useLepidusRoot<T extends HTMLElement>(ref: RefObject<T | null>, ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const init = () => initLepidusRoot(ref.current);
    init();
    window.addEventListener(READY_EVENT, init);
    return () => window.removeEventListener(READY_EVENT, init);
  }, [ref, ready]);
}
