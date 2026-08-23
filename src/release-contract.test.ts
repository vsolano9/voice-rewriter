import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("package metadata points consumers to the public owner repository", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", root), "utf8"),
  ) as {
    repository?: { type?: string; url?: string };
    homepage?: string;
    bugs?: { url?: string };
  };

  assert.deepEqual(packageJson.repository, {
    type: "git",
    url: "git+https://github.com/vsolano9/voice-rewriter.git",
  });
  assert.equal(packageJson.homepage, "https://github.com/vsolano9/voice-rewriter#readme");
  assert.deepEqual(packageJson.bugs, {
    url: "https://github.com/vsolano9/voice-rewriter/issues",
  });
});

test("README documents registry installation instead of a checkout-only release", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");

  assert.match(readme, /npm install --global voice-rewriter/);
  assert.match(readme, /npm install voice-rewriter/);
  assert.match(readme, /npx voice-rewriter --version/);
  assert.doesNotMatch(readme, /Until the package is published/);
});

test("the owner repository remains local-validation only", async () => {
  const workflows = await readdir(new URL(".github/workflows/", root)).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );

  assert.deepEqual(
    workflows.filter((name) => name.endsWith(".yml") || name.endsWith(".yaml")),
    [],
  );
});
