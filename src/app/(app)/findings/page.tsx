'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LpEmptyState, LpMessage, LpSkeletonLines, LpTable, LpTableCell, LpTableEmptyRow, RiskBadge } from '../../../components/lepidus-ui.tsx';
import { useScans } from '../../../components/use-scans.ts';
import { buildFindingsCsv, exportFileName, flattenFindings } from '../../../lib/findings-export.ts';
import { FINDING_TYPE_OPTIONS, findingTypeLabel } from '../../../lib/scan-types.ts';

const ALL = 'all';
const RISK_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

interface FilterDropdownProps {
  label: string;
  allLabel: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterDropdown({ label, allLabel, options, onChange }: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const all = useMemo(() => [{ value: ALL, label: allLabel }, ...options], [allLabel, options]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handle = () => {
      const text = node.querySelector('.lp-dropdown__trigger-label')?.textContent?.trim();
      const match = all.find(option => option.label === text);
      onChange(match ? match.value : ALL);
    };
    node.addEventListener('lp-dropdown-change', handle);
    return () => node.removeEventListener('lp-dropdown-change', handle);
  }, [all, onChange]);

  return (
    <div ref={ref} className="lp-dropdown" data-lp-dropdown="single">
      <button type="button" className="lp-dropdown__trigger" aria-expanded="false" aria-haspopup="listbox">
        <span className="lp-dropdown__trigger-label">{allLabel}</span>
      </button>
      <div className="lp-dropdown__panel" hidden>
        <div className="lp-dropdown__header">
          <span className="lp-dropdown__header-label">{label}</span>
        </div>
        <div className="lp-dropdown__list" role="listbox" aria-label={label}>
          {all.map(option => (
            <button key={option.value} type="button" className="lp-dropdown__option" role="option">
              <span className="lp-dropdown__option-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FindingsPage() {
  const { state, reload } = useScans();
  const [type, setType] = useState(ALL);
  const [risk, setRisk] = useState(ALL);

  const all = useMemo(() => (state.status === 'ready' ? flattenFindings(state.scans) : []), [state]);
  const filtered = useMemo(
    () => all.filter(row => (type === ALL || row.type === type) && (risk === ALL || row.risk === risk)),
    [all, type, risk],
  );

  function handleExport() {
    const blob = new Blob(['\uFEFF', buildFindingsCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(new Date());
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Findings</h1>
          <p className="page-subtitle">Sensitive data found in your 50 most recent scans.</p>
        </div>
        <button
          type="button"
          className="lp-button lp-button--secondary lp-button--md"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </header>

      {state.status === 'loading' ? <LpSkeletonLines label="Loading findings" /> : null}
      {state.status === 'error' ? (
        <LpMessage
          variant="error"
          title="Findings could not be loaded"
          actions={<button type="button" className="lp-button lp-button--secondary lp-button--sm" onClick={reload}>Try again</button>}
        >
          Check your connection and try again.
        </LpMessage>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <div className="filter-bar">
            <FilterDropdown label="Type" allLabel="All types" options={FINDING_TYPE_OPTIONS} onChange={setType} />
            <FilterDropdown label="Risk" allLabel="All risks" options={RISK_OPTIONS} onChange={setRisk} />
          </div>

          {all.length === 0 ? (
            <LpEmptyState message="No findings yet." actionHref="/upload" actionLabel="Upload a file" />
          ) : (
            <LpTable caption="Findings" headers={['File', 'Scanned', 'Type', 'Risk', 'Count', 'Masked example']}>
              {filtered.length === 0 ? (
                <LpTableEmptyRow colSpan={6} message="No findings match these filters." />
              ) : (
                filtered.map(row => (
                  <tr key={`${row.scanId}-${row.type}`}>
                    <LpTableCell>{row.scanName}</LpTableCell>
                    <LpTableCell>{new Date(row.scannedAt).toLocaleString()}</LpTableCell>
                    <LpTableCell>{findingTypeLabel(row.type)}</LpTableCell>
                    <td className="lp-table__td">
                      <div className="lp-table__cell-inner">
                        <RiskBadge risk={row.risk} />
                      </div>
                    </td>
                    <LpTableCell>{row.count}</LpTableCell>
                    <LpTableCell>{row.maskedExample}</LpTableCell>
                  </tr>
                ))
              )}
            </LpTable>
          )}
        </>
      ) : null}
    </div>
  );
}
