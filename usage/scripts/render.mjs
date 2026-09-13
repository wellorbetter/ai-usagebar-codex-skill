import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_BYTES = 1024 * 1024;
const MAX_ITEMS = 10000;
const PALETTE = Object.freeze({ mint: '128;223;183', violet: '186;167;245', blue: '127;201;237', muted: '160;170;180', warning: '229;193;129', error: '240;140;140' });
const ACCENTS = ['mint', 'violet', 'blue', 'neutral'];
const ROLES = ['plain', 'muted', 'accent', 'warning', 'error'];
const fail = () => { throw new Error('Invalid display report'); };
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail();
}
function string(value) { if (typeof value !== 'string') fail(); }
export function safeText(value) {
  string(value);
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069\ud800-\udfff]/gu,
    ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}
export function colorEnabled(mode, env = process.env, isTTY = Boolean(process.stdout.isTTY)) {
  if (!['auto', 'always', 'never'].includes(mode)) fail();
  if (mode === 'always') return true; // Explicit per-instance choice, not environment mutation.
  if (mode === 'never') return false;
  if ((typeof env.NO_COLOR === 'string' && env.NO_COLOR.length > 0) || env.TERM === 'dumb') return false;
  return isTTY;
}
function validate(report) {
  object(report, ['version', 'blocks']);
  if (report.version !== 1 || !Array.isArray(report.blocks) || report.blocks.length > MAX_ITEMS) fail();
  let items = report.blocks.length;
  for (const block of report.blocks) {
    object(block, ['type', 'text', 'accent', 'segments']);
    if (block.type === 'heading') {
      object(block, ['type', 'text', 'accent']); string(block.text);
      if (block.accent !== undefined && !ACCENTS.includes(block.accent)) fail();
    } else if (block.type === 'line') {
      object(block, ['type', 'segments']);
      if (!Array.isArray(block.segments) || block.segments.length === 0) fail();
      items += block.segments.length;
      if (items > MAX_ITEMS) fail();
      for (const segment of block.segments) {
        object(segment, ['text', 'role']); string(segment.text);
        if (segment.role !== undefined && !ROLES.includes(segment.role)) fail();
      }
    } else if (block.type === 'blank') object(block, ['type']);
    else fail();
  }
}
export function renderReport(report, { color = 'auto', env = process.env, isTTY = Boolean(process.stdout.isTTY) } = {}) {
  validate(report);
  if (Buffer.byteLength(JSON.stringify(report), 'utf8') > MAX_BYTES) fail();
  const enabled = colorEnabled(color, env, isTTY);
  const paint = (text, tone) => {
    const safe = safeText(text);
    return enabled && PALETTE[tone] && safe ? '\u001b[38;2;' + PALETTE[tone] + 'm' + safe + '\u001b[0m' : safe;
  };
  let accent = 'mint';
  const lines = report.blocks.map(block => {
    if (block.type === 'blank') return '';
    if (block.type === 'heading') {
      accent = block.accent ?? 'mint';
      return paint(block.text, accent);
    }
    return '  ' + block.segments.map(segment => paint(segment.text, segment.role === 'accent' ? accent : segment.role ?? 'plain')).join('');
  });
  return lines.length ? lines.join('\n') + '\n' : 'No report content.\n';
}
export async function main(args = process.argv.slice(2)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Runtime unavailable');
    if (args.length > 1 || (args.length === 1 && !/^--color=(auto|always|never)$/.test(args[0]))) fail();
    const color = args[0]?.slice('--color='.length) ?? 'auto';
    const chunks = []; let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) fail();
      chunks.push(chunk);
    }
    const input = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    const rendered = renderReport(JSON.parse(input), { color });
    process.stdout.write(rendered);
  } catch {
    process.stderr.write('usage renderer: unable to render input; use the plain report.\n');
    process.exitCode = 1;
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
