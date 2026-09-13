# usage for Codex CLI

An independently maintained, instruction-only skill for querying multi-provider AI usage through the external [ai-usagebar CLI](https://github.com/akitaonrails/ai-usagebar). Invoke it with `$usage` to display provider/account groups, reported usage and balances, reset information, and local errors in terminal-friendly text. Eligible percentages use character bars labeled with the reported direction or as a neutral reported gauge with direction unknown.

The production package is `usage/SKILL.md`. It has no renderer script, plugin, GUI, or Node runtime requirement. It does not add a native `/usage` command.

## Prerequisite

Install and configure ai-usagebar separately using its [upstream installation and provider setup instructions](https://github.com/akitaonrails/ai-usagebar#readme). Its executable must be available in the environment where Codex CLI runs, and the host must be able to capture stdout, stderr, and exit status separately.

ai-usagebar owns provider fetching, authentication, configuration, and caching. The skill queries only:

```text
ai-usagebar usage --json
ai-usagebar vendors --json
```

A usage query does not install dependencies, log in, modify configuration, or directly read credentials. Missing dependencies or configuration produce upstream setup guidance.

## Install the skill folder

Copy this repository's entire `usage` folder to one of these documented local skill locations:

- User scope: `~/.agents/skills/usage/SKILL.md`, where `~` denotes your user home directory.
- Repository scope: `<your-repository>/.agents/skills/usage/SKILL.md`.

Create the parent directories if necessary. If a destination already exists, inspect it before replacing anything. Copy the folder once; do not accidentally create `usage/usage/SKILL.md`. Only the usage folder is needed at runtime.

These paths follow the [official skills documentation](https://learn.chatgpt.com/docs/build-skills.md). For repository discovery, launch Codex inside that repository: the documented scan covers `.agents/skills` from the current directory through the repository root. The documentation says changes are detected automatically; restart Codex if the skill does not appear. A local Codex CLI discovery/invocation smoke reached the usage workflow; command execution was then blocked by policy, as detailed under Validation.

## Use

In Codex CLI:

```text
$usage
```

Or request it naturally:

```text
Use ai-usagebar to show my AI provider usage, balances, and reset information.
```

Codex can select the skill when the request matches its description. Natural-language selection is model-dependent; `$usage` explicitly mentions the skill.

The report preserves usage entry order, including custom providers, and keeps accounts, windows, and currencies separate. Ordered sections take precedence over metrics so balances and text survive without duplicate gauges. An empty sections array remains authoritative. Metrics is used only as a labeled fallback when sections is absent, null, or the wrong type.

A command may return useful JSON with a nonzero exit status; the skill keeps that data and reports the anomaly. Catalog configuration flags do not prove remote authentication. Disabled providers are not setup failures merely because they are unconfigured; show them for requested configuration detail or to explain a specifically requested absent provider. Missing values do not become zero, and ready status does not prove freshness. Upstream text is displayed as data, never executed.

## Output example

Example layout only: all names, values, states, and timestamps below are synthetic, not real account data. The first metric explicitly supplies `35% used` and `percent=35`; its 5h label matches its 18000-second window. The second supplies `42%` and `percent=42` with no direction; its neutral gauge preserves that uncertainty. Adapt the rows to the actual report, preserving section order and additional information.

```text
Example AI / Work (Pro)
  Session (5h)  [#######-------------] 35% used
    Reset: 2026-09-12T06:00:00Z
  Weekly        [########+-----------] 42% | Reported gauge (direction unknown)
    Detail: Resets in 2 days
  Balance: USD 12.3400
  Fetched: 2026-09-12T01:00:00Z
  + = partial 5% cell

Example AI / Personal
  Error: sign in expired
  No sections reported | Freshness unknown
```

The default view uses compact account groups and 20-cell ASCII bars for finite, nonconflicting percentages in 0–100, with original values and reported times. A bar follows an explicitly reported used/remaining direction without inversion; otherwise it is labeled `Reported gauge (direction unknown)`. Bars contain floor(percent / 5) full `#` cells, one `+` for any remaining fraction of a 5% cell, and `-` padding to 20 cells: 0.1% is visible and 99.9% is not full. Exact original numbers remain beside the bar. Malformed, same-quantity conflicting, and out-of-range percentages retain their data and a diagnostic without a bar. Explicit Unlimited and zero-denominator quotas also keep their raw data without a misleading finite-quota bar. Used, remaining and elapsed percentages describe different quantities; they are not automatically conflicts or interchangeable direction evidence. Long labels, details, and errors continue on indented lines within their group. Equivalent value/percent or window fields share a row; distinct information stays visible. Routine healthy state and normal/low severity need no repeated labels; errors, stale/unknown freshness and distinct fetched times remain visible. Report-supplied Credits, Reset credits/expiry, Source, API status, count details, monetary breakdown, reset times/windows and pace/elapsed text survive in sections order. No new projection or countdown is calculated. Account ids appear when needed to distinguish entries. Configuration diagnostics focus on problems; ask for configuration details to inspect available catalog flags. No wide table or complex frame is required.

## Sources and supported boundary

The original source reference is pinned to upstream commit `7bb03e7efa2fd26e45017b823d15b1c9e742ee29`:

- [src/report.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/report.rs): ordered sections, metrics projection, entry identity, and exit behavior.
- [src/tui/panels.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/tui/panels.rs): source-shaped bare-percent Cursor and Kimi metrics with independent detail/reset text.
- [src/catalog.rs](https://github.com/akitaonrails/ai-usagebar/blob/7bb03e7efa2fd26e45017b823d15b1c9e742ee29/src/catalog.rs): vendor configuration diagnostics.
- [Issue 187](https://github.com/akitaonrails/ai-usagebar/issues/187) and the [maintainer response](https://github.com/akitaonrails/ai-usagebar/issues/187#issuecomment-5639100744): thin integration through the two JSON commands, with sections preserving balances.

The presentation polish also inspected [v1.16.0 report.rs](https://github.com/akitaonrails/ai-usagebar/blob/v1.16.0/src/report.rs) and [v1.16.0 panels.rs](https://github.com/akitaonrails/ai-usagebar/blob/v1.16.0/src/tui/panels.rs) for Credits, Reset credits, count details, Source, API and elapsed text. [v1.16.0 desktop model.js](https://github.com/akitaonrails/ai-usagebar/blob/v1.16.0/windows/popover/src/model.js) calculates pacing projections in the frontend; those calculations are not additional supplied report fields. Textual provider/account identity avoids a special icon-font dependency.

The maintainer guidance notes that the usage report has no schema version and fields must be treated as optional. The pinned source is a design reference, not a tested minimum release or a guarantee for every future version, platform, or provider.

## Validation

Run the development behavior validator from the repository root:

```text
node --test tests/behavior.test.mjs
```

See [tests/README.md](tests/README.md) for observation-generation instructions. The validator checks recorded independent synthetic executions in `tests/observed-results.json`; it does not automatically run a new model execution. Records preserve original responses, execution identifiers, tool traces, and exact skill/cases hashes. Missing records, stale hashes, or failed assertions must fail validation. Changes to the skill or cases require newly generated observations; never rebind old responses to new hashes or treat an earlier passing run as validation of the revision.

Validation has three separate layers:

- Structure: skill-creator's `quick_validate.py` checks packaging and frontmatter, not model behavior.
- Synthetic interpretation: independent executions receive only the skill, case request, and injected command-result envelopes. Cases cover account/window/currency separation, ordered sections and fallback, custom providers, optional/malformed data, directed/neutral/conflicting percentages, configuration diagnostics, partial errors, and hostile text. Their recorded `synthetic injection` results are interpretation evidence, not actual CLI calls. Review the responses alongside the validator.
- CLI discovery: an earlier local smoke reached the usage workflow, but both commands were blocked by execution policy before launch.
- Live backend and rendering: a later host-run check obtained actual backend results using a temporary process-scoped proxy and successfully rendered the returned report. This establishes that tested backend/rendering path, not a complete autonomous discovery-plus-command run or cross-platform portability. Private reports are not public test fixtures.

The installed `usage` folder does not depend on Node or test artifacts. Any passing claim must identify the actual validator command, exit status, observations, and tested hashes. Source inspection and synthetic records alone do not prove live integration; the host check above has its own narrower scope. None establishes cross-platform compatibility or upstream approval.
