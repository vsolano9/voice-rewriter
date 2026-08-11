# ADR-001: Ship a CLI and library with a fail-closed audit

## Status

Accepted

## Date

2026-08-11

## Context

Agents need a local, scriptable way to rewrite posts and replies in a user-supplied voice. The model must be `gemini-flash-latest` with reasoning enabled. A fluent rewrite is not sufficient: the tool must not silently add claims, change meaning, sanitize earned profanity, or return malformed output as publishable content.

## Decision

Ship one TypeScript package with a small `rewriteSocial` library operation and a `voice-rewriter` CLI. Keep Gemini prompting, structured-output parsing, retry limits, deterministic anchor checks, and a separate semantic audit inside the package. Fix the model to `gemini-flash-latest` and the reasoning level to `HIGH`. Return content only after every gate passes.

## Alternatives considered

### CLI only

This is marginally smaller, but it makes the process boundary the only usable seam and encourages Gemini-specific policy to collect in argument handling. It was rejected because the library API improves reuse and focused testing without adding another runtime.

### MCP server

This gives compatible agents a native tool definition, but adds server lifecycle and client configuration. It was rejected for the first release because a CLI is already callable by local agents and keeps installation simpler.

### HTTP service

This supports remote callers but introduces deployment, authentication, tenancy, and data-retention questions that are outside the requested local agent workflow. It was rejected.

### Single model call

A single structured response is cheaper, but asks the same generation to judge its own fidelity in the same step. It was rejected because factual and meaning preservation are release gates, not advisory metadata.

## Consequences

- Every successful rewrite uses at least two Gemini calls and therefore costs more and takes longer than a single-pass tool.
- The separate audit and local invariants reduce, but cannot mathematically eliminate, semantic model error.
- The `latest` alias may change behind the same name. This volatility is accepted because the required model name is explicit; tests protect the request contract, not the provider's future model behavior.
- No private voice profile ships in the package. Callers provide voice material at runtime.
