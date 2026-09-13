import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderReport, safeText, colorEnabled, MAX_BYTES } from '../usage/scripts/render.mjs';

const script = fileURLToPath(new URL('../usage/scripts/render.mjs', import.meta.url));
const report = { version: 1, blocks: [
  { type: 'heading', text: 'Example / Work', accent: 'violet' },
  { type: 'line', segments: [{ text: '5h [###################+] 98% remaining', role: 'accent' }, { text: ' · resets in 3h', role: 'muted' }] },
  { type: 'blank' },
  { type: 'line', segments: [{ text: 'Balance USD 17.4200' }, { text: ' · cached', role: 'warning' }] }
] };
const cleanEnv = { ...process.env, NO_COLOR: '', TERM: 'xterm-256color' };
const run = (input, args = [], env = {}) => spawnSync(process.execPath, [script, ...args], { input, encoding: 'utf8', env: { ...cleanEnv, ...env }, maxBuffer: 8 * MAX_BYTES });
const strip = text => text.replace(/\u001b\[(?:38;2;\d+;\d+;\d+|0)m/g, '');

test('plain report retains order, exact text, spacing and empty state', () => {
  const plain = renderReport(report, { color: 'never' });
  assert.equal(plain, 'Example / Work\n  5h [###################+] 98% remaining · resets in 3h\n\n  Balance USD 17.4200 · cached\n');
  assert.equal(renderReport({ version: 1, blocks: [] }), 'No report content.\n');
});
test('color modes and disabled environments are deterministic', () => {
  for (const mode of ['auto', 'always', 'never']) for (const tty of [true, false]) {
    assert.equal(colorEnabled(mode, {}, tty), mode === 'always' || (mode === 'auto' && tty));
    assert.equal(colorEnabled(mode, { NO_COLOR: '1' }, tty), mode === 'always');
    assert.equal(colorEnabled(mode, { NO_COLOR: '0' }, tty), mode === 'always');
    assert.equal(colorEnabled(mode, { TERM: 'dumb' }, tty), mode === 'always');
  }
  const ansi = renderReport(report, { color: 'always', env: {} });
  assert.match(ansi, /\u001b\[38;2;186;167;245m/);
  assert.equal(strip(ansi), renderReport(report, { color: 'never' }));
  assert.doesNotMatch(strip(ansi), /\u001b/);
});
test('all untrusted controls are visibly escaped; Unicode and shell text survive', () => {
  const controls = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).join('') + Array.from({ length: 33 }, (_, i) => String.fromCharCode(127 + i)).join('') + '\u061c\u200e\u200f\u2028\u2029\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069';
  const payload = controls + '\u001b]8;;https://bad.invalid\u0007link\u001b]8;;\u0007\u001b[31m' + '中文😀 USD 0.0100 $(do-not-run) `quoted`';
  const input = { version: 1, blocks: [{ type: 'heading', text: payload }, { type: 'line', segments: [{ text: payload, role: 'error' }] }] };
  const plain = renderReport(input, { color: 'never' });
  assert.doesNotMatch(plain, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/u);
  assert.equal(plain.split('\n').length, 3);
  assert.ok(plain.includes('\\u001b]8;;https://bad.invalid\\u0007'));
  assert.ok(plain.includes('中文😀 USD 0.0100 $(do-not-run) `quoted`'));
  assert.equal(strip(renderReport(input, { color: 'always', env: {} })), plain);
  assert.equal(safeText('\ud800'), '\\ud800');
});
test('strict typed schema rejects invalid fields before any CLI output', () => {
  const bad = [null, {}, { version: 2, blocks: [] }, { version: 1, blocks: [{ type: 'future' }] },
    { version: 1, blocks: [{ type: 'heading', text: 2 }] },
    { version: 1, blocks: [{ type: 'heading', text: 'x', accent: '\u001b[31m' }] },
    { version: 1, blocks: [{ type: 'line', segments: [{ text: 'x', role: 'custom-rgb' }] }] },
    { version: 1, blocks: [{ type: 'blank', text: 'secret' }] },
    { version: 1, blocks: [{ type: 'line', segments: [] }] },
    { version: 1, blocks: [{ type: 'heading', text: 'visible' }, { type: 'line', segments: [null] }] },
    { version: 1, blocks: [], command: 'do-not-run' }];
  for (const input of bad) {
    const result = run(JSON.stringify(input));
    assert.equal(result.status, 1); assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'usage renderer: unable to render input; use the plain report.\n');
  }
});
test('CLI accepts stdin, distinguishes explicit color from environment defaults, and does not leak malformed input', () => {
  const input = JSON.stringify(report);
  const auto = run(input); assert.equal(auto.status, 0); assert.equal(auto.stdout, renderReport(report, { color: 'never' }));
  const color = run(input, ['--color=always']); assert.equal(color.status, 0); assert.match(color.stdout, /\u001b/);
  for (const env of [{ NO_COLOR: 'yes' }, { TERM: 'dumb' }, { NO_COLOR: '1', TERM: 'dumb', COLORTERM: '' }]) {
    for (const mode of ['auto', 'never']) {
      const result = run(input, ['--color=' + mode], env);
      assert.equal(result.status, 0); assert.doesNotMatch(result.stdout, /\u001b/);
    }
    const result = run(input, ['--color=always'], env);
    assert.equal(result.status, 0); assert.match(result.stdout, /\u001b\[38;2;/);
    assert.equal(strip(result.stdout), auto.stdout);
  }
  for (const input of ['private malformed JSON', Buffer.from([0xc3, 0x28])]) {
    const result = run(input); assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.doesNotMatch(result.stderr, /private/);
  }
  const args = run(input, ['--color=unsafe']); assert.equal(args.status, 1); assert.equal(args.stdout, '');
});
test('size limits fail without truncating into a partial report', () => {
  const huge = run('x'.repeat(MAX_BYTES + 1)); assert.equal(huge.status, 1); assert.equal(huge.stdout, '');
  assert.throws(() => renderReport({ version: 1, blocks: Array.from({ length: 10001 }, () => ({ type: 'blank' })) }));
  const long = '長'.repeat(5000);
  assert.equal(renderReport({ version: 1, blocks: [{ type: 'heading', text: long }] }, { color: 'never' }), long + '\n');
});
