import assert from "node:assert/strict";
import { test } from "node:test";

import { executeRewrite } from "./service.ts";

test("service validates input, resolves the key, and runs the complete pipeline", async () => {
  let receivedKey = "";
  let rewritePrompt: Record<string, unknown> = {};
  const result = await executeRewrite(
    {
      kind: "post",
      text: "  Shipped build 12.  ",
      voiceProfile: "  Direct.  ",
    },
    { apiKey: "test-key" },
    (apiKey) => {
      receivedKey = apiKey;
      return async (call) => {
        if (call.purpose === "rewrite") {
          rewritePrompt = JSON.parse(call.prompt);
          return JSON.stringify({ rewrite: "Shipped build 12." });
        }
        return JSON.stringify({
          verdict: "pass",
          meaningPreserved: true,
          unsupportedClaims: [],
          removedClaims: [],
          contradictions: [],
        });
      };
    },
  );

  assert.equal(receivedKey, "test-key");
  assert.equal(result.text, "Shipped build 12.");
  assert.deepEqual(rewritePrompt.content, {
    kind: "post",
    text: "Shipped build 12.",
    voiceProfile: "Direct.",
  });
});
