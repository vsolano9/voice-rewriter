import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigurationError, InputError, rewriteSocial } from "./index.ts";

const validRequest = {
  kind: "post" as const,
  text: "Shipped build 12 today. It fixes the crash at launch.",
  voiceProfile: "Direct, concise, first person. Profanity is allowed when natural.",
};

test("invalid requests fail before API-key resolution", async () => {
  await assert.rejects(
    rewriteSocial({ ...validRequest, text: "   " }, { apiKey: undefined }),
    (error: unknown) =>
      error instanceof InputError && error.message === "Source text must not be empty.",
  );
});

test("a missing API key is a configuration error", async () => {
  await assert.rejects(
    rewriteSocial(validRequest, { apiKey: undefined }),
    (error: unknown) =>
      error instanceof ConfigurationError &&
      error.message === "Set GEMINI_API_KEY before running voice-rewriter.",
  );
});

test("kind must be post or reply", async () => {
  await assert.rejects(
    rewriteSocial({ ...validRequest, kind: "thread" as "post" }, { apiKey: "test" }),
    (error: unknown) => error instanceof InputError && error.message.includes("post or reply"),
  );
});

test("voice profile must not be empty", async () => {
  await assert.rejects(
    rewriteSocial({ ...validRequest, voiceProfile: "\n" }, { apiKey: "test" }),
    (error: unknown) => error instanceof InputError && error.message.includes("Voice profile"),
  );
});

test("maximum characters must be a positive integer", async () => {
  await assert.rejects(
    rewriteSocial({ ...validRequest, maxCharacters: 0 }, { apiKey: "test" }),
    (error: unknown) => error instanceof InputError && error.message.includes("positive integer"),
  );
});
