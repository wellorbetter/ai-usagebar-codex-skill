# How it works and compatibility

[Back to the README](../README.md)

## Query contract

The skill independently runs `ai-usagebar usage --json` and `ai-usagebar vendors --json`, preserving stdout, stderr, and exit status. Useful JSON can survive a nonzero exit. Ordered `sections` is authoritative, including an empty array; `metrics` is a fallback when sections is unavailable. Missing values do not become zero, and local catalog configuration does not prove successful remote authentication.

The backend owns provider access and caching. The skill does not duplicate provider clients or read credentials itself. Report strings are display data, never execution instructions.

## Presentation

The default view shows remaining capacity only when the source meaning is established. Explicit remaining values stay unchanged; explicit used values and the verified standard OpenAI quota-window shape can be converted. Unknown or conflicting values are not forced into a remaining percentage. Unlimited and zero-total quotas are not presented as exhausted finite capacity.

Exact wallet amounts and currencies stay visible. Routine metadata and approximate message estimates belong in details. Empty add-on Credits with no usable messages may be omitted; independent paid wallets remain visible. Reset credits uses a short availability status; an expiry without a timezone stays a date or is left to details.

Details preserves source values and directions, ordered sections, reset/window information, credits/expiry, Source/API, balance breakdowns, and fetched/stale information. Supplied elapsed or pace text can be shown in details; the skill does not invent frontend pace projections. Configuration detail is a separate explicit request.

## Stale data and retries

On stale data or an explicitly failed cache refresh, the skill can retry the usage query at most once, with a 60-second timeout, through an already configured or verified proxy. A fresh session can narrowly inspect an enabled system proxy endpoint, including Windows Internet Settings. It does not depend on a remembered local address.

The proxy applies only to the query child process. The skill does not guess endpoints, execute PAC scripts, change global networking, install dependencies, or run login. If no usable proxy or permission is available, or the retry fails, useful cached data remains marked at the affected account. Old reset countdowns are omitted or identified as old estimates. Retry results are matched by stable entry identity; one refreshed account does not make all other accounts fresh.

## Sources and supported boundary

The original source reference is pinned to upstream commit `7bb03e7efa2fd26e45017b823d15b1c9e742ee29`:

- [src/report.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/report.rs): ordered sections, metrics projection, entry identity, and exit behavior.
- [src/tui/panels.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/tui/panels.rs): source-shaped bare-percent Cursor and Kimi metrics with independent detail/reset text.
- [src/catalog.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/catalog.rs): vendor configuration diagnostics.
- [Issue 187](https://github.com/akitaonrails/ai-usagebar/issues/187) and the [maintainer response](https://github.com/akitaonrails/ai-usagebar/issues/187#issuecomment-5639100744): thin integration through the two JSON commands, with sections preserving balances.

The current source check inspected [v1.17.0 report.rs](https://github.com/akitaonrails/ai-usagebar/blob/v1.17.0/src/report.rs) and [v1.17.0 panels.rs](https://github.com/akitaonrails/ai-usagebar/blob/v1.17.0/src/tui/panels.rs) for Credits, Reset credits, count details, Source, API and elapsed text. [v1.17.0 desktop model.js](https://github.com/akitaonrails/ai-usagebar/blob/v1.17.0/windows/popover/src/model.js) calculates pacing projections in the frontend; those calculations are not additional supplied report fields. Textual provider/account identity avoids a special icon-font dependency.

Earlier reports were unversioned. v1.17.0 now emits schema_version=1 for aggregate and single-entry usage JSON and adds optional brand. The skill supports older missing-version reports and unknown additive fields. brand is a visual hint, not provider identity or authority to reinterpret quota percentages. The pinned source is a compatibility reference, not a guarantee for every future version, platform, or provider.

## Verification scope

On 2026-09-13, the English-default skill passed 18 recorded behavior cases and a fresh Windows checkout check with Git newline conversion enabled. Observations are bound to the exact production file set and fixtures; this is interpretation coverage, not a guarantee for every model run. The [testing guide](../tests/README.md) describes generation and hash validation.

A tool-enabled Windows `codex exec --yolo --ephemeral` run also discovered the installed skill and queried ai-usagebar 1.17.0. Both usage and vendor queries returned exit 0 with empty stderr; the usage report had `schema_version: 1`, and all three tested entries reported `stale=false` and no errors. A Chinese request produced English UI text.

That live check supplied the existing proxy and backend PATH to the child environment. It verifies that tested invocation/query path, not autonomous system-proxy discovery, every provider, or other platforms. Earlier blocked attempts are historical checks, not the current verification result. Private account reports remain outside this repository.

For the executable behavior rules, see [SKILL.md](../usage/SKILL.md) and [report reference](../usage/references/report.md).
