# Contributing

## Set up

```bash
npm ci
npm run lint
```

Node.js 24 or newer is required.

## Change behavior

1. Add one focused test at the public behavior seam.
2. Run that test and confirm it fails for the intended reason.
3. Make the smallest implementation change that passes it.
4. Run `npm run lint` and `npm pack --dry-run`.

Do not add a model override, lower-reasoning path, audit bypass, telemetry, content persistence, private voice material, or committed API key. Keep errors free of submitted content and credential values.

## Live API check

`npm run test:live` skips when `GEMINI_API_KEY` is absent. When it is present, the test makes a real rewrite and audit request and may incur Gemini usage.

## Pull requests

Describe the protected behavior, show the red and green commands, and include the full validation result. Keep unrelated changes out of the branch.
