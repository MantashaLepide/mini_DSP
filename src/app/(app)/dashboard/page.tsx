'use client';

import Link from 'next/link';
import { LpCard, LpEmptyState, LpMessage, LpProgress, LpSkeletonLines, LpTable, LpTableCell, RiskBadge } from '../../../components/lepidus-ui.tsx';
import { useScans } from '../../../components/use-scans.ts';
import { RISK_ORDER } from '../../../lib/scan-types.ts';
import type { ScanRecord } from '../../../lib/scan-types.ts';

const RECENT_COUNT = 5;

function Dashboard({ scans }: { scans: ScanRecord[] }) {
  if (scans.length === 0) {
    return <LpEmptyState message="No files have been scanned yet." actionHref="/upload" actionLabel="Upload a file" />;
  }

  const findingsCount = scans.reduce((sum, scan) => sum + scan.totalCount, 0);
  const riskCounts = RISK_ORDER.map(risk => ({
    risk,
    count: scans.filter(scan => scan.risk === risk).length,
  }));

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <LpCard>
          <p className="stat-value">{scans.length}</p>
          <p className="stat-label">Files scanned</p>
        </LpCard>
        <LpCard>
          <p className="stat-value">{findingsCount}</p>
          <p className="stat-label">Findings</p>
        </LpCard>
      </div>

      <div className="dashboard-grid">
        <LpCard title="Risk distribution">
          <div className="page-stack">
            {riskCounts.map(({ risk, count }) => (
              <LpProgress
                key={risk}
                label={risk}
                value={count}
                max={scans.length}
                valueText={`${count} ${count === 1 ? 'file' : 'files'}`}
              />
            ))}
          </div>
        </LpCard>

        <LpCard title="Recent scans">
          <LpTable caption="Most recent scans" headers={['File', 'Risk', 'Findings', 'Scanned']}>
            {scans.slice(0, RECENT_COUNT).map(scan => (
              <tr key={scan.id}>
                <LpTableCell>{scan.displayName}</LpTableCell>
                <td className="lp-table__td">
                  <div className="lp-table__cell-inner">
                    <RiskBadge risk={scan.risk} />
                  </div>
                </td>
                <LpTableCell>{scan.totalCount}</LpTableCell>
                <LpTableCell>{new Date(scan.createdAt).toLocaleString()}</LpTableCell>
              </tr>
            ))}
          </LpTable>
          <p className="muted-text">
            <Link className="lp-link lp-link--inline" href="/history">View all scans</Link>
          </p>
        </LpCard>
      </div>

      {scans.length >= 50 ? <p className="muted-text">Based on your most recent 50 scans.</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { state, reload } = useScans();

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">An overview of your scanned files.</p>
        </div>
      </header>
      {state.status === 'loading' ? <LpSkeletonLines label="Loading dashboard" /> : null}
      {state.status === 'error' ? (
        <LpMessage
          variant="error"
          title="Scans could not be loaded"
          actions={<button type="button" className="lp-button lp-button--secondary lp-button--sm" onClick={reload}>Try again</button>}
        >
          Check your connection and try again.
        </LpMessage>
      ) : null}
      {state.status === 'ready' ? <Dashboard scans={state.scans} /> : null}
    </div>
  );
}
