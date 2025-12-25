# Iteration Notes (Resume Guide)

Purpose: A short checkpoint so we can resume work later without re-scanning context.

## Current Status
- Version: 0.4.0
- Core features: governance signals (Load/Authority/Noise), rule family R010–R012, behavior panel (badges/trends/risks + theme/locale), logging controls, welcome tip.
- v0.4 additions: workspace mode/tier memory with first-time prompts, QuickPick nudge UI, cooldown/dedupe + low-confidence suppression, mismatchAxis messaging (Thinking vs Doing), Manage Mutes (workspace/global), Doc Drift Sentinel (optional), Preflight command.
- Website draft: `site/index.html` (to be moved to a separate repo).
- Latest docs updates: `docs/prd.md` design philosophy + README “why not redundant” + best practices.

## Why Paused
- UX still feels “not natural” and value not strongly perceived in daily workflow.
- Need a better input/entry point and stronger perceived feedback loop.

## Next Focus (when resuming)
1) Find a more natural entry point (or proxy) for “auto-interception”.
2) Simplify flow so reminders feel native, not “extra steps”.
3) Re-evaluate which metrics/users actually perceive value.
4) Decide whether Doc Drift Sentinel should stay optional or move into a separate toggle group.

## Quick Pointers
- Governance signals live in `src/rules/features.ts` and `src/config/defaultConfig.ts`.
- Rule family: `src/rules/rules/R010_load_overflow.ts`, `R011_authority_overreach.ts`, `R012_noise_overload.ts`.
- Behavior panel: `src/ui/behaviorPanel.ts`, stats in `src/ui/behaviorStats.ts`.
- Safe submit flow: `src/ui/safeSubmit.ts`.
- Doc Drift Sentinel: `src/ui/docDriftSentinel.ts`.
- Preflight: `src/ui/preflight.ts`.
