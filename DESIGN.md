---
version: alpha
name: voice-rewriter
description: Rewrite a social post or reply in a supplied voice, then fail closed, so a builder feels certain the text is safe to publish.
tcv:
  spec: 1
  platform: tui
  profile: tui
  audience: "Indie builders and local agents · terminal, files, and pipes · deciding whether a rewrite is safe to publish"
  status: live
  colorScheme: dark
  fonts:
    - { family: "Menlo", source: system, license: "Apple system font" }
  exports:
    - { target: ansi-ts, path: src/colors.generated.ts }
  checks: { contrast: AA, spacingScaleOnly: true, typeRolesOnly: true, maxFontFamilies: 2 }
  scenarios:
    - { id: screen-80x24, surface: src/cli-core.ts, viewport: "80x24", modes: [dark] }
    - { id: screen-120x40, surface: src/cli-core.ts, viewport: "120x40", modes: [dark] }
    - { id: error-state, surface: src/cli-core.ts, viewport: "80x24", modes: [dark] }
  tui:
    roles: { bg: "{colors.canvas}", fg: "{colors.on-canvas}", muted: "{colors.on-surface-secondary}", accent: "{colors.primary}", error: "{colors.danger}", warning: "{colors.warning}", success: "{colors.success}" }
    ansi: { error: red, warning: yellow, info: cyan, success: green, muted: dim }
colors:
  canvas: "#0A1214"
  on-canvas: "#E8F4F6"
  surface: "#121C1F"
  on-surface: "#E8F4F6"
  on-surface-secondary: "#8AA3A8"
  line: "#6B838A"
  primary: "#4FD6C8"
  on-primary: "#04201C"
  primary-surface: "#0E2C2A"
  success: "#5FD38A"
  warning: "#E8B84A"
  danger: "#FF8A80"
  on-danger: "#3B0A08"
typography:
  title: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 700, lineHeight: 16px, letterSpacing: 0px }
  heading: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 700, lineHeight: 16px, letterSpacing: 0px }
  body: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 400, lineHeight: 16px, letterSpacing: 0px }
  body-emphasis: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 700, lineHeight: 16px, letterSpacing: 0px }
  muted: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 400, lineHeight: 16px, letterSpacing: 0px }
  code: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 400, lineHeight: 16px, letterSpacing: 0px }
  status: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 700, lineHeight: 16px, letterSpacing: 0px }
  prompt: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 700, lineHeight: 16px, letterSpacing: 0px }
  timestamp: { fontFamily: "Menlo", fontSize: 13px, fontWeight: 400, lineHeight: 16px, letterSpacing: 0px }
rounded: { none: 0px, sm: 0px, md: 0px, lg: 0px, xl: 0px, full: 0px }
spacing: { "1": 4px, "2": 8px, "3": 12px, "4": 16px, "5": 20px, "6": 24px, "8": 32px, "10": 40px, "12": 48px, "16": 64px }
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", typography: "{typography.body-emphasis}" }
  button-secondary: { backgroundColor: "{colors.primary-surface}", textColor: "{colors.primary}", typography: "{typography.body}" }
  field: { backgroundColor: "{colors.surface}", textColor: "{colors.on-surface}", typography: "{typography.body}" }
  card: { backgroundColor: "{colors.surface}", textColor: "{colors.on-surface}", borderColor: "{colors.line}" }
  list-row: { backgroundColor: "{colors.canvas}", textColor: "{colors.on-canvas}", typography: "{typography.body}" }
  sheet: { backgroundColor: "{colors.surface}", textColor: "{colors.on-surface}", borderColor: "{colors.line}" }
  chip: { backgroundColor: "{colors.primary-surface}", textColor: "{colors.primary}", typography: "{typography.status}" }
  header: { backgroundColor: "{colors.canvas}", textColor: "{colors.on-canvas}", typography: "{typography.title}" }
elevation:
  level-0: { shadow: none }
  level-1: { shadow: none, border: single }
  level-2: { shadow: none, border: single }
  level-3: { shadow: none, border: double }
