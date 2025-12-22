# Throttle — AGENTS

You are working in a local repo for a VS Code extension named **Throttle**.

## Mission
Build a minimal, shippable MVP that implements **Mode-aware Overkill Detection** via a **Safe Submit** command.
Throttle must obey the UX Constitution: never block, never take control, never judge — only warn *before* a costly AI call.

## UX Constitution (Hard Rules)
1) Co-Pilot: never block user action; always provide "Continue" as the primary action.
2) Timing: warnings must happen BEFORE any AI call (we simulate send with Safe Submit).
3) Context-aware: decisions consider (mode, prompt intent, model tier). In v0.1 we only implement Plan+Exec+Reasoning.
4) Tone: calm, informative, non-authoritative.

## v0.1 Scope (Extremely Minimal)
- Implement a rule engine with a single rule:
  - R001_PLAN_EXEC_REASONING triggers when:
    - mode == plan
    - model is reasoning (by tier or allowlist)
    - prompt indicates execution intent ("write code", "implement", "生成代码", etc.)
- Provide a command: `Throttle: Safe Submit`
  - It asks user for the prompt text (InputBox)
  - Uses a dev mode selector command: `Throttle: Set Mode (Dev)`
  - Runs rule engine and shows a non-blocking warning with actions:
    - Continue (primary)
    - Switch to Ask (demo)
    - Switch to light model (demo)
    - Mute this rule (demo)
  - No real sending yet.

## Deliverables
Create/modify these files:
- package.json (extension manifest with commands + activationEvents)
- tsconfig.json (compile TS to dist/)
- src/extension.ts
- src/ui/safeSubmit.ts
- src/ui/modeState.ts
- src/rules/types.ts
- src/rules/normalize.ts
- src/rules/features.ts
- src/rules/engine.ts
- src/rules/rules/R001_plan_exec_reasoning.ts
- src/config/defaultConfig.ts
- samples/prompts.jsonl (at least 20 samples)

## Acceptance Criteria
- `npm run build` succeeds.
- In Extension Development Host:
  - `Throttle: Set Mode (Dev)` sets a mode in globalState.
  - `Throttle: Safe Submit`:
    - In plan + reasoning + exec prompt -> warning appears with actions.
    - In non-plan or non-reasoning -> no warning.
- Unit-like smoke checks: `samples/prompts.jsonl` exists and contains expected hit/no-hit notes.

## Coding Constraints
- TypeScript, strict mode.
- Keep v0.1 conservative (prefer false negatives over false positives).
- Do NOT implement billing or post-hoc analysis.

## Next (Not in v0.1)
- UI overlay for real input box
- Shadow log parsing
- Context Sentinel Lite

