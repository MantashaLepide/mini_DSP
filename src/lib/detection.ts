export type Risk = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
export type FindingType = 'email' | 'uk-phone' | 'uk-nino' | 'card';

export interface Finding {
  type: FindingType;
  risk: Exclude<Risk, 'None'>;
  count: number;
  maskedExample: string;
}

export interface DetectionResult {
  risk: Risk;
  findings: Finding[];
}

type Occurrence = Finding & { start: number; end: number };
const riskOrder: Risk[] = ['None', 'Low', 'Medium', 'High', 'Critical'];
function hasBoundaries(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 2), start);
  const after = text.slice(end, end + 2);
  return !/[\p{L}\p{N}_@+]$/u.test(before) && !/^[\p{L}\p{N}_@+]/u.test(after);
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function detectSensitiveData(text: string): DetectionResult {
  const occurrences: Occurrence[] = [];
  const occupied = new Uint8Array(text.length);
  const add = (type: FindingType, risk: Finding['risk'], start: number,
    end: number, maskedExample: string): void => {
    if (occupied.subarray(start, end).includes(1)) return;
    occupied.fill(1, start, end);
    occurrences.push({ type, risk, count: 1, maskedExample, start, end });
  };

  const emailTokens = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~@-]+/gu;
  for (const match of text.matchAll(emailTokens)) {
    const token = match[0].replace(/(?<!\.)\.$/, '');
    if (token.length > 254) continue;
    const parts = token.split('@');
    if (parts.length !== 2) continue;
    const [local, domain] = parts;
    if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) continue;
    if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) continue;
    const labels = domain.split('.');
    if (labels.length < 2 || !/^[A-Za-z]{2,63}$/.test(labels.at(-1) ?? '')) continue;
    if (!labels.every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))) continue;
    add('email', 'Low', match.index, match.index + token.length, `${local[0]}***@${domain}`);
  }

  const ninoCandidates = /[A-Z]{2}[ \t]*\d{2}[ \t]*\d{2}[ \t]*\d{2}(?:[ \t]*[A-Z](?![\p{L}\p{N}_]))?/giu;
  for (const match of text.matchAll(ninoCandidates)) {
    const compact = match[0].replace(/[ \t]/g, '').toUpperCase();
    if (!hasBoundaries(text, match.index, match.index + match[0].length)) continue;
    if (!/^[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ]\d{6}[A-D]?$/.test(compact)) continue;
    if (/^(BG|GB|NK|KN|TN|NT|ZZ)/.test(compact)) continue;
    add('uk-nino', 'High', match.index, match.index + match[0].length,
      `${compact.slice(0, 2)}******${compact.slice(8)}`);
  }

  const numericCandidates = /\+?(?:\([0-9]+\)|[0-9]+)(?:[ \t-]*(?:\([0-9]+\)|[0-9]+))*/g;
  for (const match of text.matchAll(numericCandidates)) {
    const candidate = match[0];
    const end = match.index + candidate.length;
    if (!hasBoundaries(text, match.index, end)) continue;
    if (text[match.index - 1] === '(' || text[end] === ')') continue;
    const digits = candidate.replace(/\D/g, '');
    if (/^[0-9][0-9 \t-]*$/.test(candidate) && digits.length >= 13 && digits.length <= 19 && passesLuhn(digits)) {
      add('card', 'Critical', match.index, end, `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`);
      continue;
    }
    if (!/^(?:\+44[ \t-]*|0|\(0\d{2,4}\))[0-9 ()\t-]*$/.test(candidate)) continue;
    const domestic = candidate.startsWith('+44') ? `0${digits.slice(2)}` : digits;
    if (!/^0(?:[12]\d{9}|7[1-57-9]\d{8})$/.test(domestic)) continue;
    if (candidate.includes('(') && !/^(?:\+44[ \t-]*)?\(\d{2,5}\)[ \t-]*\d+(?:[ \t-]+\d+)*$/.test(candidate)) continue;
    add('uk-phone', 'Medium', match.index, end, `${domestic.slice(0, 2)}******${domestic.slice(-3)}`);
  }

  occurrences.sort((left, right) => left.start - right.start);
  const findings: Finding[] = [];
  let risk: Risk = 'None';
  for (const occurrence of occurrences) {
    const existing = findings.find(finding => finding.type === occurrence.type);
    if (existing) existing.count += 1;
    else findings.push({ type: occurrence.type, risk: occurrence.risk, count: 1, maskedExample: occurrence.maskedExample });
    if (riskOrder.indexOf(occurrence.risk) > riskOrder.indexOf(risk)) risk = occurrence.risk;
  }
  return { risk, findings };
}