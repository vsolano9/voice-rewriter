import assert from "node:assert/strict";
import { test } from "node:test";

import { extractAnchors } from "./anchors.ts";

test("exact anchors include clean URLs, mentions, hashtags, and numeric tokens", () => {
  assert.deepEqual(
    extractAnchors(
      "See https://example.com/builds, ask @Victor_9, tag #BuildLog, and keep €12.50 plus 42%.",
    ),
    ["#BuildLog", "42%", "@Victor_9", "https://example.com/builds", "€12.50"],
  );
});

test("URL anchors keep balanced delimiters and drop only surrounding punctuation", () => {
  assert.deepEqual(
    extractAnchors(
      "Read https://en.wikipedia.org/wiki/Function_(mathematics). Then open (https://example.com/path).",
    ),
    [
      "https://en.wikipedia.org/wiki/Function_(mathematics)",
      "https://example.com/path",
    ],
  );
});
