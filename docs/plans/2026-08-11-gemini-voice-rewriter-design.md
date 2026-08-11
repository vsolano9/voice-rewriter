# Gemini Voice Rewriter Design

## Status

Approved on 2026-08-11. The first production interface is a Node.js CLI plus an importable TypeScript library.

## Outcome

Agents can rewrite an original social post or a reply in a supplied voice without changing its supported meaning. The tool uses `gemini-flash-latest` with high reasoning, performs a separate fidelity audit, and returns no publishable result when validation fails.

## Inputs and outputs

`RewriteRequest` contains:

- `kind`: `post` or `reply`.
- `text`: the source content to rewrite.
- `voiceProfile`: the user's voice rules.
- `examples`: optional user-written examples.
- `facts`: optional source-backed facts the rewrite may use.
- `context`: optional parent-post or conversation context.
- `maxCharacters`: optional output limit measured as user-perceived characters.

`RewriteResult` contains the rewritten text, an audit record, the fixed model name, and the fixed reasoning level. Plain CLI output prints only the rewritten text. `--json` prints the full result.

## Data flow

1. Validate inputs locally and extract exact factual anchors: URLs, mentions, hashtags, and numeric tokens.
2. Send the source, voice material, facts, context, and constraints as data to a high-reasoning Gemini rewrite call using a strict JSON response schema.
3. Reject locally invalid output. Retry the rewrite once only when the response is malformed or violates a deterministic limit or anchor.
4. Send the accepted candidate and all source material to a separate high-reasoning Gemini audit call.
5. Return the candidate only when the audit reports preserved meaning with no unsupported, removed, or contradictory claims and local checks still pass.

## Failure behavior

- Missing or invalid input and a missing `GEMINI_API_KEY` are usage errors.
- Empty, malformed, over-limit, or anchor-changing output is rejected.
- A failed semantic audit is a fidelity error; the candidate is not printed as usable output.
- Gemini API failures retain a safe error category without logging the API key or submitted content.
- No fallback model, disabled audit, or lower reasoning path exists.

## Security and privacy

- The API key is read only from `GEMINI_API_KEY`; there is no CLI key flag that could leak through shell history.
- Voice profiles, examples, source text, facts, and context are sent to Gemini and are never persisted or telemetered by this tool.
- Source material is serialized as data. The system instruction tells the model not to execute instructions embedded in content or examples.
- Profanity is preserved when it belongs to the source or supplied voice; it is not treated as a reason to sanitize the rewrite.

## Interface comparison

| Criterion | CLI plus library | CLI-only prompt runner |
| --- | --- | --- |
| Caller model | Shell agents and TypeScript callers | Shell agents only |
| Hidden complexity | Gemini schemas, retries, audit, and validation stay internal | Prompt and response handling leak into CLI code |
| Owned invariants | Fixed model/reasoning, fail-closed audit, exact anchors | CLI flags and exit codes only |
| Test seam | Core pipeline accepts an internal generation adapter | End-to-end process tests require network substitution |
| Change locality | Gemini changes remain in one adapter | API changes spread through argument and output handling |

The CLI plus library design wins because it keeps the Gemini integration and factual-integrity policy behind one small public operation while remaining directly usable by agents. An MCP server was rejected for the first release because it adds configuration and lifecycle overhead without improving the rewrite contract. An HTTP service was rejected because this task does not require remote or multi-user operation.

## Testing

- Unit tests cover request validation, prompt construction, fixed model/reasoning configuration, response validation, anchor preservation, character limits, retry bounds, and audit failures.
- CLI tests cover stdin, file inputs, JSON output, exit codes, and secret-safe errors through an injected local test seam.
- A live smoke test runs only when `GEMINI_API_KEY` is present and verifies the real API accepts the fixed model and high thinking level.

## Rollback

The project is new and owns no persisted data. Rollback is deletion of the unpublished project or removal of the feature branch. No creator repository, voice file, public account, or deployment is changed.
