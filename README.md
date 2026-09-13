# usage for Codex CLI

An independently maintained, instruction-only skill for the external [ai-usagebar CLI](https://github.com/akitaonrails/ai-usagebar). $usage shows remaining capacity, reset time and balances in compact terminal text. $usage details or $usage 查看详情 opens the richer original report. It adds no native /usage command, GUI, plugin or renderer runtime.

## Install

Install/configure ai-usagebar separately from its [upstream instructions](https://github.com/akitaonrails/ai-usagebar#readme). Copy this repository's entire usage folder, including references, to ~/.agents/skills/usage for user scope, or <repository>/.agents/skills/usage for repository scope. Inspect an existing destination before replacement; avoid usage/usage nesting. Only the usage folder is needed at runtime.

These locations follow the [official skills documentation](https://learn.chatgpt.com/docs/build-skills.md). Launch Codex inside the repository for repository discovery; restart if the skill does not appear. Natural-language selection is model-dependent; $usage explicitly selects it. The installed skill has no Node dependency.

## Use

~~~text
$usage
$usage 查看详情
~~~

The default follows your language. Synthetic example, with supplied used percentages 2 and 75:

~~~text
Example / Work
  5小时  [###################+] 剩余 98% · 3小时后重置
  每周   [#####---------------] 剩余 25% · 2天后重置
  余额   USD 12.3400
~~~

Every quota window stays separate. Bars represent displayed remaining, with partial cells for small positive values and exact percentages alongside. Explicit remaining is unchanged; explicit used and the verified standard openai quota-window shape can be converted. Unknown provider semantics remain unconverted, without a misleading remaining bar. Unlimited and zero-total quotas do not look like consumed finite quotas.

The default keeps balances, unavailable models and actionable errors while leaving timestamps, severity names, pacing and routine metadata to details. Zero-total quotas show only their plain no-quota status. Empty add-on Credits with no usable messages may be omitted; actual wallet amounts stay visible. Reset credits uses a short availability status, with an unzoned expiry date left as a date or available in details. Details preserves original values/directions, ordered sections, reset/window, credits/expiry, Source/API, balance breakdown and fetched/stale information. Configuration details are a separate request. Neither view invents pace projections or executes report text.

## Query and stale data

The skill independently runs ai-usagebar usage --json and ai-usagebar vendors --json, retaining stdout/stderr/exit status. Useful JSON survives a nonzero exit. sections wins over metrics even when empty; missing values do not become zero and catalog configuration does not prove remote authentication.

If a result is stale, the skill may retry usage once with a timeout through an already configured or verified proxy. A fresh session can narrowly read an enabled system proxy endpoint; it does not depend on remembered local addresses. Proxy settings apply only to the query child. It does not guess addresses, read credentials, run login, change global networking or install dependencies. No usable proxy or a failed retry leaves cached values clearly marked, without presenting an old countdown as current. The external CLI still owns provider authentication/cache operations.

## Sources and supported boundary

The original source reference is pinned to upstream commit `7bb03e7efa2fd26e45017b823d15b1c9e742ee29`:

- [src/report.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/report.rs): ordered sections, metrics projection, entry identity, and exit behavior.
- [src/tui/panels.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/tui/panels.rs): source-shaped bare-percent Cursor and Kimi metrics with independent detail/reset text.
- [src/catalog.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/catalog.rs): vendor configuration diagnostics.
- [Issue 187](https://github.com/akitaonrails/ai-usagebar/issues/187) and the [maintainer response](https://github.com/akitaonrails/ai-usagebar/issues/187#issuecomment-5639100744): thin integration through the two JSON commands, with sections preserving balances.

The presentation polish also inspected [v1.16.0 report.rs](https://github.com/akitaonrails/ai-usagebar/blob/v1.16.0/src/report.rs) and [v1.16.0 panels.rs](https://github.com/akitaonrails/ai-usagebar/blob/v1.16.0/src/tui/panels.rs) for Credits, Reset credits, count details, Source, API and elapsed text. [v1.16.0 desktop model.js](https://github.com/akitaonrails/ai-usagebar/blob/v1.16.0/windows/popover/src/model.js) calculates pacing projections in the frontend; those calculations are not additional supplied report fields. Textual provider/account identity avoids a special icon-font dependency.

The maintainer guidance notes that the usage report has no schema version and fields must be treated as optional. The pinned source is a design reference, not a tested minimum release or a guarantee for every future version, platform, or provider.

## Validation

Run node --test tests/behavior.test.mjs from the repository root. See [tests/README.md](tests/README.md) for independent observation generation. Checks bind the complete production usage file set plus cases to exact SHA-256 hashes; changing a reference invalidates observations too. Never rebind old answers to a new skill.

Validation layers have different scopes:

- Packaging checks establish frontmatter/file structure, not model behavior.
- Independent synthetic injections test interpretation of raw reports and retry results with tools disabled. They cannot prove actual proxy lookup, command count or child environment isolation. Review actual default output as well as assertions.
- An earlier autonomous discovery/invocation smoke reached the skill but execution policy blocked its commands.
- Host-run live backend checks using a temporary process-only proxy succeeded, including a fresh query for this revision with no reported stale/error for the tested providers; returned reports were rendered successfully in the earlier check. Complete autonomous discovery plus commands has not yet been independently demonstrated. Private reports remain outside public fixtures. This is not a portability or universal provider guarantee.

Any passing revision claim requires fresh observations and the actual validator result. Only synthetic data and observations belong in git; install the whole verified usage folder including references.
