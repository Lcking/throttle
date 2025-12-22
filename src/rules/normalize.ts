import { NormalizedInput } from "./types";

export function normalizePrompt(prompt: string): NormalizedInput {
  const trimmed = prompt.trim();
  const collapsed = trimmed.replace(/\s+/g, " ");
  return {
    prompt: collapsed.toLowerCase(),
  };
}
