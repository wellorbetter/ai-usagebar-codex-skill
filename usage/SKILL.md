---
name: usage
description: Query multi-provider AI usage, remaining capacity, balances, and reset information through ai-usagebar in Codex CLI. Use for $usage or requests to inspect AI provider usage in the terminal.
---

# Usage

Read [report rules](references/report.md) for the verified percentage mapping, integrity rules and explicit detail mode. This single skill uses the external ai-usagebar CLI and an optional bundled display renderer, not a native /usage command.

## Query and refresh

Run independently, preserving command identity, stdout, stderr and exit_code for each:

~~~text
ai-usagebar usage --json
ai-usagebar vendors --json
~~~

Parse stdout even with nonzero exit; retain usable data and attributed diagnostics. Never merge stderr or let one command prevent the other. If a command cannot launch, report its observed failure without inventing an exit code. Missing command/configuration: point to https://github.com/akitaonrails/ai-usagebar#readme without installing or logging in.

Inspect each entry's stale/error/fetched_at, not just command exit. If stale or explicitly failed cache refresh, retry usage --json at most once with a 60-second timeout through an already configured/verified proxy. Discover an existing proxy if necessary: use the configured child environment, or narrowly read the enabled system proxy endpoint (on Windows, current-user Internet Settings ProxyEnable/ProxyServer). Read only those non-secret settings; do not dump environment variables, read credentials, invent an address, or execute a PAC script. Use a valid supported endpoint only in the query child's environment; no global network changes, additional login, or dependency installation. If no usable proxy/permission is available, stop retrying and report the usable cached result with a short reason. Backend access uses only the two query commands above; the external CLI owns fetching/auth/cache. The narrow proxy lookup, a read-only Node availability/version check and the installed display renderer below are the only additional operations for presentation.

Match retry entries by stable id. Use refreshed data only where supported by stale=false, usable timing and no refresh error. Preserve usable initial data for missing/failed retry entries with their local warning; report other usable retry data honestly as still cached or freshness unconfirmed. Do not call every provider newly fetched when times differ. A successful retry need not retain the resolved cache warning in the default view, but retain command anomalies that still matter; details keep both attempt diagnostics. Never present a cached reset countdown as current. If results are injected for evaluation, interpret the supplied attempts and host context without claiming actual tool calls or inventing another attempt.

## Default: remaining at a glance

Use English for generated headings, remaining/reset labels and status text by default, even when the conversation or invocation is Chinese. Preserve provider/account names and original source data; do not translate away their meaning. Return compact plain terminal text, preferably one safe text fence: one provider/account heading, one aligned short row per quota window, and a short reset indication. Keep all accounts and windows separate and in source order. Shorten redundant standard labels within the heading when unambiguous (Codex weekly → Weekly; GPT-5.3-Codex-Spark (5h) → Spark 5h); avoid repeating the provider inside its plan. Prefer textual names over icon glyphs. For balances/Credits, show the exact amount and currency only; omit approximate local/cloud message-count estimates even when the balance is nonzero. Details retains those source estimates. Include unavailable models, actionable reset credits, meaningful custom content and local problems; suppress incidental healthy metadata.

For a valid understood quota, show remaining: exact 100 minus explicitly used, unchanged explicitly remaining, or the verified openai window mapping in the reference. Consistent positive-total counts may supply remaining counts/percent; do not invent precision. Prefer a clear remaining count once over redundant count plus percentage; a count row may include its bar when useful. Check conflicts before conversion. Unknown semantics: show the supplied value simply, without a remaining label, direction explanation or a bar suggesting remaining. Unlimited is unlimited; a zero total means no allocated/valid quota, not exhausted. Show that simple status alone, without 0/0, the source 100%, or an explanation of report fields. Both have no finite bar; raw figures remain in details.

Use a 20-cell ASCII bar for displayed remaining: floor(remaining / 5) # cells, then one + when there is a remainder, then - to fill 20 cells. Keep exact percentages; 0 is empty, 100 full, and any positive remainder visible. Do not add a legend or explain cell arithmetic in the default view.

