export type ContentKind = "post" | "reply";

export interface RewriteRequest {
  kind: ContentKind;
  text: string;
  voiceProfile: string;
  examples?: readonly string[];
  facts?: string;
  context?: string;
  maxCharacters?: number;
}

export interface RewriteAudit {
  verdict: "pass";
  meaningPreserved: true;
  unsupportedClaims: readonly [];
  removedClaims: readonly [];
  contradictions: readonly [];
}

export interface RewriteResult {
  text: string;
  audit: RewriteAudit;
  model: "gemini-flash-latest";
  thinkingLevel: "HIGH";
}

export interface RewriteOptions {
  apiKey?: string | undefined;
  signal?: AbortSignal;
}
