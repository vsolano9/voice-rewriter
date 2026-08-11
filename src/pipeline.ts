import { extractAnchors } from "./anchors.ts";
import { FidelityError, GenerationError } from "./errors.ts";
import {
  AUDIT_SYSTEM_INSTRUCTION,
  buildAuditPrompt,
  buildRewritePrompt,
  REWRITE_SYSTEM_INSTRUCTION,
} from "./prompt.ts";
import type { RewriteAudit, RewriteRequest, RewriteResult } from "./types.ts";

export interface ModelCall {
  purpose: "rewrite" | "audit";
  model: "gemini-flash-latest";
  thinkingLevel: "HIGH";
  systemInstruction: string;
  prompt: string;
  responseMimeType: "application/json";
  responseJsonSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

export type GenerateModelContent = (call: ModelCall) => Promise<string>;

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const REWRITE_SCHEMA: ModelCall["responseJsonSchema"] = {
  type: "object",
  properties: {
    rewrite: {
      type: "string",
      description: "The complete rewritten post or reply, with no commentary.",
    },
  },
  required: ["rewrite"],
  additionalProperties: false,
};

const AUDIT_SCHEMA: ModelCall["responseJsonSchema"] = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "fail"] },
    meaningPreserved: { type: "boolean" },
    unsupportedClaims: { type: "array", items: { type: "string" } },
    removedClaims: { type: "array", items: { type: "string" } },
    contradictions: { type: "array", items: { type: "string" } },
  },
  required: [
    "verdict",
    "meaningPreserved",
    "unsupportedClaims",
    "removedClaims",
    "contradictions",
  ],
  additionalProperties: false,
};

function parseRewrite(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "rewrite" in parsed &&
      typeof parsed.rewrite === "string" &&
      parsed.rewrite.trim().length > 0
    ) {
      return parsed.rewrite.trim();
    }
  } catch {
    // The caller receives one safe provider error without raw model content.
  }
  throw new GenerationError("Gemini returned an invalid rewrite response.");
}

function anchorViolations(request: RewriteRequest, candidate: string): string[] {
  const required = extractAnchors(request.text);
  const allowed = new Set(extractAnchors(`${request.text}\n${request.facts ?? ""}`));
  const actual = new Set(extractAnchors(candidate));
  const violations: string[] = [];

  for (const anchor of required) {
    if (!actual.has(anchor)) violations.push(`Missing required anchor "${anchor}".`);
  }
  for (const anchor of actual) {
    if (!allowed.has(anchor)) violations.push(`Introduced unsupported anchor "${anchor}".`);
  }
  return violations;
}

function characterLimitViolations(request: RewriteRequest, candidate: string): string[] {
  if (request.maxCharacters === undefined) return [];
  const length = [...GRAPHEME_SEGMENTER.segment(candidate)].length;
  if (length <= request.maxCharacters) return [];
  return [`Rewrite is ${length} characters; maximum is ${request.maxCharacters}.`];
}

function candidateViolations(request: RewriteRequest, candidate: string): string[] {
  return [
    ...anchorViolations(request, candidate),
    ...characterLimitViolations(request, candidate),
  ];
}

export async function generateCandidate(
  request: RewriteRequest,
  generate: GenerateModelContent,
): Promise<string> {
  let violations: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await generate({
      purpose: "rewrite",
      model: "gemini-flash-latest",
      thinkingLevel: "HIGH",
      systemInstruction: REWRITE_SYSTEM_INSTRUCTION,
      prompt: buildRewritePrompt(request, violations),
      responseMimeType: "application/json",
      responseJsonSchema: REWRITE_SCHEMA,
    });
    let candidate: string;
    try {
      candidate = parseRewrite(raw);
    } catch (error) {
      if (attempt === 0 && error instanceof GenerationError) {
        violations = [error.message];
        continue;
      }
      throw error;
    }
    violations = candidateViolations(request, candidate);
    if (violations.length === 0) return candidate;
  }
  throw new FidelityError("Rewrite failed deterministic fidelity checks.", violations);
}

interface AuditResponse {
  verdict: "pass" | "fail";
  meaningPreserved: boolean;
  unsupportedClaims: string[];
  removedClaims: string[];
  contradictions: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseAudit(raw: string): AuditResponse {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "verdict" in value &&
      (value.verdict === "pass" || value.verdict === "fail") &&
      "meaningPreserved" in value &&
      typeof value.meaningPreserved === "boolean" &&
      "unsupportedClaims" in value &&
      isStringArray(value.unsupportedClaims) &&
      "removedClaims" in value &&
      isStringArray(value.removedClaims) &&
      "contradictions" in value &&
      isStringArray(value.contradictions)
    ) {
      return {
        verdict: value.verdict,
        meaningPreserved: value.meaningPreserved,
        unsupportedClaims: value.unsupportedClaims,
        removedClaims: value.removedClaims,
        contradictions: value.contradictions,
      };
    }
  } catch {
    // Raw model content is intentionally excluded from errors.
  }
  throw new GenerationError("Gemini returned an invalid audit response.");
}

function requirePassingAudit(audit: AuditResponse): RewriteAudit {
  const issues = [
    ...audit.unsupportedClaims.map((claim) => `Unsupported claim: ${claim}`),
    ...audit.removedClaims.map((claim) => `Removed claim: ${claim}`),
    ...audit.contradictions.map((claim) => `Contradiction: ${claim}`),
  ];
  if (!audit.meaningPreserved) issues.unshift("The candidate changed the source meaning.");
  if (audit.verdict !== "pass" || issues.length > 0) {
    throw new FidelityError("Rewrite failed the semantic fidelity audit.", issues);
  }
  return {
    verdict: "pass",
    meaningPreserved: true,
    unsupportedClaims: [],
    removedClaims: [],
    contradictions: [],
  };
}

export async function runRewritePipeline(
  request: RewriteRequest,
  generate: GenerateModelContent,
): Promise<RewriteResult> {
  const candidate = await generateCandidate(request, generate);
  const rawAudit = await generate({
    purpose: "audit",
    model: "gemini-flash-latest",
    thinkingLevel: "HIGH",
    systemInstruction: AUDIT_SYSTEM_INSTRUCTION,
    prompt: buildAuditPrompt(request, candidate),
    responseMimeType: "application/json",
    responseJsonSchema: AUDIT_SCHEMA,
  });
  const audit = requirePassingAudit(parseAudit(rawAudit));
  return {
    text: candidate,
    audit,
    model: "gemini-flash-latest",
    thinkingLevel: "HIGH",
  };
}
