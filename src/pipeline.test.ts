import assert from "node:assert/strict";
import { test } from "node:test";

import { FidelityError, GenerationError } from "./errors.ts";
import { generateCandidate, runRewritePipeline, type ModelCall } from "./pipeline.ts";

test("rewrite calls the fixed Gemini model with high reasoning and structured data", async () => {
  const calls: ModelCall[] = [];
  const request = {
    kind: "post" as const,
    text: "Shipped build 12 today.",
    voiceProfile: "Direct and concise.",
    examples: ["I shipped it. It works."],
    facts: "Build 12 passed all release tests.",
  };

  const text = await generateCandidate(request, async (call) => {
    calls.push(call);
    return JSON.stringify({ rewrite: "Shipped build 12 today. It works." });
  });

  assert.equal(text, "Shipped build 12 today. It works.");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.purpose, "rewrite");
  assert.equal(calls[0]?.model, "gemini-flash-latest");
  assert.equal(calls[0]?.thinkingLevel, "HIGH");
  assert.equal(calls[0]?.responseMimeType, "application/json");
  assert.deepEqual(calls[0]?.responseJsonSchema.required, ["rewrite"]);
  assert.match(calls[0]?.systemInstruction ?? "", /untrusted data/i);
  assert.deepEqual(JSON.parse(calls[0]?.prompt ?? ""), {
    task: "rewrite_social_content",
    content: request,
    deterministicConstraints: {
      preserveExactAnchors: ["12"],
      maxCharacters: null,
    },
    priorViolations: [],
  });
});

test("rewrite retries once when a candidate changes an exact anchor", async () => {
  const calls: ModelCall[] = [];
  const responses = [
    JSON.stringify({ rewrite: "Shipped build 13 today." }),
    JSON.stringify({ rewrite: "Shipped build 12 today." }),
  ];

  const text = await generateCandidate(
    {
      kind: "post",
      text: "Shipped build 12 today.",
      voiceProfile: "Direct.",
    },
    async (call) => {
      calls.push(call);
      return responses[calls.length - 1] ?? "";
    },
  );

  assert.equal(text, "Shipped build 12 today.");
  assert.equal(calls.length, 2);
  const retryPrompt = JSON.parse(calls[1]?.prompt ?? "{}");
  assert.deepEqual(retryPrompt.priorViolations, [
    'Missing required anchor "12".',
    'Introduced unsupported anchor "13".',
  ]);
});

test("rewrite enforces the character limit with user-perceived characters", async () => {
  const calls: ModelCall[] = [];
  const responses = [
    JSON.stringify({ rewrite: "👍🏽👍🏽" }),
    JSON.stringify({ rewrite: "👍🏽" }),
  ];

  const text = await generateCandidate(
    {
      kind: "reply",
      text: "Nice.",
      voiceProfile: "Very short.",
      maxCharacters: 1,
    },
    async (call) => {
      calls.push(call);
      return responses[calls.length - 1] ?? "";
    },
  );

  assert.equal(text, "👍🏽");
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(calls[1]?.prompt ?? "{}").priorViolations, [
    "Rewrite is 2 characters; maximum is 1.",
  ]);
});

test("rewrite retries once after malformed structured output", async () => {
  let calls = 0;
  const text = await generateCandidate(
    {
      kind: "post",
      text: "Launch is live.",
      voiceProfile: "Plainspoken.",
    },
    async () => {
      calls += 1;
      return calls === 1 ? "not json" : JSON.stringify({ rewrite: "Launch is live." });
    },
  );

  assert.equal(text, "Launch is live.");
  assert.equal(calls, 2);
});

test("pipeline returns a rewrite only after a separate high-reasoning audit passes", async () => {
  const calls: ModelCall[] = [];
  const request = {
    kind: "reply" as const,
    text: "Build 12 fixed it.",
    voiceProfile: "Short and blunt.",
    context: "Someone asked whether the launch crash is fixed.",
  };

  const result = await runRewritePipeline(request, async (call) => {
    calls.push(call);
    if (call.purpose === "rewrite") {
      return JSON.stringify({ rewrite: "Yeah. Build 12 fixed it." });
    }
    return JSON.stringify({
      verdict: "pass",
      meaningPreserved: true,
      unsupportedClaims: [],
      removedClaims: [],
      contradictions: [],
    });
  });

  assert.equal(result.text, "Yeah. Build 12 fixed it.");
  assert.deepEqual(result.audit, {
    verdict: "pass",
    meaningPreserved: true,
    unsupportedClaims: [],
    removedClaims: [],
    contradictions: [],
  });
  assert.equal(result.model, "gemini-flash-latest");
  assert.equal(result.thinkingLevel, "HIGH");
  assert.deepEqual(calls.map((call) => call.purpose), ["rewrite", "audit"]);
  assert.equal(calls[1]?.thinkingLevel, "HIGH");
  assert.match(calls[1]?.systemInstruction ?? "", /independent fidelity auditor/i);
  const auditPrompt = JSON.parse(calls[1]?.prompt ?? "{}");
  assert.equal(auditPrompt.candidate, result.text);
  assert.deepEqual(auditPrompt.source, {
    kind: "reply",
    text: "Build 12 fixed it.",
    context: "Someone asked whether the launch crash is fixed.",
  });
  assert.equal("voiceProfile" in auditPrompt.source, false);
  assert.equal("examples" in auditPrompt.source, false);
});

test("pipeline fails closed when the audit finds meaning or factual drift", async () => {
  const request = {
    kind: "post" as const,
    text: "The test passed.",
    voiceProfile: "Direct.",
  };

  await assert.rejects(
    runRewritePipeline(request, async (call) => {
      if (call.purpose === "rewrite") {
        return JSON.stringify({ rewrite: "The test passed. Everyone loved it." });
      }
      return JSON.stringify({
        verdict: "fail",
        meaningPreserved: false,
        unsupportedClaims: ["Everyone loved it."],
        removedClaims: ["The test passed."],
        contradictions: ["The source did not report audience feedback."],
      });
    }),
    (error: unknown) =>
      error instanceof FidelityError &&
      error.message === "Rewrite failed the semantic fidelity audit." &&
      !Object.hasOwn(error, "candidate") &&
      assert.deepEqual(error.issues, [
        "The candidate changed the source meaning.",
        "Unsupported claim: Everyone loved it.",
        "Removed claim: The test passed.",
        "Contradiction: The source did not report audience feedback.",
      ]) === undefined,
  );
});

test("pipeline rejects a malformed audit response", async () => {
  await assert.rejects(
    runRewritePipeline(
      {
        kind: "post",
        text: "It shipped.",
        voiceProfile: "Direct.",
      },
      async (call) =>
        call.purpose === "rewrite"
          ? JSON.stringify({ rewrite: "It shipped." })
          : JSON.stringify({ verdict: "pass" }),
    ),
    (error: unknown) =>
      error instanceof GenerationError &&
      error.message === "Gemini returned an invalid audit response.",
  );
});
