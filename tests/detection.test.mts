import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { detectSensitiveData } from '../src/lib/detection.ts';

test('brief acceptance examples are masked and classified', () => {
  const cases = [
    ['alex@example.test', 'Low', 'email', 'a***@example.test'],
    ['07700 900123', 'Medium', 'uk-phone', '07******123'],
    ['+44 7700 900123', 'Medium', 'uk-phone', '07******123'],
    ['AB 12 34 56 C', 'High', 'uk-nino', 'AB******C'],
    ['4111 1111 1111 1111', 'Critical', 'card', '************1111'],
  ];
  for (const [input, risk, type, maskedExample] of cases) {
    assert.deepEqual(detectSensitiveData(input), {
      risk, findings: [{ type, risk, count: 1, maskedExample }],
    });
  }
});

test('malformed values and partial tokens are ignored', () => {
  const invalid = [
    'alex@@example.test', '.alex@example.test', 'alex..smith@example.test',
    'alex@example..test', 'alex@-example.test', 'alex@example',
    'alex@example.test@other.test', '12345', '07700 9001234',
    '107700900123', 'x07700900123', '07700900123x', '++44 7700 900123',
    '07600 900123', '+44 07700 900123', 'AB123456E', 'AB12345C',
    'D\u0410123456C', 'DA123456C', 'AO123456C', 'BG123456C', 'GB123456C',
    'NK123456C', 'KN123456C', 'TN123456C', 'NT123456C', 'ZZ123456C',
    'XAB123456C', 'AB123456CX', 'AB12345678',
    '4111 1111 1111 1112', '411111111111', '41111111111111111',
    '41111111111111111111', 'x4111111111111111', '4111111111111111x',
  ];
  for (const [index, input] of invalid.entries()) {
    assert.deepEqual(detectSensitiveData(input), { risk: 'None', findings: [] }, `invalid case ${index}`);
  }
});

test('common phone forms and geographic numbers', () => {
  for (const input of ['07700900123', '07700-900123', '+447700900123',
    '020 7946 0958', '01632 960123', '+44 20 7946 0958',
    '(020) 7946 0958', '+44 (20) 7946 0958']) {
    const result = detectSensitiveData(input);
    assert.equal(result.risk, 'Medium');
    assert.equal(result.findings[0].count, 1);
  }
});

test('malformed numeric wrappers and Unicode word boundaries do not expose partial matches', () => {
  for (const input of ['(07700 900123', '07700 900123)', '(020 7946 0958',
    '+44 (20 7946 0958', '\u00e907700900123', '07700900123\u00e9',
    '\u{10400}AB123456C', 'AB123456C\u{10400}',
    '4111111111111111 99', '99 4111111111111111 99']) {
    assert.deepEqual(detectSensitiveData(input), { risk: 'None', findings: [] });
  }
});

test('NINO format is case insensitive, permits absent suffix, and rejects forbidden letters', () => {
  for (const input of ['ab123456c', 'AB123456', 'AB 12 34 56', 'ab\t12 34\t56 d']) {
    assert.equal(detectSensitiveData(input).risk, 'High');
  }
  for (const letter of ['D', 'F', 'I', 'Q', 'U', 'V']) {
    assert.equal(detectSensitiveData(`${letter}A123456C`).risk, 'None');
    assert.equal(detectSensitiveData(`A${letter}123456C`).risk, 'None');
  }
});

test('cards accept 13 through 19 Luhn-valid digits, separators, and reject changed check digits', () => {
  for (let length = 13; length <= 19; length += 1) {
    const prefix = `4${'1'.repeat(length - 2)}`;
    const input = Array.from({ length: 10 }, (_, digit) => `${prefix}${digit}`)
      .find(candidate => detectSensitiveData(candidate).risk === 'Critical');
    assert.ok(input, `length ${length}`);
    let sum = 0;
    for (const [index, value] of [...input].reverse().entries()) {
      const digit = Number(value) * (index % 2 === 1 ? 2 : 1);
      sum += digit > 9 ? digit - 9 : digit;
    }
    assert.equal(sum % 10, 0);
    assert.equal(detectSensitiveData(`${input.slice(0, -1)}${(Number(input.at(-1)) + 1) % 10}`).risk, 'None');
  }
  assert.equal(detectSensitiveData('4111-1111-1111-1111').risk, 'Critical');
  assert.equal(detectSensitiveData('4222222222222').risk, 'Critical');
});

