'use client';

import { LpEmptyState, LpMessage, LpSkeletonLines, LpTable, LpTableCell, RiskBadge } from '../../../components/lepidus-ui.tsx';
import { useScans } from '../../../components/use-scans.ts';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export default function HistoryPage() {
  const { state, reload } = useScans();

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Scan history</h1>
          <p className="page-subtitle">Your 50 most recent scans.</p>
        </div>
      </header>
      {state.status === 'loading' ? <LpSkeletonLines label="Loading scan history" /> : null}
      {state.status === 'error' ? (
        <LpMessage
          variant="error"
          title="Scans could not be loaded"
          actions={<button type="button" className="lp-button lp-button--secondary lp-button--sm" onClick={reload}>Try again</button>}
        >
          Check your connection and try again.
        </LpMessage>
      ) : null}
      {state.status === 'ready' && state.scans.length === 0 ? (
        <LpEmptyState message="No files have been scanned yet." actionHref="/upload" actionLabel="Upload a file" />
      ) : null}
      {state.status === 'ready' && state.scans.length > 0 ? (
        <LpTable caption="Scan history" headers={['File', 'Size', 'Risk', 'Findings', 'Scanned']}>
          {state.scans.map(scan => (
            <tr key={scan.id}>
              <LpTableCell>{scan.displayName}</LpTableCell>
              <LpTableCell>{formatSize(scan.byteSize)}</LpTableCell>
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
      ) : null}
    </div>
  );
}
