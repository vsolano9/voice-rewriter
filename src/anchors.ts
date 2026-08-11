const URL_PATTERN = /https?:\/\/[^\s<>"']+/gu;
const MENTION_PATTERN = /(?<![\p{L}\p{N}_])@[\p{L}\p{N}_]+/gu;
const HASHTAG_PATTERN = /(?<![\p{L}\p{N}_])#[\p{L}\p{N}_]+/gu;
const NUMBER_PATTERN = /(?<![\p{L}\p{N}_])[$€£]?\d+(?:[.,]\d+)*(?:%|[kKmMbB])?(?![\p{L}\p{N}_])/gu;

function trimUnbalancedClosingDelimiter(url: string, opening: string, closing: string): string {
  let trimmed = url;
  while (
    trimmed.endsWith(closing) &&
    [...trimmed].filter((character) => character === closing).length >
      [...trimmed].filter((character) => character === opening).length
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

function cleanUrlAnchor(url: string): string {
  let cleaned = url.replace(/[.,;!?]+$/u, "");
  cleaned = trimUnbalancedClosingDelimiter(cleaned, "(", ")");
  cleaned = trimUnbalancedClosingDelimiter(cleaned, "[", "]");
  return trimUnbalancedClosingDelimiter(cleaned, "{", "}");
}

export function extractAnchors(text: string): string[] {
  const urls = (text.match(URL_PATTERN) ?? []).map(cleanUrlAnchor);
  const anchors = [
    ...urls,
    ...(text.match(MENTION_PATTERN) ?? []),
    ...(text.match(HASHTAG_PATTERN) ?? []),
    ...(text.match(NUMBER_PATTERN) ?? []),
  ];
  return [...new Set(anchors)].sort();
}
