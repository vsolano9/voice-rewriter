import assert from "node:assert/strict";
import { test } from "node:test";

import { rewriteSocial } from "../src/index.ts";

test(
  "live Gemini API accepts the fixed model, high reasoning, rewrite schema, and audit schema",
  { skip: !process.env.GEMINI_API_KEY },
  async () => {
    const result = await rewriteSocial({
      kind: "post",
      text: "Build 12 shipped after 14 tests passed.",
      voiceProfile: "Direct, plainspoken, first person, and concise. No generic hook.",
      facts: "Build 12 shipped. The local test suite reported 14 passing tests.",
      maxCharacters: 100,
    });

    assert.ok(result.text.length > 0);
    assert.equal(result.model, "gemini-flash-latest");
    assert.equal(result.thinkingLevel, "HIGH");
    assert.equal(result.audit.verdict, "pass");
    assert.match(result.text, /12/);
    assert.match(result.text, /14/);
  },
);
