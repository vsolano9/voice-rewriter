# Gemini Voice Rewriter Implementation Plan

> **For the executor:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready CLI and library that rewrites social posts and replies in a supplied voice through `gemini-flash-latest` at high reasoning and fails closed on factual or meaning drift.

**Architecture:** A small public `rewriteSocial` operation owns validation and the two-pass rewrite/audit transaction. A Gemini adapter is the only provider-specific module. The CLI translates files, stdin, and flags into the public request and renders text or JSON without exposing secrets.

**Tech Stack:** Node.js 20+, TypeScript, `@google/genai`, Node's test runner, and `tsx` for TypeScript tests.

---

## Execution constraints

- Work only in `/Volumes/Extreme Pro/Documents/Work/open-source/projects/voice-rewriter` under the active lease.
- Do not copy private creator files or commit a Gemini key.
- Keep `gemini-flash-latest` and high thinking fixed; do not add a model override or audit bypass.
- Add each behavior test first and observe the expected failure before implementation.
- Commit by explicit file paths only. No remote, package publish, or GitHub repository is required by this task.

## Slice 1: Validate the maintained request contract

**Behavior seam:** `rewriteSocial(request, options)` rejects incomplete or invalid requests before a network call.

**Create:** `src/types.ts`, `src/validation.test.ts`, `src/validation.ts`, `src/errors.ts`, `src/index.ts`.

1. Write tests for valid post/reply requests, empty source/profile, invalid kind, invalid character limit, and missing API key.
2. Run `npm test -- src/validation.test.ts`; expect failures because implementation modules do not exist.
3. Add the minimum types, error classes, and validation needed to pass.
4. Run the focused test, then `npm test`.

## Slice 2: Rewrite with fixed Gemini reasoning and deterministic gates

**Behavior seam:** a valid request produces a candidate only from `gemini-flash-latest` with `ThinkingLevel.HIGH`, a JSON schema, and local anchor/length validation.

**Create:** `src/prompt.ts`, `src/anchors.ts`, `src/pipeline.test.ts`, `src/pipeline.ts`, `src/gemini.ts`.

1. Write one tracer test with an injected generator and assert the exact model, thinking level, schema mode, data-only prompt shape, and returned candidate.
2. Run `npm test -- src/pipeline.test.ts`; expect a missing-module or behavior failure.
3. Implement the provider boundary and rewrite stage.
4. Add failing tests one at a time for URLs, mentions, hashtags, numeric tokens, character limits, malformed structured output, and the single retry bound; implement only enough for each to pass.
5. Run the focused tests, then `npm test` and `npm run typecheck`.

## Slice 3: Audit meaning and facts before release

**Behavior seam:** `rewriteSocial` returns only after a second high-reasoning audit reports preserved meaning and no unsupported, removed, or contradictory claims.

**Modify:** `src/pipeline.test.ts`, `src/pipeline.ts`, `src/prompt.ts`, `src/types.ts`, `src/index.ts`.

1. Write a failing pass-case test that requires exactly two calls and exposes the audit in `RewriteResult`.
2. Implement the audit schema and pass path.
3. Add failing tests for unsupported claims, removed claims, contradictions, meaning drift, and malformed audit output; implement a fail-closed `FidelityError` without a publishable candidate.
4. Run focused tests, full tests, and typecheck.

## Slice 4: Ship the agent-facing CLI

**Behavior seam:** `voice-rewriter` reads a post or reply from an argument or stdin, loads voice/context files, and emits clean text or structured JSON with documented exit codes.

**Create:** `src/cli.test.ts`, `src/cli.ts`, `src/cli-core.ts`, `package.json`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`.

1. Write CLI-core tests for flags, repeated examples, stdin, JSON rendering, usage errors, fidelity errors, and secret-safe messages.
2. Observe the focused red result.
3. Implement argument parsing and rendering, then add an executable CLI entry point.
4. Add a subprocess smoke test against compiled output using the supported test injection seam without a real network request.
5. Run `npm test`, `npm run typecheck`, `npm run build`, and the compiled `--help` command.

## Slice 5: Documentation, live smoke, and release audit

**Create:** `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.env.example`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `test/live.test.ts`, `LICENSE`.

1. Document installation, privacy, exact inputs, post and reply examples, JSON output, exit codes, model/reasoning guarantees, failure modes, and the unavoidable limits of model-based fidelity checking.
2. Add a live test gated by `GEMINI_API_KEY`. If the key exists, run it against the real API; otherwise record the explicit skip.
3. Run `npm ci`, `npm run lint`, `npm run build`, `npm pack --dry-run`, the compiled CLI help, and the conditional live test.
4. Review every changed file, `git diff --check`, the complete diff, package contents, secret patterns, and `git status --short`.
5. Update the project tracker and root journal only where this new project changes their owned state. Release the lease after the local commit and phase evidence are complete.

## Stop condition

Stop when all acceptance tests, typecheck, build, package dry run, CLI smoke, documentation review, diff review, and phase validation pass; the intended files are committed locally on the feature branch; no secret or private voice material is present; and the lease is released. Publishing the npm package, creating a remote, or deploying a service is outside this task.
