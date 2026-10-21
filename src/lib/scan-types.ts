export type Risk = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
export type FindingType = 'email' | 'uk-phone' | 'uk-nino' | 'card';

export interface Finding {
  type: FindingType;
  risk: Exclude<Risk, 'None'>;
  count: number;
  maskedExample: string;
}

export interface ScanRecord {
  id: string;
  displayName: string;
  byteSize: number;
  risk: Risk;
  totalCount: number;
  createdAt: string;
  findings: Finding[];
}

export interface UploadResult {
  id: string;
  extension: 'csv' | 'txt';
  byteSize: number;
  risk: Risk;
  findings: Finding[];
}

export const RISK_ORDER: readonly Risk[] = ['Critical', 'High', 'Medium', 'Low', 'None'];

export const FINDING_TYPE_OPTIONS: readonly { value: FindingType; label: string }[] = [
  { value: 'email', label: 'Email address' },
  { value: 'uk-phone', label: 'UK phone number' },
  { value: 'uk-nino', label: 'UK National Insurance number' },
  { value: 'card', label: 'Payment card number' },
];

export function findingTypeLabel(type: string): string {
  return FINDING_TYPE_OPTIONS.find(option => option.value === type)?.label ?? type;
}

export function riskBadgeVariant(risk: Risk): 'error' | 'warning' | 'default' | 'neutral' {
  if (risk === 'Critical' || risk === 'High') return 'error';
  if (risk === 'Medium') return 'warning';
  if (risk === 'Low') return 'default';
  return 'neutral';
}

// Shape returned by the scans read path (snake_case columns from PostgREST).
interface ScanRow {
  id: string;
  display_name: string;
  byte_size: number;
  risk: Risk;
  total_count: number;
  created_at: string;
  findings?: { type: FindingType; risk: Finding['risk']; count: number; masked_example: string }[] | null;
}

export function toScanRecord(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    byteSize: row.byte_size,
    risk: row.risk,
    totalCount: row.total_count,
    createdAt: row.created_at,
    findings: (row.findings ?? []).map(finding => ({
      type: finding.type,
      risk: finding.risk,
      count: finding.count,
      maskedExample: finding.masked_example,
    })),
  };
}
