# Changelog

## Unreleased

### Added

- `DESIGN.md` terminal visual system and the generated `src/colors.generated.ts` ANSI roles.
- Colored usage line, `✓ audit pass` stamp on stderr, and colored errors; `--no-color` flag and `NO_COLOR` disable color and fall back to ASCII `+`/`x` glyphs. The rewrite on stdout is never colored.

## 0.1.1 - 2026-08-24

### Changed

- `homepage` now points at https://thechosenvictor.com/open-source, which
  documents this package, rather than back at this README. No behaviour change.
- Added a Maintainer section to the README.

## 0.1.0 - 2026-08-23

### Added

- `rewriteSocial` library API for original posts and replies.
- `voice-rewriter` CLI with file-backed voice evidence, facts, context, stdin, character limits, and JSON output.
- Fixed `gemini-flash-latest` integration with `HIGH` reasoning.
- Bounded rewrite retry, exact-anchor checks, and a separate fail-closed semantic audit.
- Stable exit codes and secret-safe errors.
- Initial public npm and GitHub release, validated against `@google/genai` 2.18.0.
