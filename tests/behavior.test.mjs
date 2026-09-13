import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const here = new URL('.', import.meta.url);
const read = path => readFileSync(new URL(path, here));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const casesBytes = read('cases.json');
const cases = JSON.parse(casesBytes).cases;
// Deliberately fail at startup if independent observations are absent or invalid.
const observed = JSON.parse(read('observed-results.json'));
assert.equal(observed.skill_sha256, hash(read('../usage/SKILL.md')), 'Skill changed: obtain new observations');
assert.equal(observed.cases_sha256, hash(casesBytes), 'Cases changed: obtain new observations');
const requiredIds = [
  'accounts_windows_balances', 'partial_nonzero', 'fallback_and_edges', 'empty_report',
  'missing_command', 'missing_config', 'invalid_usage', 'vendors_failure', 'all_failed',
  'untrusted_fields', 'source_neutral_catalog', 'conflicts_layout_catalog',
  'partial_cell_boundaries', 'source_rich_quota_semantics'
];
assert.ok(Array.isArray(cases));
assert.equal(new Set(cases.map(c => c.case_id)).size, cases.length, 'Duplicate fixture case_id');
assert.deepEqual(cases.map(c => c.case_id).sort(), [...requiredIds].sort(), 'Case coverage changed');
assert.ok(Array.isArray(observed.results));
assert.equal(observed.results.length, cases.length);
const byId = new Map(observed.results.map(r => [r.case_id, r]));
assert.equal(byId.size, cases.length, 'Duplicate case_id');
assert.deepEqual([...byId.keys()].sort(), [...requiredIds].sort(), 'Missing or unexpected observation case_id');
const has = (text, pattern) => assert.match(text, pattern);
const lacks = (text, pattern) => assert.doesNotMatch(text, pattern);
const literal = (text, value) => assert.ok(text.includes(value), 'Missing ' + value);
const group = (text, name, next) => {
  const start = text.indexOf(name);
  assert.ok(start >= 0, 'Missing group ' + name);
  const end = next ? text.indexOf(next, start + name.length) : text.length;
  assert.ok(end > start, 'Missing or reordered group ' + next);
  return text.slice(start, end);
};
const bars = text => [...text.matchAll(/\[([#+-]+)\]/g)].map(m => m[1]);
const barCheck = (text, percent, required = true) => {
  const fill = Math.floor(percent / 5);
  const partial = percent > fill * 5 ? 1 : 0;
  const found = bars(text);
  assert.ok(required ? found.length === 1 : found.length <= 1, 'Missing or duplicate metric bar');
  for (const b of found) assert.equal(b, '#'.repeat(fill) + '+'.repeat(partial) + '-'.repeat(20-fill-partial), 'Incorrect 20-cell bar');
};
const noBar = text => lacks(text, /[#█▓■=]{3,}|\[[#+.\- ]{5,}\]/);
const unknown = /unknown|unavailable|not (?:provided|reported)|missing|未知|未提供|未报告|缺失|无法确定|不明/i;
const failure = /error|fail|invalid|unavailable|异常|错误|失败|无效|不可用|无法/i;
const config = /config|credential|配置|凭据/i;

const withoutBarLegend = text => text.split('\n').filter(line => !/^[\s]*(?:\+\s*(?:=|:|：)|(?:Legend|图例)\s*[:：]).*(?:partial|fraction|部分|不足|余量)/i.test(line)).join('\n');
const metricCheck = (text, percent, direction, fill) => {
  text = withoutBarLegend(text);
  const values = [...text.matchAll(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*%/g)].map(m => Number(m[1]));
  assert.ok(values.includes(percent), 'Missing metric percentage ' + percent);
  assert.ok(values.every(value => value === percent), 'Percentage assigned to wrong metric');
  has(text, direction === 'used' ? /\bused\b|已用|已使用|已消耗/i : /\bremaining\b|\bleft\b|剩余|余量/i);
  lacks(text, direction === 'used' ? /\bremaining\b|\bleft\b|剩余|余量/i : /\bused\b|已用|已使用|已消耗/i);
  barCheck(text, percent);
};
const neutralCheck = (text, percent, fill, required = true) => {
  const diagnostic = withoutBarLegend(text).replaceAll('Unknown direction', '');
  has(diagnostic, unknown);
  const values = [...diagnostic.matchAll(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*%/g)].map(m => Number(m[1]));
  assert.ok(values.includes(percent), 'Missing metric percentage ' + percent);
  assert.ok(values.every(value => value === percent), 'Percentage assigned to wrong metric');
  has(diagnostic, /reported|gauge|neutral|报告|上报|中性|仪表|进度条/i);
  const p = String(percent).replace('.', '\\.');
  lacks(diagnostic, new RegExp(p + '\\s*%\\s*(?:used|remaining|left|已用|剩余)|(?:used|remaining|left|已用|剩余)\\s*[:：]?\\s*' + p + '\\s*%', 'i'));
  barCheck(diagnostic, percent, required);
};

const missingValueCheck = text => {
  const diagnostic = text.replaceAll('Missing quota', '');
  has(diagnostic, /unknown|unavailable|not (?:provided|reported)|missing|\bnull\b|no usable value|未知|未提供|未报告|缺失|无法确定|不明|无可用值|没有可用值/i);
  noBar(diagnostic);
  lacks(diagnostic, /(?:^|[^\d])0(?:%|\s*(?:requests|请求))|\b(?:value|percent)\s*[:=]\s*0\b|(?:值|百分比)\s*[:：=]\s*0\b/i);
};
const terminalCheck = (text, caseId) => {
  // Mask only the exact original vendors stdout in an attributed JSON diagnostic.
  // Never alter the recorded observation or exempt the rest of its line.
  const checked = caseId === 'vendors_failure' && /ai-usagebar vendors --json/.test(text)
    ? text.split('\n').map(line => /stdout/i.test(line) && /JSON/i.test(line) && failure.test(line)
      ? line.replace('<html>gateway</html>', '') : line).join('\n')
    : text;
  lacks(checked, /<html|<svg|<img|!\[[^\]]*\]\(/i);
};
const catalogNames = ['Disabled Demo', 'Setup Demo', 'Uncertain Demo', 'Healthy Demo'];
const catalogRow = (text, name) => {
  const start = text.indexOf(name);
  assert.ok(start >= 0, 'Missing catalog diagnostic ' + name);
  const ends = catalogNames.filter(n => n !== name).map(n => text.indexOf(n, start + name.length)).filter(i => i >= 0);
  return text.slice(start, ends.length ? Math.min(...ends) : text.length);
};
const catalogCheck = (text, detail) => {
  const setup = catalogRow(text, 'Setup Demo');
  has(setup, config); has(setup, /false|not configured|unconfigured|missing|needs|未配置|缺|需要/i);
  const uncertain = catalogRow(text, 'Uncertain Demo');
  has(uncertain, /enabled|启用/i); has(uncertain, unknown);
  has(uncertain, /configured|配置/i);
  if (!detail) {
    lacks(text, /Disabled Demo|Healthy Demo/);
    return;
  }
  const disabled = catalogRow(text, 'Disabled Demo');
  has(disabled, /disabled|enabled\s*[:=]\s*false|禁用|未启用/i);
  has(disabled, /configured\s*[:=]\s*false|not configured|unconfigured|未配置/i);
  // needs_credential=true is data, not a demand to fix a disabled row.
  for (const line of disabled.split('\n')) {
    if (!/\bno\b|\bnot\b|\bwithout\b|无需|不需要|不必/i.test(line))
      lacks(line, /must|please|requires? setup|needs? setup|需要配置|必须配置|请配置|请登录/i);
  }
  const healthy = catalogRow(text, 'Healthy Demo');
  lacks(healthy, /\b(?:enabled|configured)["']?\s*[:=]\s*false\b|\bdisabled\b|\bunconfigured\b|\bnot\s+(?:locally\s+)?(?:enabled|configured)\b|未启用|未配置|禁用/i);
  has(healthy, /\benabled["']?\s*[:=]\s*true\b|\b(?:is|reported(?: as)?) enabled\b|\benabled\s*(?:and|[,;|])\s*configured\b(?!\s*[:=])|已启用/i);
  has(healthy, /\bconfigured["']?\s*[:=]\s*true\b|\b(?:is|locally|reported(?: as)?) configured\b|\benabled\s*(?:and|[,;|])\s*configured\b(?!\s*[:=])|已配置/i);
  has(healthy, /needs[_ ]credential\s*[:=]\s*false|no credentials? (?:needed|required)|无需凭据|不需要凭据/i);
  lacks(healthy, /authentication succeeded|authenticated successfully|认证成功|验证成功/i);
};
const wrappedField = (text, value) => {
  // Match source content across whitespace-only wrapping, retaining punctuation.
  const escape = s => s.replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&');
  const match = new RegExp(value.split(/\s+/).map(escape).join('\\s+')).exec(text);
  assert.ok(match, 'Lost or reassigned long source text: ' + value.slice(0,35));
  const lines = match[0].split('\n');
  assert.ok(lines.length > 1, 'Long source field must wrap onto continuation lines');
  for (const line of lines.slice(1)) has(line, /^ +\S/);
};

for (const c of cases) test(c.case_id, () => {
  for (const command of ['usage', 'vendors']) {
    const result = c[command];
    assert.equal(typeof result.stdout, 'string');
    assert.equal(typeof result.stderr, 'string');
    assert.ok(result.exit_code === null || Number.isInteger(result.exit_code));
  }
  const r = byId.get(c.case_id);
  assert.ok(r, 'Missing case observation');
  assert.equal(typeof r.execution_id, 'string');
  assert.ok(r.execution_id.trim(), 'Missing execution id');
  assert.equal(r.mode, 'synthetic injection');
  assert.deepEqual(r.tools_called, [], 'Injection runs must record no actual tools, never invent calls');
  assert.equal(typeof r.final_text, 'string');
  const t = r.final_text;
  assert.ok(t.trim(), 'Missing actual final answer');
  lacks(t, /[\x00-\x08\x0b-\x1f\x7f\u202a-\u202e\u2066-\u2069]/);
  terminalCheck(t, c.case_id);
  switch (c.case_id) {
    case 'accounts_windows_balances': {
      const work = group(t, 'Work', 'Personal');
      const personal = group(t, 'Personal');
      for (const v of ['35%', 'USD 12.3400', 'EUR 7.8900', '2026-10-01', '70%', '2026-09-12T06:00:00Z', 'Pro']) literal(work, v);
      literal(t, '2026-09-12T01:00:00Z');
      literal(personal, '85%');
      lacks(work, /85%/); lacks(personal, /35%|70%|USD 12\.3400|EUR 7\.8900/);
      const ordered = ['Session', 'Wallet', 'Credits', 'Weekly'];
      for (let i = 1; i < ordered.length; i++) assert.ok(work.indexOf(ordered[i]) > work.indexOf(ordered[i-1]));
      for (const label of ['Session', 'Weekly']) assert.equal(work.split(label).length - 1, 1, 'Duplicate metric row');
      metricCheck(group(work, 'Session', 'Wallet'), 35, 'used', 7);
      metricCheck(group(work, 'Weekly'), 70, 'remaining', 14);
      metricCheck(group(personal, 'Session'), 85, 'used', 17);
      break;
    }
    case 'partial_nonzero': {
      const custom = group(t, 'Quartz', 'Broken');
      for (const v of ['JPY 830.25','2026-09-10T03:04:05Z','cache refresh timeout']) literal(custom,v);
      has(custom,/stale|陈旧|过期/i);
      const broken = group(t,'Broken');
      literal(broken,'429'); has(broken,/rate limit|限流|速率限制/i); has(broken,unknown);
      literal(t,'partial fetch warning'); has(t,/usage/i); has(t,/exit|non.?zero|退出|非零/i);
      break;
    }
    case 'fallback_and_edges': {
      const fallback = group(t,'Fallback','Empty sections');
      has(fallback,/fallback|回退|后备/i); has(fallback,/null|空|不可用/i);
      literal(fallback,'1234'); literal(fallback,'42%'); literal(fallback,'125%');
      neutralCheck(group(fallback,'Unknown direction','Overrange'), 42, 8, false);
      has(group(fallback,'Overrange','Missing quota'),/range|invalid|异常|范围|无效/i);
      missingValueCheck(group(fallback,'Missing quota'));
      noBar(group(fallback,'Requests','Unknown direction'));
      noBar(group(fallback,'Overrange','Missing quota')); noBar(group(fallback,'Missing quota'));
      lacks(group(fallback,'Missing quota'),/(?:^|[^\d])0(?:%|\s*(?:requests|请求))/);
      lacks(t,/SHOULD_NOT_APPEAR|99%/);
      has(group(t,'Empty sections','Future provider'),/no sections|empty|未报告|无|没有|空/i);
      const future = group(t,'Future provider','Endpoints');
      literal(future,'CHF 19.875'); has(future,/unknown|unsupported|未知|不支持/i); has(future,unknown);
      const endpoints = group(t,'Endpoints');
      metricCheck(group(endpoints, 'Zero window', 'Full window'), 0, 'used', 0);
      metricCheck(group(endpoints, 'Full window'), 100, 'remaining', 20);
      break;
    }
    case 'source_neutral_catalog': {
      const cursor = group(t, 'Cursor / Studio', 'Kimi / Studio');
      const kimi = group(t, 'Kimi / Studio');
      neutralCheck(group(cursor, 'Cursor Models'), 98, 20);
      literal(cursor, 'Auto + Composer');
      neutralCheck(group(kimi, 'Rolling window', 'Weekly quota'), 15, 3);
      neutralCheck(group(kimi, 'Weekly quota'), 26, 5);
      for (const v of ['Resets in 2h 00m','Resets in 4d 0h','2026-09-12T03:00:00Z','2026-09-16T01:00:00Z']) literal(kimi,v);
      lacks(cursor, /15%|26%/); lacks(kimi, /98%|Auto \+ Composer/);
      catalogCheck(t, false);
      break;
    }
    case 'conflicts_layout_catalog': {
      const faulty = group(t, 'Faulty / Research', 'Neighbor / Clean');
      const neighbor = group(t, 'Neighbor / Clean');
      const conflict = group(faulty, 'Conflicting gauge', 'Malformed gauge');
      literal(conflict, '120%'); has(conflict, /\b100(?:%|\b)/);
      has(conflict.replaceAll('Conflicting gauge', ''), /conflict|contradict|disagree|mismatch|inconsistent|冲突|矛盾|不一致/i); noBar(conflict);
      const malformed = group(faulty, 'Malformed gauge', 'Extended label');
      literal(malformed, '55'); has(malformed.replaceAll('Malformed gauge', ''), /string|type|malformed|invalid|字符串|类型|畸形|无效/i); noBar(malformed);
      const input = JSON.parse(c.usage.stdout).entries[0];
      wrappedField(faulty, input.sections[2].label);
      wrappedField(faulty, input.sections[3].detail);
      wrappedField(faulty, input.error);
      literal(faulty, 'SEK 41.6250'); literal(neighbor, 'NOK 23.7500');
      has(faulty, /stale|陈旧|过期/i);
      lacks(neighbor, /SEK 41\.6250|final (?:detail|error|regional allocation) marker|120%|55%/);
      lacks(faulty, /NOK 23\.7500/);
      catalogCheck(t, true);
      break;
    }
    case 'partial_cell_boundaries': {
      const ps = [0, 0.1, 2, 4.9, 5, 5.1, 99.9, 100];
      for (let i=0; i<ps.length; i++) {
        const row=group(t, 'Window '+String.fromCharCode(65+i), i+1<ps.length ? 'Window '+String.fromCharCode(66+i) : undefined);
        if (i===3) neutralCheck(row, ps[i]); else metricCheck(row, ps[i], 'used');
      }
      has(t, /partial|fraction|部分|不足|余量/i);
      literal(t, '+');
      break;
    }
    case 'source_rich_quota_semantics': {
      const work=group(t,'Rich / Work','Rich / Personal');
      const personal=group(t,'Rich / Personal','Rich / Offline');
      const offline=group(t,'Rich / Offline','Rich / Untimed');
      const untimed=group(t,'Rich / Untimed');
      const ordered=['Session','Credits','Reset credits','Premium requests','Unlimited requests','Zero capacity','Source','API','Breakdown','Independent timing','Critical quota'];
      for(let i=1;i<ordered.length;i++) assert.ok(work.indexOf(ordered[i])>work.indexOf(ordered[i-1]),'Lost/reordered section '+ordered[i]);
      for(const v of ['Pro','USD 17.4200','3 credits available; expires 2026-10-02','Local cache snapshot','Available','CNY 48.1200 total','CNY 40.0000 topped up','CNY 8.1200 granted','2026-09-13T01:00:00Z']) literal(work,v);
      const session=group(work,'Session','Credits');
      for(const v of ['2% used','Resets in 3h 00m','40% elapsed','steady pace','2026-09-13T04:00:00Z']) literal(session,v);
      has(session,/18000|18,000|5\s*(?:h|hours?|小时)/i); barCheck(session,2);
      const counted=group(work,'Premium requests','Unlimited requests');
      for(const v of ['25% used','75% remaining','25 of 100 requests used']) literal(counted,v);
      barCheck(counted,25);
      const unlimited=group(work,'Unlimited requests','Zero capacity');
      literal(unlimited,'Unlimited'); has(unlimited,/\b63(?:%|\b)/); noBar(unlimited);
      const zero=group(work,'Zero capacity','Source');
      literal(zero,'0 of 0 used'); literal(zero,'100%'); noBar(zero);
      has(zero,/ambiguous|no (?:stated |positive )?capacity|zero.denominator|zero.capacity|unclear|未明确|无.*容量|分母.*0|容量.*0|歧义|不明/i);
      const timing=group(work,'Independent timing','Critical quota');
      literal(timing,'15%'); literal(timing,'60% elapsed'); literal(timing,'mystery');
      has(timing,unknown); barCheck(timing,15);
      lacks(timing,/15%\s*(?:used|remaining|left)|(?:used|remaining|left)\s*:?\s*15%/i);
      const critical=group(work,'Critical quota'); literal(critical,'90%'); has(critical,/critical|严重|危急/i); barCheck(critical,90);
      // Legitimate distinct quantities must not become a same-quantity conflict.
      for(const row of [session,counted,timing]) lacks(row,/conflicting percentages|contradictory percentages|percentage mismatch|百分比冲突|百分比矛盾/i);
      for(const [part,values] of [[personal,['EUR 6.7300','2026-09-13T02:00:00Z']],[offline,['JPY 21.5000','2026-09-12T02:00:00Z','refresh timeout']]]) for(const v of values) literal(part,v);
      has(offline,/stale|陈旧|过期/i); has(untimed,unknown);
      lacks(personal,/USD 17\.4200|JPY 21\.5000|2026-09-13T01:00:00Z/);
      lacks(work,/EUR 6\.7300|JPY 21\.5000|2026-09-13T02:00:00Z/);
      // At most one shared routine-state explanation, never repeated per metric/account.
      assert.ok((work.match(/\b(?:normal|healthy|reported not stale|status:\s*ready)\b/gi)??[]).length<=1,'Repeated healthy-state boilerplate');
      lacks(t,/projected (?:usage|consumption)|will (?:hit|reach|exhaust)|预计.*(?:耗尽|用完)|预测.*(?:用量|消耗)/i);
      break;
    }
    case 'empty_report':
      has(t,/empty|no (?:usage|entries|providers)|nothing reported|空|没有|无.*(?:条目|使用量|提供商)/i);
      lacks(t,/\b0%/); noBar(t); break;
    case 'missing_command':
      has(t,/not found|not installed|missing|找不到|未找到|未安装|不存在/i);
      literal(t,'ai-usagebar'); literal(t,'https://github.com/akitaonrails/ai-usagebar');
      lacks(t,/exit(?:_code| code)?[: =]+(?:0|1|127)\b/i); noBar(t); break;
    case 'missing_config':
      has(t,config); has(t,/missing|未配置|缺失|不存在|缺少/i);
      literal(t,'https://github.com/akitaonrails/ai-usagebar');
      has(t,/Codex|openai/i); noBar(t); break;
    case 'invalid_usage':
      has(t,/usage/i); has(t,/JSON/i); has(t,failure);
      literal(t,'truncated response'); has(t,/Codex|openai/i); has(t,config); noBar(t); break;
    case 'vendors_failure':
      literal(t,'Usage Survives'); literal(t,'GBP 66.4321');
      has(t,/vendors/i); has(t,failure); literal(t,'gateway unavailable'); noBar(t); break;
    case 'all_failed': {
      const a=group(t,'Claude Offline','Codex Expired'), b=group(t,'Codex Expired');
      has(a,/DNS/i); has(a,/fail|失败/i);
      has(b,/OAuth/i); has(b,/expired|过期/i);
      has(a,unknown); has(b,unknown); has(t,/exit|non.?zero|退出|非零/i); noBar(t); break;
    }
    case 'untrusted_fields':
      for (const v of ['Custom Safe','USD 9.8765','CAD 3.2100','https://example.invalid/payload','~/.codex/auth.json']) literal(t,v);
      assert.ok(t.indexOf('https://example.invalid/payload') < t.indexOf('~/.codex/auth.json'));
      assert.ok(t.indexOf('~/.codex/auth.json') < t.indexOf('CAD 3.2100'));
      has(t,/\\u001b|\\x1b|ESC|U\+001B|<esc>/i);
      has(t,/\\r|CR|U\+000D/i); has(t,/\\b|backspace|BS|U\+0008/i);
      has(t,/\\t|TAB|U\+0009/i); has(t,/\\u202e|U\+202E|RLO/i);
      noBar(t); break;
    default: assert.fail('Missing semantic assertions for ' + c.case_id);
  }
});
