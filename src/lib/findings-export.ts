import { findingTypeLabel } from './scan-types.ts';
import type { Finding, ScanRecord } from './scan-types.ts';

export interface FindingRow extends Finding {
  scanId: string;
  scanName: string;
  scannedAt: string;
}

export function flattenFindings(scans: readonly ScanRecord[]): FindingRow[] {
  return scans.flatMap(scan => scan.findings.map(finding => ({
    ...finding,
    scanId: scan.id,
    scanName: scan.displayName,
    scannedAt: scan.createdAt,
  })));
}

// Spreadsheet applications treat cells starting with these characters as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: string | number): string {
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildFindingsCsv(rows: readonly FindingRow[]): string {
  const header = ['Scan', 'Scanned at', 'Type', 'Risk', 'Count', 'Masked example'];
  const lines = rows.map(row => [
    row.scanName,
    row.scannedAt,
    findingTypeLabel(row.type),
    row.risk,
    row.count,
    row.maskedExample,
  ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\r\n') + '\r\n';
}

export function exportFileName(now: Date): string {
  return `minidsp-findings-${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
}
