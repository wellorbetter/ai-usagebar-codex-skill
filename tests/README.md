# Independent synthetic behavior checks

Run node --test tests/behavior.test.mjs from the repository root. Node is development-only. This validates recorded independent answers, not a new model invocation. Missing observations, changed hashes/file sets, duplicate cases or semantic failures fail validation.

## Generate observations

For each case, use a fresh isolated execution with only the candidate usage/SKILL.md, its linked references, case request, raw usage/vendors envelopes and any context/retry_usage fields. Disable tools for injection. Do not provide tests, expected answers or earlier observations. Retry envelopes are supplied attempts, not actual calls. Record final_text verbatim, the actual execution_id, mode="synthetic injection" and the actual tools_called trace (empty for disabled tools).

The observed-results.json root contains skill_sha256, cases_sha256, usage_files_sha256 and results. usage_files_sha256 is an object keyed by each file path relative to usage/ (for example SKILL.md and references/report.md), sorted recursively, with SHA-256 of exact file bytes. Bind the complete production file set, including newly added references, not only the entry skill. Keep legacy skill_sha256 and cases_sha256 too. Each results item contains case_id, final_text, execution_id, mode and tools_called.

Hash before dispatch and verify the files stay unchanged before writing observations. Re-run all cases after any change; never edit or rebind old responses to pass. Keep execution logs outside the repository for audit. If independent generation is unavailable, report blocked with the expected failing observation state. Inspect failure causes before changing an assertion.

## Coverage

The original 14 raw command envelopes remain unchanged and now explicitly request usage details. They retain account/window/currency attribution, sections precedence/fallback, optional/malformed data, nonzero/partial failures, configuration diagnostics, hostile text, original directed/neutral bars, boundary cells and rich credits/count/elapsed detail checks. Configuration catalog detail remains a separate explicit request.

Four compact cases check source-shaped openai remaining conversion, Copilot counts/Unlimited/zero total, all-provider paid balances and unavailable models; directed/remaining/endpoints/unknown/conflict semantics; mixed successful/failed/missing retry entries; and stale data with no configured proxy. They reject verbose metadata and current-looking stale countdowns without prescribing one complete answer. Inspect actual layout, readability, warning attribution and numerical meaning independently of the regex checks.

Synthetic retry data establishes interpretation only. It cannot prove that a tool-enabled execution finds system proxy settings, limits retries or isolates a child environment. Host live backend queries through an existing process-only proxy have succeeded; earlier returned report rendering succeeded too. Complete autonomous discovery-plus-command execution remains a separate unproven boundary. No private account data or local proxy endpoint belongs in fixtures. Hash/behavior checks passing do not establish cross-platform portability.
