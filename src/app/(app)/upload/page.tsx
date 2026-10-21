'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { LpCard, LpMessage, LpTable, LpTableCell, RiskBadge } from '../../../components/lepidus-ui.tsx';
import { ClientApiError, uploadScan } from '../../../lib/client-api.ts';
import { findingTypeLabel } from '../../../lib/scan-types.ts';
import type { UploadResult } from '../../../lib/scan-types.ts';

const MAX_BYTES = 1_048_576;
const ALLOWED_EXTENSION = /\.(csv|txt)$/i;

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'done'; result: UploadResult }
  | { kind: 'error'; message: string };

function validateFile(file: File): string | null {
  if (!ALLOWED_EXTENSION.test(file.name)) return 'Choose a .csv or .txt file.';
  if (file.size === 0) return 'The file is empty. Choose a different file.';
  if (file.size > MAX_BYTES) return 'The file is larger than 1 MiB. Choose a smaller file.';
  return null;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setStatus({ kind: 'idle' });
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    const problem = validateFile(selected);
    setFile(problem ? null : selected);
    setFileError(problem);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setStatus({ kind: 'uploading' });
    try {
      const result = await uploadScan(file);
      setStatus({ kind: 'done', result });
    } catch (caught) {
      const message = caught instanceof ClientApiError ? caught.message : 'Something went wrong. Try again.';
      setStatus({ kind: 'error', message });
    }
  }

  const uploading = status.kind === 'uploading';

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Upload a file</h1>
          <p className="page-subtitle">
            Scan a CSV or TXT file for sensitive data. Only scan results are saved. The file contents are not stored.
          </p>
        </div>
      </header>

      <div className="upload-form">
        <LpCard>
          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="scan-file">File to scan</label>
                <div className={fileError ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
                  <input
                    className="lp-input__input"
                    id="scan-file"
                    name="file"
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={handleFileChange}
                    disabled={uploading}
                    aria-invalid={fileError ? true : undefined}
                    aria-describedby="scan-file-hint"
                  />
                </div>
              </div>
              <div
                id="scan-file-hint"
                className={fileError ? 'lp-input__message lp-input__message--error' : 'lp-input__message'}
              >
                {fileError ?? 'CSV or TXT, up to 1 MiB.'}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="lp-button lp-button--primary lp-button--md"
                disabled={!file || uploading}
              >
                {uploading ? 'Scanning…' : 'Upload and scan'}
              </button>
            </div>
          </form>
        </LpCard>
      </div>

      {status.kind === 'uploading' ? (
        <LpMessage variant="info" title="Scanning file">
          The file is being checked. This usually takes a few seconds.
        </LpMessage>
      ) : null}

      {status.kind === 'error' ? (
        <LpMessage variant="error" title="The file could not be scanned">
          {status.message}
        </LpMessage>
      ) : null}

      {status.kind === 'done' ? <UploadResultView result={status.result} /> : null}
    </div>
  );
}

function UploadResultView({ result }: { result: UploadResult }) {
  const total = result.findings.reduce((sum, finding) => sum + finding.count, 0);
  const summary = total === 0
    ? 'No sensitive data was found.'
    : `Found ${total} ${total === 1 ? 'match' : 'matches'}. Highest risk: ${result.risk}.`;

  return (
    <div className="page-stack">
      <LpMessage variant="success" title="Scan complete">
        {summary}
      </LpMessage>

      {result.findings.length > 0 ? (
        <LpCard title="Findings">
          <LpTable caption="Findings in the uploaded file" headers={['Type', 'Risk', 'Count', 'Masked example']}>
            {result.findings.map(finding => (
              <tr key={finding.type}>
                <LpTableCell>{findingTypeLabel(finding.type)}</LpTableCell>
                <td className="lp-table__td">
                  <div className="lp-table__cell-inner">
                    <RiskBadge risk={finding.risk} />
                  </div>
                </td>
                <LpTableCell>{finding.count}</LpTableCell>
                <LpTableCell>{finding.maskedExample}</LpTableCell>
              </tr>
            ))}
          </LpTable>
        </LpCard>
      ) : null}

      <p className="muted-text">
        <Link className="lp-link lp-link--inline" href="/history">View scan history</Link>
      </p>
    </div>
  );
}
