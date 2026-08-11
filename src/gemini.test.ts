import assert from "node:assert/strict";
import { test } from "node:test";

import { createGeminiGenerator } from "./gemini.ts";
import type { ModelCall } from "./pipeline.ts";

test("Gemini adapter maps the internal call to the official SDK", async () => {
  let receivedKey = "";
  let received: unknown;
  const abortController = new AbortController();
  const generate = createGeminiGenerator("secret-key", abortController.signal, (apiKey) => {
    receivedKey = apiKey;
    return {
      models: {
        generateContent: async (parameters) => {
          received = parameters;
          return { text: '{"rewrite":"Done."}' };
        },
      },
    };
  });
  const call: ModelCall = {
    purpose: "rewrite",
    model: "gemini-flash-latest",
    thinkingLevel: "HIGH",
    systemInstruction: "System",
    prompt: '{"source":"Data"}',
    responseMimeType: "application/json",
    responseJsonSchema: {
      type: "object",
      properties: { rewrite: { type: "string" } },
      required: ["rewrite"],
      additionalProperties: false,
    },
  };

  const text = await generate(call);

  assert.equal(receivedKey, "secret-key");
  assert.equal(text, '{"rewrite":"Done."}');
  assert.deepEqual(received, {
    model: "gemini-flash-latest",
    contents: call.prompt,
    config: {
      abortSignal: abortController.signal,
      systemInstruction: "System",
      thinkingConfig: { thinkingLevel: "HIGH" },
      responseMimeType: "application/json",
      responseJsonSchema: call.responseJsonSchema,
    },
  });
});
