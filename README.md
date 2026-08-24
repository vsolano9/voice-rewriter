# voice-rewriter

Rewrite an original social post or a reply in a user-supplied voice with the Gemini API. `voice-rewriter` fixes the model to `gemini-flash-latest`, uses `HIGH` reasoning, checks exact factual anchors locally, and runs a separate semantic audit before it returns text.

The tool does not research facts. Give it source-backed facts, and it will fail closed when its audit detects added, removed, or contradictory claims.

## Requirements

- Node.js 24 or newer.
- A Gemini API key in `GEMINI_API_KEY`.

Voice profiles, examples, source text, facts, and context are sent to Gemini. `voice-rewriter` adds no persistence, logging, or telemetry.

## Install

Install the CLI globally:

```bash
npm install --global voice-rewriter
```

Or run it without a permanent install:

```bash
npx voice-rewriter --version
```

For the library API, add it to your project:

```bash
npm install voice-rewriter
```

## Quick start

Create a voice profile from real user-written evidence:

```markdown
Direct and plainspoken. Keep one point per post. Use first person only when the source supports it. Profanity is allowed when natural. No generic hook, fake excitement, or call to action.
```

Read the key silently, then export it without putting the value in the command or shell history:

```bash
read -r -s GEMINI_API_KEY
export GEMINI_API_KEY
printf '\n'
```

Rewrite an original post:

```bash
voice-rewriter \
  --kind post \
  --profile voice.md \
  --facts facts.md \
  --max-chars 280 \
  "The test suite passed, and the release shipped."
```

Rewrite a reply from stdin with parent context:

```bash
printf '%s\n' 'Yes, build 12 fixed the launch crash.' | \
  voice-rewriter \
    --kind reply \
    --profile voice.md \
    --context parent-post.md
```

Add `--example <file>` more than once to supply real user-written samples. Add `--json` to receive the rewrite, audit, fixed model, and reasoning level as one JSON object.

## CLI reference

```text
voice-rewriter --kind <post|reply> --profile <file> [options] [--] ["source text"]
```

If source text is omitted, the CLI reads stdin.

| Option | Purpose |
| --- | --- |
| `--kind <post\|reply>` | Content type. Required. |
| `--profile <file>` | Voice rules grounded in user evidence. Required. |
| `--example <file>` | User-written example. Repeatable. |
| `--facts <file>` | Source-backed facts the rewrite may use. |
| `--context <file>` | Parent post or conversation context. |
| `--max-chars <count>` | Maximum output length in user-perceived characters. |
| `--json` | Print the successful result or error as JSON. |
| `--` | Treat every remaining argument as source text, including option-like text. |
| `--help` | Show command help. |
| `--version` | Show the installed version. |

Exit codes:

| Code | Meaning |
| ---: | --- |
| `0` | Rewrite and audit passed. |
| `1` | Unexpected local failure. |
| `2` | Invalid input or missing configuration. |
| `3` | Deterministic or semantic fidelity failure. No candidate is printed. |
| `4` | Gemini generation or response failure. |

## Library API

```ts
import { rewriteSocial } from "voice-rewriter";

const result = await rewriteSocial({
  kind: "reply",
  text: "Yes, build 12 fixed it.",
  voiceProfile: "Short, direct, and useful.",
  context: "Did build 12 fix the launch crash?",
  facts: "Build 12 fixed the launch crash.",
  maxCharacters: 120,
});

console.log(result.text);
```

The library reads `GEMINI_API_KEY` by default. It also accepts `{ apiKey, signal }` as the second argument for applications that own their credential and cancellation lifecycle.

## Integrity model

Every successful request has four gates:

1. Local input validation and exact-anchor extraction for URLs, mentions, hashtags, and numeric tokens.
2. A structured rewrite call using `gemini-flash-latest` and `ThinkingLevel.HIGH`.
3. Local response, anchor, and grapheme-limit validation, with at most one bounded rewrite retry.
4. A separate structured high-reasoning audit for meaning and claim fidelity.

Source content, profiles, examples, facts, and context are serialized as untrusted data. The prompts explicitly reject embedded instructions. Profanity is allowed and is not a reason to sanitize the source voice.

No model-based audit can prove truth. This design catches deterministic drift and asks a second model pass to detect semantic drift, but callers still own the accuracy of supplied facts and the decision to publish. The `gemini-flash-latest` alias can change behind the same name; the package intentionally follows that alias because it is part of this tool's contract.

## Development

```bash
npm ci
npm run lint
npm run test:live   # runs only when GEMINI_API_KEY is set
npm pack --dry-run
```

The architecture decision and full test plan are in [ADR-001](docs/decisions/001-cli-library-and-fail-closed-audit.md) and the [implementation plan](docs/plans/2026-08-11-gemini-voice-rewriter-implementation.md).

## Maintainer

`voice-rewriter` is built and maintained by [Victor Solano](https://thechosenvictor.com/open-source).

## License

MIT. See [LICENSE](LICENSE).
