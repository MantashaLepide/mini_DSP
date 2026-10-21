import { useCallback, useEffect, useState } from 'react';
import { fetchScans } from '../lib/client-api.ts';
import type { ScanRecord } from '../lib/scan-types.ts';

export type ScansState =
  | { status: 'loading' }
  | { status: 'ready'; scans: ScanRecord[] }
  | { status: 'error' };

const LOADING: ScansState = { status: 'loading' };

/** Loads the signed-in user's recent scans. `reload` restarts the request. */
export function useScans(): { state: ScansState; reload: () => void } {
  const [state, setState] = useState<ScansState>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchScans()
      .then(scans => {
        if (active) setState({ status: 'ready', scans });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState(LOADING);
    setAttempt(current => current + 1);
  }, []);

  return { state, reload };
}
