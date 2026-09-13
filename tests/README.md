# Independent synthetic behavior checks

Run node --test tests/behavior.test.mjs tests/renderer.test.mjs from the repository root. Node.js 20+ is used for tests and the optional runtime renderer; plain skill output remains available without it. This validates recorded independent answers, not a new model invocation. Missing observations, changed hashes/file sets, duplicate cases or semantic failures fail validation.

## Generate observations

For each case, use a fresh isolated execution with only the candidate usage/SKILL.md, its linked references, case request, raw usage/vendors envelopes and any context/retry_usage fields. Disable tools for injection. Do not provide tests, expected answers or earlier observations. Retry envelopes are supplied attempts, not actual calls. Record final_text verbatim, the actual execution_id, mode="synthetic injection" and the actual tools_called trace (empty for disabled tools).

The observed-results.json root contains skill_sha256, cases_sha256, usage_files_sha256 and results. usage_files_sha256 is an object keyed by each file path relative to usage/ (for example SKILL.md and references/report.md), sorted recursively, with SHA-256 of exact file bytes. Bind the complete production file set, including newly added references, not only the entry skill. Keep legacy skill_sha256 and cases_sha256 too. Each results item contains case_id, final_text, execution_id, mode and tools_called.

Hash before dispatch and verify the files stay unchanged before writing observations. Re-run all cases after any change; never edit or rebind old responses to pass. Keep execution logs outside the repository for audit. If independent generation is unavailable, report blocked with the expected failing observation state. Inspect failure causes before changing an assertion.

## Coverage

The original 14 raw command envelopes remain unchanged and now explicitly request usage details. They retain account/window/currency attribution, sections precedence/fallback, optional/malformed data, nonzero/partial failures, configuration diagnostics, hostile text, original directed/neutral bars, boundary cells and rich credits/count/elapsed detail checks. Configuration catalog detail remains a separate explicit request.

Four compact cases check source-shaped openai remaining conversion, Copilot counts/Unlimited/zero total, all-provider paid balances and unavailable models; directed/remaining/endpoints/unknown/conflict semantics; mixed successful/failed/missing retry entries; and stale data with no configured proxy. They reject verbose metadata and current-looking stale countdowns without prescribing one complete answer. ASCII-source compact cases use Chinese requests and require English generated UI; English label synonyms remain acceptable. A source-shaped case declares schema_version=1 with optional brand/additive fields, while old missing-version reports remain covered. A custom entry borrowing brand=openai must remain unconverted. Inspect actual layout, readability, warning attribution and numerical meaning independently of the regex checks.

Synthetic retry data establishes interpretation only. It cannot prove that a tool-enabled execution finds system proxy settings, limits retries or isolates a child environment. A later tool-enabled `codex exec --yolo --ephemeral` smoke invoked the installed skill with ai-usagebar 1.17.0. After unavailable Python wrapper attempts, it used PowerShell to execute usage/vendors independently; both queries returned exit 0 and empty stderr, with schema_version=1 and no reported stale/error for the three tested entries. The Codex turn exited 0. The existing proxy was supplied to the child environment; this proves the tested CLI invocation/query path, not autonomous system-proxy discovery, every provider or all platforms. Private reports remain outside git. No private account data or local proxy endpoint belongs in fixtures. Hash/behavior checks passing do not establish cross-platform portability.


## Renderer and installed integration

renderer.test.mjs uses Node built-ins and synthetic display blocks to test stdin transport, strict schema/limits, no partial stdout on failure, Unicode/control escaping, fixed palette and plain/color equivalence. The color matrix covers Codex-injected NO_COLOR=1/TERM=dumb: auto and never are plain, while explicit always emits SGR. A user plain/no-color request must select never in skill execution; actual parent-TUI display remains a separate smoke check. It does not query providers. For a focused pre-observation check run node --test tests/renderer.test.mjs; the complete validation command above also requires fresh behavior observations.

After any production change, regenerate all 18 independent cases with the candidate instructions and required references. Include scripts in the existing recursive usage_files_sha256 map. Tools-disabled injections exercise the complete plain fallback; they do not prove renderer invocation or terminal colors. The host writes fresh raw execution evidence outside the repository, then an observation-only broker edit records it without rewriting answers.

Use a separate authorized synthetic tool-enabled smoke to verify invocation/colored output, folded-output usability and disabled-color/missing-runtime fallback. Actual Codex CLI launches use --yolo; do not confuse injected model observations with tool calls. Installation verification compares every production file, including scripts, with the validated copy. No private reports belong in tests.
