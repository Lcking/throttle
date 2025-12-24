import { PromptFeatures, ThrottleConfig } from "./types";

const STRONG_EXEC_PATTERNS: RegExp[] = [
  /\bwrite\s+code\b/,
  /\bgenerate\s+code\b/,
  /\bimplement\s+the\s+code\b/,
  /\bimplement\s+(a|an)\s+(basic|simple|minimal)?\s*(http|https|grpc|rest|graphql)?\s*(function|class|module|script|cli|server|api|service|worker|queue|router|handler|client)\b/,
  /\bcreate\s+(a|an)\s+(function|class|module|script|cli)\b/,
  /\bbuild\s+(a|an)\s+(function|class|module|script|cli)\b/,
  /\bcode\s+it\b/,
  /生成代码/,
  /写代码/,
  /实现代码/,
];

const WEAK_EXEC_PATTERNS: RegExp[] = [
  /\bimplement\b/,
  /\bwrite\s+an?\s+(algorithm|api)\b/,
  /实现/,
];

function collectMatches(prompt: string, keywords: string[]): string[] {
  const matches: string[] = [];
  for (const keyword of keywords) {
    if (prompt.includes(keyword)) {
      matches.push(keyword);
    }
  }
  return matches;
}

export function extractPromptFeatures(
  prompt: string,
  config: ThrottleConfig
): PromptFeatures {
  const strongHit = STRONG_EXEC_PATTERNS.some((pattern) => pattern.test(prompt));
  if (strongHit) {
    return {
      execIntentScore: 0.9,
      loadSignals: collectMatches(prompt, config.governanceKeywords.load),
      authoritySignals: collectMatches(prompt, config.governanceKeywords.authority),
      noiseSignals: collectMatches(prompt, config.governanceKeywords.noise),
    };
  }

  const weakHit = WEAK_EXEC_PATTERNS.some((pattern) => pattern.test(prompt));
  if (weakHit) {
    return {
      execIntentScore: 0.5,
      loadSignals: collectMatches(prompt, config.governanceKeywords.load),
      authoritySignals: collectMatches(prompt, config.governanceKeywords.authority),
      noiseSignals: collectMatches(prompt, config.governanceKeywords.noise),
    };
  }

  return {
    execIntentScore: 0,
    loadSignals: collectMatches(prompt, config.governanceKeywords.load),
    authoritySignals: collectMatches(prompt, config.governanceKeywords.authority),
    noiseSignals: collectMatches(prompt, config.governanceKeywords.noise),
  };
}
