# voice-rewriter Contract

Version 2026-09-03. Root rules: `/Volumes/Extreme Pro/Documents/Work/AGENTS.md`.

## Purpose
Local CLI and library that rewrites a social post or reply in a supplied voice with Gemini (`gemini-flash-latest`, HIGH reasoning), then fail-closes on factual or meaning drift. Live on npm as `voice-rewriter`. Monetization: none (MIT).

## Surfaces & commands
- Repo: `open-source/projects/voice-rewriter`, default branch `main`, worktree `.worktrees/`.
- Build: `npm run build`. Test: `npm test`. Full gate: `npm run lint`.
- Runtime: `GEMINI_API_KEY`. No ASC, VPS, Stripe, or DNS.
- Never change the fail-closed audit, model pin, or exit-code map without Victor's word.

## Gate items
- npm publish: `NEEDS-GO: npm publish`
- git push: `NEEDS-GO: git push origin <branch>`
- GitHub release: `NEEDS-GO`

## Evidence
`npm test` passing output; TUI text receipts in `_receipts/design-system/voice-rewriter/`; journal line in `_journal/YYYY-MM.md`.

## Design
`DESIGN.md` at the repo root is the visual system; read it before UI, asset, or layout work. Gate: `node "/Volumes/Extreme Pro/Documents/Work/_tools/designmd/bin/designmd.mjs" lint DESIGN.md` → 0 errors. Theme files listed under `tcv.exports` are generated; edit DESIGN.md and re-export.
