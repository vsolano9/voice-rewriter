#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { runCli } from "./cli-core.ts";
import { rewriteSocial } from "./index.ts";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string };
  const output = await runCli(process.argv.slice(2), {
    readFile: (path) => readFile(path, "utf8"),
    readStdin,
    rewrite: rewriteSocial,
    version: packageJson.version,
  });
  if (output.stdout) process.stdout.write(output.stdout);
  if (output.stderr) process.stderr.write(output.stderr);
  process.exitCode = output.exitCode;
}

await main();
