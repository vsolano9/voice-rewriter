import { ConfigurationError, InputError } from "./errors.ts";
import type { RewriteRequest } from "./types.ts";

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new InputError(`${label} must not be empty.`);
  }
  return normalized;
}

export function validateRequest(request: RewriteRequest): RewriteRequest {
  if (request.kind !== "post" && request.kind !== "reply") {
    throw new InputError("Content kind must be post or reply.");
  }
  const text = requireText(request.text, "Source text");
  const voiceProfile = requireText(request.voiceProfile, "Voice profile");

  if (
    request.maxCharacters !== undefined &&
    (!Number.isInteger(request.maxCharacters) || request.maxCharacters <= 0)
  ) {
    throw new InputError("Maximum characters must be a positive integer.");
  }

  const normalized: RewriteRequest = {
    kind: request.kind,
    text,
    voiceProfile,
  };
  if (request.examples !== undefined) {
    normalized.examples = request.examples.map((example) => example.trim()).filter(Boolean);
  }
  if (request.facts !== undefined) normalized.facts = request.facts.trim();
  if (request.context !== undefined) normalized.context = request.context.trim();
  if (request.maxCharacters !== undefined) normalized.maxCharacters = request.maxCharacters;
  return normalized;
}

export function requireApiKey(explicitKey: string | undefined): string {
  const apiKey = explicitKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigurationError("Set GEMINI_API_KEY before running voice-rewriter.");
  }
  return apiKey;
}