motion:
  duration-fast: 120ms
  duration-base: 200ms
  duration-slow: 340ms
  duration-emphasis: 480ms
  ease-standard: "cubic-bezier(0.2,0,0,1)"
  ease-entrance: "cubic-bezier(0,0,0.2,1)"
  ease-exit: "cubic-bezier(0.4,0,1,1)"
  spring-snappy: "response 0.22, damping 0.78"
  spring-smooth: "response 0.34, damping 0.86"
  reduced-motion: crossfade-120
---

## Overview

Job: rewrite this post in my voice and do not invent facts. Audience: indie builders and local agents who already know the voice. Context: a terminal, files or stdin, a 10–60 second Gemini wait, then a copy or a pipe. Feeling: certain, not clever. Constraints: Node 24, `gemini-flash-latest` + HIGH, fail-closed audit, no persistence, stdout is the rewrite. Monetization: none (MIT).

Visual thesis: the rewrite is a naked payload on stdout — the same bytes you paste. Authorship lives on stderr as the Voice Stamp: one glyph-led audit line, truecolor when the terminal allows, 16-color ANSI otherwise, ASCII under `NO_COLOR`. No boxes, no before/after, no spinner. Fail-closed errors use the same stamp grammar with a word. Help is 80-column plain text with one cyan usage line.

Signature decision: Voice Stamp glyph cinema — `✓ audit pass` in `success`, `✗ Error:` in `danger`, truecolor/ANSI with 16-color + `NO_COLOR` ASCII (`+` / `x` / `!` / `.`). The payload is never painted.

Rejected category layout: the boxed AI writing-assistant (source card, rewrite card, streaming tokens, spinner). It contaminates the pipe and pretends a fail-closed audit is a live show.

Priority ladder:

1. Preserve supplied facts, prices, units, legal text, privacy requirements, and task constraints.
2. Preserve the host stack, routes, native components, and this DESIGN.md's tokens.
3. Make the reader's job and the one primary action immediately clear.
4. Establish the product's authorship through its type, accent, spacing rhythm, and one maximal signature motion/effect/asset.
5. Choose a composition specific to this screen; reject both generic defaults and a fixed template.
6. Refine motion, depth, and detail without weakening hierarchy.
7. voice-rewriter: the stdout payload outranks the stamp; if they collide, drop chrome, never color the rewrite.

## Colors

Accent `primary` is OKLCH L=0.78 C=0.12 h=175 (`#4FD6C8`), a mid-L teal that survives black and white terminal backgrounds. Truecolor roles map onto 16-color-safe ANSI in `tcv.tui.ansi` (`error` red, `warning` yellow, `info` cyan, `success` green, `muted` dim). `NO_COLOR` and `--no-color` disable every escape on stdout and stderr. `primary` is the usage-line ink and the only accent; `danger` / `warning` / `success` mark the Voice Stamp only. `line` is reserved for a future composer border and already passes 3:1 on `canvas` and `surface`. Neutrals sit on the same cyan hue at very low chroma so the greys belong to the product.

## Typography

