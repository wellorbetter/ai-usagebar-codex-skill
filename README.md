# usage for Codex CLI

**Check AI quotas, reset times, and balances without leaving your coding session.**

Type `$usage` in Codex CLI to get a compact report from [ai-usagebar](https://github.com/akitaonrails/ai-usagebar). See what remains across your configured providers and accounts, then ask for details when you need the full report.

[Install](#install) · [Usage](#usage) · [Troubleshooting](#troubleshooting) · [How it works](docs/compatibility.md)

```text
Codex / Work
  5h            [###################+] 98% remaining · resets in 3h
  Weekly        [#####---------------] 25% remaining · resets in 3h
  Balance       USD 17.4200
  Reset credits 2 available · expires 2026-10-02
  Unavailable   Model-Z at capacity

Copilot / Work
  Premium requests  75 remaining
  Chat              Unlimited
  Completions       No allocated quota

DeepSeek / Work
  Balance CNY 48.1200
```

*Actual skill output from a synthetic test. Names and amounts are test data; your providers, values, and layout may differ.*

## Features

- **Remaining at a glance.** Compact quota bars, remaining request counts, and reset times, grouped by provider and account.
- **Balances stay visible.** Paid wallets and currencies remain separate; routine metadata stays out of the default view.
- **Useful status, less noise.** Unlimited quotas, unallocated quotas, unavailable models, and reset credits get readable status text.
- **Details when needed.** Original reported values, balance breakdowns, timestamps, and diagnostics are available with `$usage details`.
- **Honest freshness.** Cached results are marked when refresh fails, with warnings attached to the affected account.
- **A small installation.** The skill consists of instructions and a reference file. Only the `usage/` folder is needed at runtime.

Provider availability comes from your ai-usagebar installation and configuration. The example shows Codex, GitHub Copilot, and DeepSeek; see [upstream configuration](https://github.com/akitaonrails/ai-usagebar/blob/main/docs/configuration.md) for other providers and account setup.

## Install

### 1. Set up ai-usagebar

Install [Codex CLI](https://developers.openai.com/codex/cli) and follow [ai-usagebar's installation guide](https://github.com/akitaonrails/ai-usagebar#install) to install the backend and configure the providers you want to query.

Check that the backend is available in the terminal where you use Codex:

```sh
ai-usagebar --version
ai-usagebar usage --json
ai-usagebar vendors --json
```

If these commands report a missing installation or account configuration, resolve that in ai-usagebar first. This skill uses its existing provider setup.

### 2. Add the skill to Codex

Paste this into **Codex**, rather than your shell:

```text
$skill-installer Install the usage skill from https://github.com/wellorbetter/ai-usagebar-codex-skill/tree/main/usage
```

<details>
<summary>Manual installation</summary>

Clone this repository, or download its ZIP and extract it:

```sh
git clone https://github.com/wellorbetter/ai-usagebar-codex-skill.git
```

Copy the **entire `usage` folder**, including `references`, to one of these locations:

| Scope | Destination |
| --- | --- |
| Your user, across projects | `~/.agents/skills/usage/` |
| One repository | `<repository>/.agents/skills/usage/` |

On Windows, `~` means your user profile directory, such as `C:\Users\you`. Create the parent folders if needed. If a `usage` skill is already installed, back it up before replacing it.

The final folder should look like this:

```text
.agents/skills/usage/
├── SKILL.md
└── references/
    └── report.md
```

Check that you have `usage/SKILL.md`, not `usage/usage/SKILL.md`. You do not need to copy the tests or build the repository.

</details>

These locations and the installer workflow follow the [official Codex skills guide](https://learn.chatgpt.com/docs/build-skills). If the skill does not appear, restart Codex. For a repository installation, launch Codex inside that repository.

### 3. Check your usage

In Codex CLI, type:

```text
$usage
```

Codex runs the backend queries and returns a readable report. `$usage` is a skill invocation inside Codex; it is not a shell executable or a built-in `/usage` command.

## Usage

| Ask Codex | What you get |
| --- | --- |
| `$usage` | Remaining capacity, reset times, balances, and actionable problems. |
| `$usage details` | Original reported values, quota windows, balance breakdowns, freshness, and diagnostics. |
| `$usage show provider configuration details` | Configuration information from the provider catalog. |

Generated headings and status text default to **English**, even in a conversation in another language. Provider names, account names, and source data keep their meaning.

**Reading the bars:** a fuller bar means more remaining capacity. Known used percentages are converted to remaining; values with unknown or conflicting meaning are kept without a misleading remaining bar. Details preserves the original reported direction, so its percentages may differ from the default view.

**Refreshing:** each invocation queries ai-usagebar, which manages fetching and caching. If the result is stale, the skill can retry once through an existing usable proxy. If refreshing still fails, it shows the usable cached values with a short reason. It is an on-demand report; rerun `$usage` for another check.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| Codex cannot find `usage` | Verify the installed folder structure above, then restart Codex. |
| `ai-usagebar` cannot be launched | Check that it is installed and available on the PATH inherited by Codex. |
| A provider needs configuration or sign-in | Follow [upstream configuration](https://github.com/akitaonrails/ai-usagebar/blob/main/docs/configuration.md), then rerun `$usage`. |
| A cached result or refresh error | Check the backend's connectivity and your existing proxy setup. Use `$usage details` for diagnostics. |
| A provider or window is missing | Check `ai-usagebar usage --json` directly. The skill can only display data the backend returns. |
| A value has no remaining bar | Its meaning may be unknown, conflicting, unlimited, or unallocated. Details shows the source values. |

To update a manual installation, get the latest repository version and replace the installed `usage/` folder after backing up any local changes. Keep `SKILL.md` and `references/report.md` together.

## How it works

This is an independently maintained Codex skill. ai-usagebar owns provider integrations, authentication, and caching; the skill queries its usage and vendor JSON reports and explains them in the terminal.

The checked backend version is **ai-usagebar 1.17.0**. Compatibility notes, report semantics, and the limits of live testing are in [How it works and compatibility](docs/compatibility.md).

## Development

No project build is needed to use the skill. To check the recorded behavior locally, run this from the repository root with Node.js installed:

```sh
node --test tests/behavior.test.mjs
```

The suite checks 18 recorded synthetic cases, including remaining quotas, balances, stale data, partial failures, and hostile input. It validates saved observations; it does not query your accounts or start new model runs. See the [testing guide](tests/README.md) before changing the skill or its references.

For issues with the terminal presentation or skill instructions, [open an issue here](https://github.com/wellorbetter/ai-usagebar-codex-skill/issues). For provider integrations and backend data, use [ai-usagebar's issue tracker](https://github.com/akitaonrails/ai-usagebar/issues). Use synthetic or redacted examples when reporting a problem.

## Acknowledgments

Built on [akitaonrails/ai-usagebar](https://github.com/akitaonrails/ai-usagebar), following the maintainer's [guidance for external skills](https://github.com/akitaonrails/ai-usagebar/issues/187#issuecomment-5639100744). This repository maintains the Codex integration separately from the upstream application.
