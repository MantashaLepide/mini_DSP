import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFindingsCsv, csvCell, exportFileName, flattenFindings } from '../src/lib/findings-export.ts';
import type { ScanRecord } from '../src/lib/scan-types.ts';

const scan: ScanRecord = {
  id: 's1',
  displayName: 'people.csv',
  byteSize: 10,
  risk: 'High',
  totalCount: 3,
  createdAt: '2026-01-02T03:04:05.000Z',
  findings: [
    { type: 'email', risk: 'Low', count: 2, maskedExample: 'a***@example.com' },
    { type: 'card', risk: 'Critical', count: 1, maskedExample: '**** 1111' },
  ],
};

test('csvCell quotes commas, quotes and newlines', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('a\nb'), '"a\nb"');
  assert.equal(csvCell('plain'), 'plain');
});

test('csvCell neutralises spreadsheet formulas', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('@cmd'), "'@cmd");
  assert.equal(csvCell('-1'), "'-1");
});

test('flattenFindings attaches scan details to each finding', () => {
  const rows = flattenFindings([scan]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.scanName, 'people.csv');
  assert.equal(rows[1]?.type, 'card');
});

test('buildFindingsCsv writes a header and CRLF rows', () => {
  const csv = buildFindingsCsv(flattenFindings([scan]));
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Scan,Scanned at,Type,Risk,Count,Masked example');
  assert.equal(lines.length, 4);
  assert.equal(lines[3], '');
  assert.match(lines[1] ?? '', /^people\.csv,.*,Email address,Low,2,/);
});

test('exportFileName is filesystem safe', () => {
  assert.equal(exportFileName(new Date('2026-01-02T03:04:05.000Z')), 'minidsp-findings-2026-01-02-03-04-05.csv');
});
