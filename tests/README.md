# Independent synthetic behavior checks

These development-only tests require Node; the installed skill does not.

Run `node --test tests/behavior.test.mjs` from the repository root. This validates recorded observations; it does not invoke a model or automatically generate responses. Missing observations, malformed records, stale hashes, missing/duplicate case IDs, or semantic failures produce a nonzero exit.

## Obtain and preserve observations

A host runs the current usage/SKILL.md independently for each cases.json case. Give the executor only the skill, that case's request, and its raw usage/vendors result envelopes. Do not provide this validator, expected answers, previous outputs, or reviewer conclusions. Use a fresh isolated execution context per case. The host injects the two command results and disables tools: the executor interprets supplied results instead of launching commands.

Record the final response verbatim, the actual execution identifier, and actual tool trace. Injection runs have tools_called: []; injected envelopes are not actual calls. If independent execution is unavailable, report blocked and retain the failing missing-observation state.

Write tests/observed-results.json using this structure (placeholders below are documentation, not observations):

```json
{
  "skill_sha256": "<SHA-256 of exact usage/SKILL.md bytes>",
  "cases_sha256": "<SHA-256 of exact tests/cases.json bytes>",
  "results": [
    {
      "case_id": "<case id>",
      "final_text": "<verbatim independent final response>",
      "execution_id": "<actual host execution identifier>",
      "mode": "synthetic injection",
      "tools_called": []
    }
  ]
}
```

Include every case exactly once. Compute hashes before dispatch and verify files stayed unchanged before recording them. When skill or cases change, rerun independent executions and obtain a complete observation set for the new hashes; never rebind old answers. Preserve host execution logs separately so identifiers and empty tool traces can be audited. Commit actual observations with the repository as recorded evidence, never as prefilled expected answers. Inspect a validation failure before changing a criterion: return product defects to the skill owner and rerun after correction.

## Coverage and limits

The original ten cases retain account/window/currency association, ordered nonduplicate sections, balances, metrics fallback versus authoritative empty sections, null/missing/unknown values, timestamps, partial and command failures, and escaped hostile text. The bare 42% row allows a neutral bar only with eight filled cells and explicit direction uncertainty. Representative short directed rows require correct 20-cell bars.

Two additional cases cover source-shaped Cursor (98%, Auto + Composer) and Kimi (bare percentages with reset-only details) neutral bars; disabled, enabled/unconfigured, unknown-enabled and healthy catalog rows under default and explicit-detail requests; contradictory and malformed percentages without bars; and long labels, details and errors wrapping into indented continuations within their account. Cursor/Kimi shapes follow the pinned upstream src/tui/panels.rs snapshot cited in the root README; catalog flags follow src/catalog.rs. These are synthetic values, not live account data.

The validator accepts reasonable English/Chinese diagnostic wording and whitespace wrapping while preserving source text and numbers. Missing quota accepts explicit null/unavailable wording without inventing zero. Only the exact original HTML payload of vendors_failure can be treated as data in an attributed stdout/JSON error diagnostic; extra markup remains rejected. Assertions are targeted checks, not proof that arbitrary prose is correct. Review raw responses for state attribution, neutral direction, safe fencing, and unsupported claims.

Synthetic injection verifies interpretation only. Disabled tools cannot establish command compliance when tools are available. A separate CLI smoke reached skill discovery/invocation, but both fixed commands were blocked by execution policy before launch; neither command ran. That smoke did not establish separate stream capture, live account access, or successful command integration. A successful end-to-end check needs actual argv, stdout, stderr and exit status for exactly ai-usagebar usage --json and ai-usagebar vendors --json. Installation portability and real-account behavior remain unverified. Revised-file pass/fail results come from the host's fresh observations and test run, not this README.
