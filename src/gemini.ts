import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentConfig,
  type GenerateContentParameters,
} from "@google/genai";

import { GenerationError } from "./errors.ts";
import type { GenerateModelContent, ModelCall } from "./pipeline.ts";

interface GeminiClientLike {
  models: {
    generateContent(parameters: GenerateContentParameters): Promise<{ text?: string | undefined }>;
  };
}

type GeminiClientFactory = (apiKey: string) => GeminiClientLike;

function defaultClientFactory(apiKey: string): GeminiClientLike {
  return new GoogleGenAI({ apiKey });
}

export function createGeminiGenerator(
  apiKey: string,
  signal?: AbortSignal,
  createClient: GeminiClientFactory = defaultClientFactory,
): GenerateModelContent {
  const client = createClient(apiKey);
  return async (call: ModelCall): Promise<string> => {
    const config: GenerateContentConfig = {
      systemInstruction: call.systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: call.responseMimeType,
      responseJsonSchema: call.responseJsonSchema,
    };
    if (signal !== undefined) config.abortSignal = signal;

    try {
      const response = await client.models.generateContent({
        model: call.model,
        contents: call.prompt,
        config,
      });
      if (typeof response.text !== "string" || response.text.trim().length === 0) {
        throw new GenerationError("Gemini returned no text content.");
      }
      return response.text;
    } catch (error) {
      if (error instanceof GenerationError) throw error;
      throw new GenerationError("Gemini API request failed.", { cause: error });
    }
  };
}
