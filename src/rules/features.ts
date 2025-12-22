import { PromptFeatures } from "./types";

const STRONG_EXEC_PATTERNS: RegExp[] = [
  /\bwrite\s+code\b/,
  /\bgenerate\s+code\b/,
  /\bimplement\s+the\s+code\b/,
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

export function extractPromptFeatures(prompt: string): PromptFeatures {
  const strongHit = STRONG_EXEC_PATTERNS.some((pattern) => pattern.test(prompt));
  if (strongHit) {
    return { execIntentScore: 0.9 };
  }

  const weakHit = WEAK_EXEC_PATTERNS.some((pattern) => pattern.test(prompt));
  if (weakHit) {
    return { execIntentScore: 0.5 };
  }

  return { execIntentScore: 0 };
}
