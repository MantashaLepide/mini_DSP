import Link from 'next/link';
import type { ReactNode } from 'react';
import { riskBadgeVariant } from '../lib/scan-types.ts';
import type { Risk } from '../lib/scan-types.ts';

type MessageVariant = 'error' | 'info' | 'success' | 'warning';

const MESSAGE_ICON: Record<MessageVariant, ReactNode> = {
  error: (
    <svg viewBox="0 0 45 45" fill="none" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22.5 12 33 31.5H12L22.5 12Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 20v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22.5" cy="28.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 45 45" fill="none" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22.5 12 33 31.5H12L22.5 12Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 20v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22.5" cy="28.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 45 45" fill="none" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
      <path d="M14 23l6 6 11-12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 45 45" fill="none" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22.5 20v10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22.5" cy="14.5" r="1.6" fill="currentColor" />
    </svg>
  ),
};

interface LpMessageProps {
  variant: MessageVariant;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  id?: string;
}

/** Inline status message. Errors announce with role="alert"; other variants use role="status". */
export function LpMessage({ variant, title, children, actions, id }: LpMessageProps) {
  return (
    <div
      id={id}
      className={`lp-message lp-message--${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className="lp-message__icon">{MESSAGE_ICON[variant]}</span>
      <div className="lp-message__content">
        <div className="lp-message__text">
          <h3 className="lp-message__title">{title}</h3>
          {children ? <p className="lp-message__body">{children}</p> : null}
        </div>
        {actions ? <div className="lp-message__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

interface LpEmptyStateProps {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function LpEmptyState({ message, actionHref, actionLabel }: LpEmptyStateProps) {
  return (
    <div className="lp-empty-state">
      <span className="lp-empty-state__illustration">
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none" stroke="var(--color-border-strong)" strokeWidth="2" aria-hidden="true" focusable="false">
          <rect x="20" y="10" width="80" height="22" rx="4" />
          <rect x="20" y="38" width="80" height="22" rx="4" />
          <circle cx="32" cy="21" r="3" />
          <circle cx="32" cy="49" r="3" />
          <path d="M44 21h32M44 49h20" />
        </svg>
      </span>
      <p className="lp-empty-state__message">{message}</p>
      {actionHref && actionLabel ? (
        <div className="lp-empty-state__action">
          <Link className="lp-link lp-link--standalone" href={actionHref}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`lp-badge lp-badge--${riskBadgeVariant(risk)}`}>{risk}</span>;
}

interface LpProgressProps {
  label: string;
  value: number;
  max: number;
  valueText: string;
}

export function LpProgress({ label, value, max, valueText }: LpProgressProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="lp-progress lp-progress--full-width">
      <span className="lp-progress__label">{label}</span>
      <div className="lp-progress__row">
        <div className="lp-progress__track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
          <div className="lp-progress__fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="lp-progress__value">{valueText}</span>
      </div>
    </div>
  );
}

export function LpTable({ caption, headers, children }: { caption: string; headers: string[]; children: ReactNode }) {
  return (
    <div className="lp-table">
      <table className="lp-table__table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {headers.map(header => (
              <LpTableHeader key={header}>{header}</LpTableHeader>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function LpTableEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td className="lp-table__empty-cell" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}

export function LpTableCell({ children }: { children: ReactNode }) {
  return (
    <td className="lp-table__td">
      <div className="lp-table__cell-inner">
        <span className="lp-table__cell-text">{children}</span>
      </div>
    </td>
  );
}

export function LpTableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="lp-table__th" scope="col">
      <div className="lp-table__header-inner">
        <span className="lp-table__header-label">{children}</span>
      </div>
    </th>
  );
}

export function LpCard({ title, children, elevated = false }: { title?: string; children: ReactNode; elevated?: boolean }) {
  return (
    <div className={elevated ? 'lp-card lp-card--elevated' : 'lp-card'}>
      {title ? (
        <div className="lp-card__header">
          <div className="lp-card__title">{title}</div>
        </div>
      ) : null}
      <div className="lp-card__body">{children}</div>
    </div>
  );
}

export function LpSkeletonLines({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <div className="lp-skeleton lp-skeleton--text skeleton-line" aria-hidden="true" />
      <div className="lp-skeleton lp-skeleton--rect skeleton-block" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