test('repeated occurrences aggregate without deduplication and highest risk wins', () => {
  const input = 'alex@example.test,alex@example.test\n07700 900123\nAB123456C\n4111111111111111,4111111111111111';
  const result = detectSensitiveData(input);
  assert.equal(result.risk, 'Critical');
  assert.deepEqual(result.findings.map(({ type, count }) => ({ type, count })), [
    { type: 'email', count: 2 }, { type: 'uk-phone', count: 1 },
    { type: 'uk-nino', count: 1 }, { type: 'card', count: 2 },
  ]);
  assert.deepEqual(detectSensitiveData(input), result);
});

test('email tokens are atomic and numeric detectors do not count their contents', () => {
  const result = detectSensitiveData('4111111111111111@example.test AB123456C@example.test 07700900123@example.test');
  assert.equal(result.risk, 'Low');
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].count, 3);
});

test('every detector aggregates repeated occurrences and risk ordering is independent of position', () => {
  const cases = [
    ['alex@example.test', 'Low'], ['07700900123', 'Medium'],
    ['AB123456C', 'High'], ['4111111111111111', 'Critical'],
  ];
  for (const [input, risk] of cases) {
    const result = detectSensitiveData(`${input}\n${input}\n${input}`);
    assert.equal(result.risk, risk);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].count, 3);
  }
  for (let index = 0; index < cases.length; index += 1) {
    const subset = cases.slice(0, index + 1);
    assert.equal(detectSensitiveData(subset.map(item => item[0]).join('\n')).risk, cases[index][1]);
    assert.equal(detectSensitiveData(subset.reverse().map(item => item[0]).join('\n')).risk, cases[index][1]);
  }
});

test('synthetic stress: repeated matches preserve precedence, counts, masking, and order', context => {
  const block = [
    '4111 1111 1111 1111', 'AB 12 34 56 C', '07700 900123', 'alex@example.test',
    'AB123456C.department@example.test',
    '4111111111111111.department@example.test',
    '07700900123.department@example.test',
  ].join('\n') + '\n';
  for (const repetitions of [5_000, 10_000]) {
    const input = block.repeat(repetitions);
    const started = performance.now();
    const result = detectSensitiveData(input);
    const elapsed = performance.now() - started;
    assert.deepEqual(result, {
      risk: 'Critical',
      findings: [
        { type: 'card', risk: 'Critical', count: repetitions, maskedExample: '************1111' },
        { type: 'uk-nino', risk: 'High', count: repetitions, maskedExample: 'AB******C' },
        { type: 'uk-phone', risk: 'Medium', count: repetitions, maskedExample: '07******123' },
        { type: 'email', risk: 'Low', count: repetitions * 4, maskedExample: 'a***@example.test' },
      ],
    });
    context.diagnostic(JSON.stringify({ repetitions, occurrences: repetitions * 7,
      inputCodeUnits: input.length, bitmapBytes: input.length, elapsedMs: Number(elapsed.toFixed(3)) }));
  }
});

test('clean and empty text return None; calls have no shared state', () => {
  detectSensitiveData('alex@example.test');
  for (const input of ['', 'Inventory: desks, chairs and notebooks.', '42\n2026-10-21']) {
    assert.deepEqual(detectSensitiveData(input), { risk: 'None', findings: [] });
  }
});

test('results expose only aggregate counts, risk, type, and masked examples', () => {
  const result = detectSensitiveData('alex@example.test\n07700900123\nAB123456C\n4111111111111111');
  assert.deepEqual(Object.keys(result).sort(), ['findings', 'risk']);
  for (const finding of result.findings) {
    assert.deepEqual(Object.keys(finding).sort(), ['count', 'maskedExample', 'risk', 'type']);
  }
  const serialized = JSON.stringify(result);
  for (const raw of ['alex@example.test', '07700900123', 'AB123456C', '4111111111111111']) {
    assert.equal(serialized.includes(raw), false);
  }
});

const fixtureDirectory = new URL('./fixtures/additional/', import.meta.url);
const fixtures: { file: string; expected_file_risk: string }[] = JSON.parse(
  readFileSync(new URL('EXPECTED_RESULTS.json', fixtureDirectory), 'utf8'),
);
for (const fixture of fixtures.filter(item => item.expected_file_risk !== 'Reject')) {
  test(`synthetic fixture ${fixture.file} classification`, () => {
    const input = readFileSync(new URL(fixture.file, fixtureDirectory), 'utf8');
    assert.equal(detectSensitiveData(input).risk, fixture.expected_file_risk);
  });
}