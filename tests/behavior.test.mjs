import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
const usageRoot = new URL('../usage/', here);
const usageFiles = (prefix='') => readdirSync(new URL(prefix,usageRoot),{withFileTypes:true}).flatMap(d => d.isDirectory() ? usageFiles(prefix+d.name+'/') : [prefix+d.name]).sort();
const usageHashes = Object.fromEntries(usageFiles().map(p=>[p,hash(readFileSync(new URL(p,usageRoot)))]));
assert.deepEqual(observed.usage_files_sha256,usageHashes,'Production skill files changed: obtain new observations');
const requiredIds = [
  'accounts_windows_balances', 'partial_nonzero', 'fallback_and_edges', 'empty_report',
  'missing_command', 'missing_config', 'invalid_usage', 'vendors_failure', 'all_failed',
  'untrusted_fields', 'source_neutral_catalog', 'conflicts_layout_catalog',
  'partial_cell_boundaries', 'source_rich_quota_semantics',
  'compact_source', 'compact_direction_edges', 'compact_refresh_mixed', 'compact_stale_no_proxy'
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
const unknown = /unknown|unavailable|not (?:provided|reported|supplied)|missing|未知|未提供|未报告|缺失|无法确定|不明/i;
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
  const lines=text.split('\n');
  let removed=false;
  if(caseId==='vendors_failure') for(let i=0;i<lines.length;i++) {
    const open=/^ {0,3}(\x60{3,}|~{3,})(?:text|plain-text|plaintext)\s*$/i.exec(lines[i]);
    if(!open) continue;
    const marker=open[1][0], width=open[1].length;
    let close=i+1;
    while(close<lines.length) {
      const closing=/^ {0,3}(\x60+|~+)\s*$/.exec(lines[close]);
      if(closing && closing[1][0]===marker && closing[1].length>=width) break;
      close++;
    }
    if(close===lines.length) break; // Unclosed fences never qualify.
    let groupStart=i+1;
    for(let row=i+1;row<close;row++) {
      // Blank lines or a new unindented heading begin a local diagnostic group.
      if(!lines[row].trim()) {groupStart=row+1;continue;}
      if(/^\S/.test(lines[row])) groupStart=row;
      const line=lines[row];
      if(removed || !/^\s*(?:stdout\b|(?:invalid|failed|error|malformed)\s+(?:JSON\s+)?stdout\b|JSON\s+stdout\b)/i.test(line)
        ) continue;
      let groupEnd=row+1;
      while(groupEnd<close && lines[groupEnd].trim() && !/^\S/.test(lines[groupEnd])) groupEnd++;
      const local=lines.slice(groupStart,groupEnd).join('\n');
      // JSON failure may occupy its own line, but must remain in this diagnostic group.
      if(!/\b(?:invalid|malformed)\s+JSON\b|\bJSON\s+(?:parse\s+)?(?:error|failure|failed)\b/i.test(local)) continue;
      const command=/^\s*(?:command\s*:\s*)?ai-usagebar\s+vendors\s+--json\b/im.test(local);
      const catalog=/^\s*Catalog\b[^\n]*(?:diagnostics|(?:query|fetch)[^\n]*(?:problem|fail|error))/im.test(local)
        && /^\s*stderr\s*:\s*vendors\b/im.test(local);
      if((command||catalog) && line.includes('<html>gateway</html>')) {
        lines[row]=line.replace('<html>gateway</html>',''); // One exact source fragment only.
        removed=true;
      }
    }
    i=close;
  }
  lacks(lines.join('\n'), /<html|<svg|<img|!\[[^\]]*\]\(/i);
};
const terminalExceptionProbes = () => {
  const body='Catalog query problem\n  stderr: vendors: gateway unavailable\n  Invalid JSON stdout: <html>gateway</html>';
  const fence=body=>'\x60\x60\x60text\n'+body+'\n\x60\x60\x60';
  terminalCheck(fence(body),'vendors_failure');
  terminalCheck(fence('ai-usagebar vendors --json\n  stdout: invalid JSON <html>gateway</html>'),'vendors_failure');
  const split='Catalog diagnostics\n  ai-usagebar vendors --json exited with code 2.\n  stderr: vendors: gateway unavailable\n  stdout: <html>gateway</html>\n  Invalid JSON; catalog configuration could not be assessed.';
  terminalCheck(fence(split),'vendors_failure');
  const invalid=[
    fence(split.replace('\n  Invalid JSON;', '\n\nOther diagnostic\n  Invalid JSON;')),
    fence(split.replace('Invalid JSON;', 'Unable to assess;')),
    fence(split.replace('stdout:', 'Account:')),
    fence(split+'\n  stdout: <html>gateway</html>'),
    body, // No fence.
    '\x60\x60\x60text\n'+body, // Unclosed.
    '\x60\x60\x60text\nCatalog query problem\n  stderr: vendors: error\n\x60\x60\x60\n  Invalid JSON stdout: <html>gateway</html>',
    fence(body.replace('stderr: vendors:','stderr: service:')), // No local vendor identity.
    fence('ai-usagebar vendors --json\n\nAccount\n  Invalid JSON stdout: <html>gateway</html>'),
    fence(body.replace('Invalid JSON stdout:','Balance:')), // Account/value text is not stdout diagnostic.
    fence(body.replace('gateway</html>','other</html>')),
    fence(body+'\n  <html>gateway</html>'), // Cannot exempt a second fragment.
    fence(body+' <svg></svg>'), fence(body+' <img src=x>'), fence(body+' ![x](url)')
  ];
  for(const value of invalid) assert.throws(()=>terminalCheck(value,'vendors_failure'));
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

const compactCheck = text => {
  lacks(text,/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|\b(?:severity|fetched_at|reported gauge|direction unknown|elapsed|steady pace|Breakdown)\b|图例|partial 5%|健康状态|方向未知/i);
  lacks(text,/^\s*(?:Source|API|Fetched|Status)\s*[:：]/im);
  assert.ok((text.match(/\$usage\s*(?:details|查看详情)/gi)??[]).length<=1,'Repeated detail hint');
  // These compact fixtures have ASCII-only source content; Chinese requests must not switch UI language.
  lacks(text,/[\u3400-\u9fff\uf900-\ufaff]/);
  has(text,/remaining|left|quota|balance|cached|stale|unavailable/i);
};
const section=(text,startPattern,endPattern)=>{
  const start=startPattern.exec(text); assert.ok(start,'Missing compact row '+startPattern);
  const tail=text.slice(start.index+start[0].length);
  const end=endPattern?.exec(tail);
  if(endPattern) assert.ok(end,'Missing next compact row '+endPattern);
  return text.slice(start.index,end ? start.index+start[0].length+end.index : undefined);
};
const remainingCheck=(text,p)=>{
  const values=[...text.matchAll(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*%/g)].map(m=>Number(m[1]));
  assert.ok(values.includes(p),'Missing exact remaining percentage '+p);
  has(text,/剩余|remaining|left/i); barCheck(text,p);
};
for (const c of cases) test(c.case_id, () => {
  for (const command of ['usage', 'vendors']) {
    const result = c[command];
    assert.equal(typeof result.stdout, 'string');
    assert.equal(typeof result.stderr, 'string');
    assert.ok(result.exit_code === null || Number.isInteger(result.exit_code));
  }
  if(c.retry_usage) {
    assert.equal(typeof c.retry_usage.stdout,'string');
    assert.equal(typeof c.retry_usage.stderr,'string');
    assert.ok(c.retry_usage.exit_code===null || Number.isInteger(c.retry_usage.exit_code));
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
    case 'compact_source': {
      compactCheck(t);
      const codex=group(t,'Codex / Work','Copilot / Work'), cp=group(t,'Copilot / Work','DeepSeek / Work'), ds=group(t,'DeepSeek / Work');
      remainingCheck(section(codex,/(?:Codex\s*)?5\s*[- ]?(?:h|hours?)\b|5\s*小时|5\s*小时额度/i,/weekly|week|周额度|每周|周配额/i),98);
      remainingCheck(section(codex,/weekly|week|周额度|每周|周配额/i,/Credits|balance|余额|信用|点数/i),25);
      literal(codex,'USD 17.4200'); literal(codex,'Model-Z');
      const resetCredit=section(codex,/Reset credits|重置(?:额度|次数|积分|点数)/i,/Unavailable|不可用|Model-Z/i);
      has(resetCredit,/2/); has(resetCredit,/可用|剩余|available|remaining|left/i);
      lacks(resetCredit,/03:00|时区|timezone|UTC|GMT|Z\b/i);
      has(codex,/不可用|暂不可|满|capacity|unavailable/i);
      const counted=section(cp,/Premium requests|高级请求|高级额度/i,/Chat|聊天/i);
      has(counted,/75/); has(counted,/剩余|remaining|left/i); barCheck(counted,75,false);
      const unlimited=section(cp,/Chat|聊天/i,/Completions|补全/i); noBar(unlimited); has(unlimited,/不限|无限|unlimited/i);
      const zero=section(cp,/Completions|补全/i); noBar(zero); has(zero,/未分配|无.*(?:额度|配额)|没有.*(?:额度|配额)|no.*(?:quota|allocation)|unallocated|not allocated/i); lacks(zero,/耗尽|用尽|exhausted|0\s*(?:\/|of)\s*0|100\s*%|报告值|reported\s*(?:value|percent)|severity/i);
      lacks(cp,/\bCredits\b|额外积分|balance:\s*0|0-0|local messages|cloud messages/i);
      literal(ds,'CNY 48.1200'); lacks(ds,/(?<![\d.])(?:40\.0000|8\.1200)(?![\d.])/);
      lacks(t,/Local cache snapshot|20-30/);
      has(codex,/重置|恢复|reset/i);
      break;
    }
    case 'compact_direction_edges': {
      compactCheck(t);
      const edges=group(t,'Edges / Work','Codex / Custom'), custom=group(t,'Codex / Custom');
      remainingCheck(group(edges,'Small remainder','Already remaining'),2);
      remainingCheck(group(edges,'Already remaining','Empty remaining'),35);
      remainingCheck(group(edges,'Empty remaining','Full remaining'),0);
      remainingCheck(group(edges,'Full remaining','Conflicting figures'),100);
      const conflict=group(edges,'Conflicting figures','Access note'); noBar(conflict); has(conflict,/10/); has(conflict,/20/); has(conflict,/不一致|冲突|矛盾|conflict|inconsistent/i);
      literal(edges,'EUR 8.2500'); literal(custom,'12%'); noBar(custom); lacks(custom,/88%|剩余\s*12|12%\s*剩余|12%\s*(?:remaining|left)|(?:remaining|left)\s*:?\s*12%/i);
      break;
    }
    case 'compact_refresh_mixed': {
      compactCheck(t);
      const a=group(t,'Account A','Account B'), b=group(t,'Account B','Account C'), cc=group(t,'Account C');
      remainingCheck(a,80); lacks(a,/10%|旧数据|缓存|timeout/i);
      remainingCheck(b,40); has(b,/缓存|旧|cached|stale/i); has(b,/失败|超时|timeout|fail/i);
      remainingCheck(cc,50); has(cc,/缓存|旧|cached|stale/i);
      lacks(t,/1h 11m|1小时11|1 小时 11/);
      lacks(t,/全部.*(?:最新|刷新成功)|all.*(?:fresh|updated)/i);
      break;
    }
    case 'compact_stale_no_proxy':
      compactCheck(t); remainingCheck(t,70); has(t,/缓存|旧|cached|stale/i); has(t,/代理|proxy/i);
      lacks(t,/1h 11m|1小时11|1 小时 11|刷新成功|refresh succeeded/i); break;
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
      terminalExceptionProbes();
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
      has(t,/\\r|\\u000d|CR|U\+000D/i); has(t,/\\b|\\u0008|backspace|BS|U\+0008/i);
      has(t,/\\t|\\u0009|TAB|U\+0009/i); has(t,/\\u202e|U\+202E|RLO/i);
      noBar(t); break;
    default: assert.fail('Missing semantic assertions for ' + c.case_id);
  }
});
