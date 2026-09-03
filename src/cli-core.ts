import { paint, type Role } from "./colors.generated.ts";
import {
  ConfigurationError,
  FidelityError,
  GenerationError,
  InputError,
  VoiceRewriterError,
} from "./errors.ts";
import type { ContentKind, RewriteRequest, RewriteResult } from "./types.ts";

export interface CliOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CliDependencies {
  readFile(path: string): Promise<string>;
  readStdin(): Promise<string>;
  rewrite(request: RewriteRequest): Promise<RewriteResult>;
  version: string;
}

const HELP = `voice-rewriter --kind <post|reply> --profile <file> [options]

If source text is omitted, voice-rewriter reads it from stdin.

Options:
  --kind <post|reply>  Content type. Required.
  --profile <file>     Voice rules. Required.
  --example <file>     User-written example. Repeatable.
  --facts <file>       Source-backed facts the rewrite may use.
  --context <file>     Parent post or conversation context.
  --max-chars <count>  Maximum user-perceived characters.
  --json               Print the rewrite and audit as JSON.
  --no-color           Disable ANSI color (also honors NO_COLOR).
  --                   Treat every remaining argument as source text.
  --help               Show this help.
  --version            Show the installed version.

Set GEMINI_API_KEY in the environment. The tool always uses
gemini-flash-latest with HIGH reasoning and a separate fidelity audit.
`;

interface ParsedArguments {
  kind?: ContentKind;
  profilePath?: string;
  examplePaths: string[];
  factsPath?: string;
  contextPath?: string;
  maxCharacters?: number;
  text?: string;
  json?: boolean;
}

function valueAfter(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new InputError(`${flag} requires a value.`);
  }
  return value;
}

function hasOption(args: readonly string[], option: string): boolean {
  const terminatorIndex = args.indexOf("--");
  const optionArguments = terminatorIndex === -1 ? args : args.slice(0, terminatorIndex);
  return optionArguments.includes(option);
}

function paintRole(text: string, role: Role, args: readonly string[]): string {
  if (hasOption(args, "--no-color")) return text;
  return paint(text, role);
}

function stampGlyph(kind: "ok" | "err", args: readonly string[]): string {
  if (hasOption(args, "--no-color") || Boolean(process.env.NO_COLOR)) {
    return kind === "ok" ? "+" : "x";
  }
  return kind === "ok" ? "✓" : "✗";
}

function helpText(args: readonly string[]): string {
  const newline = HELP.indexOf("\n");
  const first = newline === -1 ? HELP : HELP.slice(0, newline);
  const rest = newline === -1 ? "" : HELP.slice(newline);
  return `${paintRole(first, "info", args)}${rest}`;
}

function parseArguments(args: readonly string[]): ParsedArguments {
  const parsed: ParsedArguments = { examplePaths: [] };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--kind") {
      const value = valueAfter(args, index, argument);
      if (value !== "post" && value !== "reply") {
        throw new InputError("--kind must be post or reply.");
      }
      parsed.kind = value;
      index += 1;
    } else if (argument === "--profile") {
      parsed.profilePath = valueAfter(args, index, argument);
      index += 1;
    } else if (argument === "--example") {
      parsed.examplePaths.push(valueAfter(args, index, argument));
      index += 1;
    } else if (argument === "--facts") {
      parsed.factsPath = valueAfter(args, index, argument);
      index += 1;
    } else if (argument === "--context") {
      parsed.contextPath = valueAfter(args, index, argument);
      index += 1;
    } else if (argument === "--max-chars") {
      const value = valueAfter(args, index, argument);
      parsed.maxCharacters = Number(value);
      index += 1;
    } else if (argument === "--json") {
      parsed.json = true;
    } else if (argument === "--no-color") {
      // Honored by paintRole / stampGlyph; not a parse field.
    } else if (argument === "--") {
      const remaining = args.slice(index + 1);
      if (remaining.length === 0) throw new InputError("Source text is required after --.");
      if (parsed.text !== undefined) throw new InputError("Source text was provided more than once.");
      parsed.text = remaining.join(" ");
      break;
    } else if (argument?.startsWith("--")) {
      throw new InputError(`Unknown option: ${argument}`);
    } else if (argument !== undefined) {
      if (parsed.text !== undefined) throw new InputError("Pass source text as one quoted argument.");
      parsed.text = argument;
    }
  }
  return parsed;
}

async function runCliUnchecked(
  args: readonly string[],
  dependencies: CliDependencies,
): Promise<CliOutput> {
  if (hasOption(args, "--help")) return { stdout: helpText(args), stderr: "", exitCode: 0 };
  if (hasOption(args, "--version")) {
    return { stdout: `${dependencies.version}\n`, stderr: "", exitCode: 0 };
  }
  const parsed = parseArguments(args);
  if (parsed.kind === undefined) throw new InputError("--kind is required.");
  if (parsed.profilePath === undefined) throw new InputError("--profile is required.");
  const text = parsed.text ?? (await dependencies.readStdin());

  const [voiceProfile, examples, facts, context] = await Promise.all([
    dependencies.readFile(parsed.profilePath),
    Promise.all(parsed.examplePaths.map((path) => dependencies.readFile(path))),
    parsed.factsPath === undefined ? undefined : dependencies.readFile(parsed.factsPath),
    parsed.contextPath === undefined ? undefined : dependencies.readFile(parsed.contextPath),
  ]);
  const request: RewriteRequest = {
    kind: parsed.kind,
    text,
    voiceProfile,
  };
  if (examples.length > 0) request.examples = examples;
  if (facts !== undefined) request.facts = facts;
  if (context !== undefined) request.context = context;
  if (parsed.maxCharacters !== undefined) request.maxCharacters = parsed.maxCharacters;

  const result = await dependencies.rewrite(request);
  if (parsed.json === true) {
    return { stdout: `${JSON.stringify(result)}\n`, stderr: "", exitCode: 0 };
  }
  return {
    stdout: `${result.text}\n`,
    stderr: `${paintRole(`${stampGlyph("ok", args)} audit pass`, "success", args)}\n`,
    exitCode: 0,
  };
}

function errorOutput(error: unknown, json: boolean, args: readonly string[]): CliOutput {
  if (!(error instanceof VoiceRewriterError)) {
    const message = `${stampGlyph("err", args)} Error: voice-rewriter failed unexpectedly.`;
    return { stdout: "", stderr: `${paintRole(message, "error", args)}\n`, exitCode: 1 };
  }
  const exitCode =
    error instanceof InputError || error instanceof ConfigurationError
      ? 2
      : error instanceof FidelityError
        ? 3
        : error instanceof GenerationError
          ? 4
          : 1;
  if (json) {
    const details: { code: string; message: string; issues?: readonly string[] } = {
      code: error.code,
      message: error.message,
    };
    if (error instanceof FidelityError) details.issues = error.issues;
    return {
      stdout: "",
      stderr: `${JSON.stringify({ error: details })}\n`,
      exitCode,
    };
  }
  return {
    stdout: "",
    stderr: `${paintRole(`${stampGlyph("err", args)} Error: ${error.message}`, "error", args)}\n`,
    exitCode,
  };
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
): Promise<CliOutput> {
  try {
    return await runCliUnchecked(args, dependencies);
  } catch (error) {
    return errorOutput(error, hasOption(args, "--json"), args);
  }
}
