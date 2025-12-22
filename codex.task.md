# Codex Task — Build Throttle v0.1

Goal: Implement the Throttle VS Code extension MVP described in AGENTS.md.

Steps:
1) Create/update package.json to be a VS Code extension:
   - commands: throttle.safeSubmit, throttle.setMode
   - activationEvents: onCommand for those commands
   - main: dist/extension.js
   - scripts: build (tsc -p .), watch
   - devDependencies: typescript, @types/node, @types/vscode

2) Create tsconfig.json suitable for extension build (rootDir src, outDir dist).

3) Implement code files under src/ exactly as listed in AGENTS.md:
   - Safe Submit should be the only MVP entry point.
   - Rule engine must implement R001_PLAN_EXEC_REASONING with confidence scoring and thresholds.
   - Provide demo actions; do not attempt to hook Cursor internals.

4) Add samples/prompts.jsonl with at least 20 prompts, including:
   - plan+reasoning+exec => HIT
   - plan+reasoning+no-code => NO HIT or LOW confidence
   - ask+reasoning+exec => NO HIT
   - plan+light+exec => NO HIT

5) Run `npm run build`, fix all TS errors.

Output:
- Make sure repo builds.
- Keep changes minimal and aligned with UX Constitution.

