import { createGeminiGenerator } from "./gemini.ts";
import { runRewritePipeline, type GenerateModelContent } from "./pipeline.ts";
import type { RewriteOptions, RewriteRequest, RewriteResult } from "./types.ts";
import { requireApiKey, validateRequest } from "./validation.ts";

type GeneratorFactory = (apiKey: string, signal?: AbortSignal) => GenerateModelContent;

export async function executeRewrite(
  request: RewriteRequest,
  options: RewriteOptions = {},
  createGenerator: GeneratorFactory = createGeminiGenerator,
): Promise<RewriteResult> {
  const validated = validateRequest(request);
  const apiKey = requireApiKey(options.apiKey);
  const generate = createGenerator(apiKey, options.signal);
  return runRewritePipeline(validated, generate);
}