The terminal owns the font (Menlo or the user's mono). Roles map to weight and ANSI role only: `title`/`heading`/`prompt`/`status` bold, `body` regular, `muted`/`timestamp` dim. Never more than three roles on one screen: usage (`title` + `info`), payload (`body`), stamp (`status` + semantic color). `--json` is `code` with no color.

## Layout

Cell grid. 80×24 first: usage line, one blank line, options, one blank line, GEMINI note. Two cells between option groups. Extra columns at 120×40 lengthen the usage line, they do not add panes. Wrap at width; never horizontal scroll. Stdout is the rewrite only. Stderr is the Voice Stamp or the error stamp. JSON is a single object on stdout or stderr, never both.

## Elevation & Depth

Tier 0. No shadows, no boxes around the payload. `level-1` exists for schema completeness (single border) and is unused on the CLI. At most zero bordered regions on a successful run.

## Shapes

No box drawing on the default path. If a future interactive mode appears, light set only (`│ ─ ┌ ┐ └ ┘`), never mixed with heavy, ASCII `+|/-` when the terminal is not UTF-8. Radii are all 0.

## Components

| Component | Role | Notes |
| --- | --- | --- |
| button-primary | Voice Stamp success | `✓ audit pass` in `success`; ASCII `+` when color is off |
| button-secondary | `--help` / `--version` | muted; no stamp |
| field | `--profile` / `--facts` / `--context` | paths as `body`, never colored |
| card | `--json` object | uncolored bytes |
| list-row | fidelity issue | `!` + the issue word; `warning` |
| sheet | help | 80-column text; usage in `info` |
| chip | `--kind post\|reply` | words, not a second accent |
| header | usage line | `title` + `info` |

## Motion

One-shot CLI: no redraw loop, no spinner (`tui-08` on pipes). The designed effect is the Voice Stamp appearing with the result — glyph cinema, not animation. Duration tokens exist for schema completeness; the runtime writes once. Reduced-motion equivalent: ASCII stamp (`+ audit pass` / `x Error:`) with no Unicode and no ANSI. Perf budget: one stdout write + one stderr write, zero frames, no TTY detect beyond `NO_COLOR` / `--no-color`.

## States

- default — payload on stdout, Voice Stamp on stderr. designed
- hover/press — N/A — no widgets
- focus-visible — N/A — no widgets
- disabled — N/A — no widgets
- loading — N/A — silent wait; no spinner on a pipe
- empty — `x Error: --kind is required.` (or the matching input word). designed
- sparse — a one-line rewrite still gets a stamp. designed
- error — `✗ Error:` + message in `danger`, exit 2/3/4. designed
- validation — `InputError` exit 2, same stamp grammar. designed
- permission — `ConfigurationError` (`Set GEMINI_API_KEY…`) exit 2. designed
- offline/retry — `GenerationError` exit 4; no retry chrome. designed
- success — `✓ audit pass` in `success`. designed
- selected — N/A — no lists
- destructive-confirm — N/A — fail-closed prints an error, never a confirm modal
- interrupted — process signal; no custom modal. N/A — host handles SIGINT

## Do's and Don'ts

- Do: print the rewrite uncolored on stdout. Don't: wrap `result.text` in ANSI.
- Do: put the Voice Stamp on stderr (`✓ audit pass`). Don't: mix the stamp into the payload.
- Do: paint `✗ Error:` with the error role. Don't: paint `--json` error objects.
- Do: honor `NO_COLOR` and `--no-color` on stdout and stderr. Don't: leave escapes on stderr when either is set.
- Do: use ASCII `+ x ! .` when color is off. Don't: emit `✓ ✗` under `NO_COLOR`.
- Do: keep help readable at 80 columns. Don't: draw a boxed help card.
- Do: fail closed with exit 3 and the word `Error`. Don't: print a partial rewrite when the audit fails.
- Do: reserve `info` cyan for the usage line. Don't: color profile text, facts, or context files.
- Do: keep `--json` byte-stable without escapes. Don't: pretty-print JSON with colored keys.
- Do: list `--no-color` in help and accept it as a flag. Don't: throw `Unknown option: --no-color`.

## Anti-patterns

Inherits tcv-tui anti-patterns.

- voice-rewriter-01 Payload paint: coloring the rewrite body so a pipe copies escapes.
- voice-rewriter-02 Audit theater: a spinner, progress bar, or token stream while Gemini runs.
- voice-rewriter-03 Before/after chrome: printing source and rewrite as a boxed diff.

## Verification

| Scenario | Command | Pass criteria |
| --- | --- | --- |
| screen-80x24 | `COLUMNS=80 node dist/cli.js --help` | usage line visible; no wrap mid-token; `--no-color` listed |
| screen-120x40 | `COLUMNS=120 node dist/cli.js --help` | extra columns lengthen the line, no new panes |
| error-state | `node dist/cli.js` | stderr carries `Error` and `--kind is required`; glyph or ASCII `x`; exit 2 |

`NO_COLOR` pass: `NO_COLOR=1 node dist/cli.js` and `node dist/cli.js --no-color` contain zero `\x1b[` bytes; meaning still carries the word `Error`.

Last verified: 2026-09-03 · receipts `_receipts/design-system/voice-rewriter/2026-09-03/` (Work root; `screen-80x24-dark`, `screen-80x24-nocolor`, `screen-120x40-dark`, `error-state-dark`, `error-state-nocolor`, `error-state-flag-nocolor`) · `designmd audit` count: 0 before wiring, 0 after.