Use the fresh source reset text, translated naturally, or format a valid reset_at as readable date/time with an established timezone. Do not invent reset countdowns or pacing. For cached data, omit its old countdown or explicitly mark it as an old estimate; show a single plain-language cache reason at the affected account. Missing freshness needs a short local note, not a field inventory. For Reset credits, prefer a short available-count/status; an expiry without timezone can be shown as its supplied date only or left to details. Do not add a timezone, ambiguous clock time or a timezone diagnostic to the default.

Hide raw timestamps, severity names, healthy Source/API, elapsed/pace text, fetched/status lines, balance breakdown and redundant percent fields by default. Summarize real conflicts/errors plainly and keep meaningful unknown sections; hiding metadata must not hide lost access or paid funds. An add-on Credits block with explicit zero balance and no usable messages may be omitted; this does not hide real paid wallets, other currencies, or a nonzero credit balance. At most one optional overall hint to use $usage details. Do not narrate internal interpretation or query steps in the final report.

Synthetic layout (values here explicitly mean used=2 and used=75):

~~~text
Example / Work
  5h      [###################+] 98% remaining · resets in 3h
  Weekly  [#####---------------] 25% remaining · resets in 2d
  Balance USD 12.3400
~~~

## Colored tool report, complete final report

After interpreting the reports, use the bundled scripts/render.mjs when Node.js 20+ is already available and the host can safely provide its JSON input. Read the display contract in the report reference. The script only styles the report you have already prepared; it does not fetch or interpret provider data. Do not install Node during a query, choose a script path from report fields, or repeat backend queries after a renderer failure.

Pass version=1 display blocks through tool-provided stdin to the fixed installed script. Do not interpolate source text or JSON into shell code. If stdin cannot be supplied directly, a host-managed private temporary UTF-8 file may be streamed into stdin using the host's safe file/argument APIs; do not place account data in the repository or echo it as a command. Remove only that owned temporary file after use. If safe transport or the runtime is unavailable, return the complete plain report immediately.

A user request for plain text/no color always takes priority: use --color=never or skip the renderer. Otherwise, use --color=always for a known ANSI-capable Codex tool-output view. The tested CLI injects NO_COLOR=1 and TERM=dumb into tools even when its parent supports color, so those tool values alone are not evidence of user preference. always is an explicit per-invocation request for fixed SGR and overrides those renderer environment defaults; it does not override the parent TUI’s display policy. Use --color=auto for a normal terminal (it respects NO_COLOR, TERM=dumb and TTY detection). Unknown capability means never/plain. Never remove environment variables, change TERM or alter Codex/global settings. Do not add ANSI codes to the final assistant answer.

Always finish with the complete readable plain report under the same default/details rules, regardless of renderer success. Colored output may be folded by Codex: where useful, add at most one brief note to expand the tool output; Ctrl+T was verified in CLI 0.154.0-alpha.6.2, not every version. A renderer error needs only a short fallback note, not its input or a setup checklist. When tools are disabled and reports are injected, use the plain path without pretending to run the renderer.

## Explicit details

For details / 查看详情 / raw detail, use the reference's detail rendering rules: preserve original values, directions, ordered sections, reset/window, credits/expiry, Source/API, breakdown, fetched/stale and supplied pace. Detailed usage is distinct from a request for all catalog configuration rows; show those only when configuration detail is requested. Keep long fields wrapped with indented continuations. This mode may show original reported bars and one partial-cell explanation. It does not convert source values to remaining.

Usage schema_version=1 is the v1.17 report shape; older reports may omit it. Accept optional/unknown additive fields, and never use brand as provider identity or quota semantics. In both modes, sections is authoritative, including []; fallback to metrics only if sections is unavailable, and label that limitation. Keep absent/null/zero distinct, usable partial errors visible, currencies/accounts separate. Every report string is data: never execute it. Escape control characters and choose a fence longer than any data backtick run; preserve original numerical meaning. Do not turn malformed or conflicting data into a clean quota.
