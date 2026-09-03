import assert from "node:assert/strict";
import { test } from "node:test";

import { runCli } from "./cli-core.ts";
import { FidelityError, GenerationError } from "./errors.ts";
import type { RewriteRequest, RewriteResult } from "./types.ts";

const passingResult: RewriteResult = {
  text: "Shipped build 12. It works.",
  audit: {
    verdict: "pass",
    meaningPreserved: true,
    unsupportedClaims: [],
    removedClaims: [],
    contradictions: [],
  },
  model: "gemini-flash-latest",
  thinkingLevel: "HIGH",
};

test("CLI maps post inputs and voice files to the library request", async () => {
  let received: RewriteRequest | undefined;
  const files: Record<string, string> = {
    "voice.md": "Direct and concise.",
    "example.md": "I shipped it. It works.",
    "facts.md": "Build 12 passed release tests.",
  };

  const output = await runCli(
    [
      "--no-color",
      "--kind",
      "post",
      "--profile",
      "voice.md",
      "--example",
      "example.md",
      "--facts",
      "facts.md",
      "--max-chars",
      "280",
      "Shipped build 12 today.",
    ],
    {
      readFile: async (path) => files[path] ?? "",
      readStdin: async () => "",
      rewrite: async (request) => {
        received = request;
        return passingResult;
      },
      version: "0.1.0",
    },
  );

  assert.deepEqual(received, {
    kind: "post",
    text: "Shipped build 12 today.",
    voiceProfile: "Direct and concise.",
    examples: ["I shipped it. It works."],
    facts: "Build 12 passed release tests.",
    maxCharacters: 280,
  });
  assert.deepEqual(output, {
    stdout: "Shipped build 12. It works.\n",
    stderr: "+ audit pass\n",
    exitCode: 0,
  });
});

test("CLI reads a reply from stdin, includes context, and renders JSON", async () => {
  let received: RewriteRequest | undefined;
  const output = await runCli(
    ["--kind", "reply", "--profile", "voice.md", "--context", "parent.md", "--json"],
    {
      readFile: async (path) =>
        path === "voice.md" ? "Blunt but useful." : "Did build 12 fix the launch crash?",
      readStdin: async () => "Yes, the crash is fixed.",
      rewrite: async (request) => {
        received = request;
        return passingResult;
      },
      version: "0.1.0",
    },
  );

  assert.deepEqual(received, {
    kind: "reply",
    text: "Yes, the crash is fixed.",
    voiceProfile: "Blunt but useful.",
    context: "Did build 12 fix the launch crash?",
  });
  assert.equal(output.stderr, "");
  assert.equal(output.exitCode, 0);
  assert.deepEqual(JSON.parse(output.stdout), passingResult);
});

test("CLI help and version do not require content or an API call", async () => {
  let rewriteCalls = 0;
  const dependencies = {
    readFile: async () => "",
    readStdin: async () => "",
    rewrite: async () => {
      rewriteCalls += 1;
      return passingResult;
    },
    version: "0.1.0",
  };

  const help = await runCli(["--help"], dependencies);
  const version = await runCli(["--version"], dependencies);

  assert.equal(help.exitCode, 0);
  assert.match(help.stdout, /voice-rewriter --kind <post\|reply> --profile <file>/);
  assert.match(help.stdout, /--context <file>/);
  assert.match(help.stdout, /GEMINI_API_KEY/);
  assert.match(help.stdout, /--no-color/);
  assert.deepEqual(version, { stdout: "0.1.0\n", stderr: "", exitCode: 0 });
  assert.equal(rewriteCalls, 0);
});

test("CLI maps safe error categories to stable exit codes", async () => {
  const base = {
    readFile: async () => "Direct.",
    readStdin: async () => "Source.",
    version: "0.1.0",
  };

  const usage = await runCli(["--no-color"], { ...base, rewrite: async () => passingResult });
  const fidelity = await runCli(
    ["--kind", "post", "--profile", "voice.md", "--json", "Source."],
    {
      ...base,
      rewrite: async () => {
        throw new FidelityError("Rewrite failed the semantic fidelity audit.", [
          "Unsupported claim: invented launch date",
        ]);
      },
    },
  );
  const generation = await runCli(
    ["--no-color", "--kind", "post", "--profile", "voice.md", "Source."],
    {
      ...base,
      rewrite: async () => {
        throw new GenerationError("Gemini API request failed.", {
          cause: new Error("secret-key"),
        });
      },
    },
  );

  assert.deepEqual(usage, {
    stdout: "",
    stderr: "x Error: --kind is required.\n",
    exitCode: 2,
  });
  assert.equal(fidelity.stdout, "");
  assert.equal(fidelity.exitCode, 3);
  assert.deepEqual(JSON.parse(fidelity.stderr), {
    error: {
      code: "FIDELITY_ERROR",
      message: "Rewrite failed the semantic fidelity audit.",
      issues: ["Unsupported claim: invented launch date"],
    },
  });
  assert.deepEqual(generation, {
    stdout: "",
    stderr: "x Error: Gemini API request failed.\n",
    exitCode: 4,
  });
  assert.doesNotMatch(generation.stderr, /secret-key/);
});

test("CLI accepts source text that begins with an option-like token after --", async () => {
  let source = "";
  const output = await runCli(
    ["--kind", "post", "--profile", "voice.md", "--", "-- shipped without the flag mess"],
    {
      readFile: async () => "Direct.",
      readStdin: async () => "",
      rewrite: async (request) => {
        source = request.text;
        return passingResult;
      },
      version: "0.1.0",
    },
  );

  assert.equal(output.exitCode, 0);
  assert.equal(source, "-- shipped without the flag mess");
});

test("CLI does not interpret help as an option after --", async () => {
  let source = "";
  const output = await runCli(
    ["--kind", "post", "--profile", "voice.md", "--", "--help"],
    {
      readFile: async () => "Direct.",
      readStdin: async () => "",
      rewrite: async (request) => {
        source = request.text;
        return passingResult;
      },
      version: "0.1.0",
    },
  );

  assert.equal(output.exitCode, 0);
  assert.equal(source, "--help");
});

test("CLI Voice Stamp and errors honor color, --no-color, and NO_COLOR", async () => {
  const base = {
    readFile: async () => "Direct.",
    readStdin: async () => "",
    rewrite: async () => passingResult,
    version: "0.1.0",
  };
  const prev = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  try {
    const coloredError = await runCli([], base);
    assert.match(coloredError.stderr, /\u001b\[31m/);
    assert.match(coloredError.stderr, /✗ Error: --kind is required/);
    assert.doesNotMatch(coloredError.stderr, /\u001b\[31m.*\u001b\[31m/);

    const coloredOk = await runCli(
      ["--kind", "post", "--profile", "voice.md", "Source."],
      base,
    );
    assert.equal(coloredOk.stdout, "Shipped build 12. It works.\n");
    assert.match(coloredOk.stderr, /\u001b\[32m/);
    assert.match(coloredOk.stderr, /✓ audit pass/);
    assert.doesNotMatch(coloredOk.stdout, /\u001b\[/);

    const flagged = await runCli(["--no-color"], base);
    assert.equal(flagged.stderr.includes("\u001b["), false);
    assert.equal(flagged.stderr, "x Error: --kind is required.\n");

    process.env.NO_COLOR = "1";
    const envOff = await runCli([], base);
    assert.equal(envOff.stderr.includes("\u001b["), false);
    assert.equal(envOff.stderr, "x Error: --kind is required.\n");
  } finally {
    if (prev === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = prev;
  }
});
