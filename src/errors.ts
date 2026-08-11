export class VoiceRewriterError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class InputError extends VoiceRewriterError {
  constructor(message: string) {
    super("INVALID_INPUT", message);
  }
}

export class ConfigurationError extends VoiceRewriterError {
  constructor(message: string) {
    super("CONFIGURATION_ERROR", message);
  }
}

export class GenerationError extends VoiceRewriterError {
  constructor(message: string, options?: ErrorOptions) {
    super("GENERATION_ERROR", message, options);
  }
}

export class FidelityError extends VoiceRewriterError {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super("FIDELITY_ERROR", message);
    this.issues = issues;
  }
}
