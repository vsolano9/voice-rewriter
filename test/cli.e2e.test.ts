import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("compiled CLI is executable and renders help", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, ["dist/cli.js", "--help"]);

  assert.match(stdout, /voice-rewriter --kind <post\|reply>/);
  assert.equal(stderr, "");
});
