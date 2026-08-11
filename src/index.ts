import { executeRewrite } from "./service.ts";
import type { RewriteOptions, RewriteRequest, RewriteResult } from "./types.ts";

export {
  ConfigurationError,
  FidelityError,
  GenerationError,
  InputError,
  VoiceRewriterError,
} from "./errors.ts";
export type {
  ContentKind,
  RewriteAudit,
  RewriteOptions,
  RewriteRequest,
  RewriteResult,
} from "./types.ts";

export async function rewriteSocial(
  request: RewriteRequest,
  options: RewriteOptions = {},
): Promise<RewriteResult> {
  return executeRewrite(request, options);
}
