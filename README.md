# Throttle

> A runtime co-pilot for AI usage in your IDE.  
> 一个运行时“副驾驶”：在你即将踩深油门之前，提醒你可能在错误的模式/模型上过度加速。

## What is Throttle?

Throttle **不是** AI 助手，也不会替你做决定。

Throttle 是一层**调用前（pre-call）**的运行时提示系统：
- 识别 **Plan / Agent / Ask / Debug** 模式与用户意图的错配
- 在高风险场景下给出冷静、非权威的提醒与可选路径（继续/切模型/切模式）
- 默认尽量不打扰：宁可漏报，不要误报

## Why it exists

AI IDE 的成本从“订阅席位”变成“推理消耗”。  
问题不在于你不会用，而在于**人类在实际开发中会无意识过度使用高推理模型**——尤其在不合适的模式里。

Throttle 的目标是：  
**不让你变慢，只防止你在不合适的地方把引擎踩爆。**

---

## Docs（规范文档）

> 这三个文档是本项目的“基准线”，任何 PR/功能/交互变化必须对齐。

- PRD (Canonical): `docs/prd.md`
- Rule Engine Spec: `docs/rule-engine-spec.md`
- UX Constitution: `docs/ux-constitution.md`

---

## Current Status

- Stage: **MVP / Demo-ready**
- Platforms: **VS Code Extension**（Cursor 兼容目标）
- v0.1 Focus: **Mode-aware Overkill Detection**（先做最关键的一条规则）

---

## MVP Scope (v0.1)

### R001 — Plan + Reasoning + Execution intent ⇒ nudge

当满足以下条件时提示：
- 当前模式是 **Plan**
- 当前模型等级是 **Reasoning**（如 Opus / o1 / thinking 类）
- Prompt 意图是**执行/实现**（写代码/实现/生成代码/patch/refactor 等）

提示遵循 UX Constitution：
- **Pre-call**
- **Non-blocking**
- **Non-judgmental**

---

## Install / Run (Dev)

> 适用于本地开发与调试扩展（Extension Development Host）。

### Prerequisites
- Node.js（建议 LTS）
- npm

### Setup
```bash
npm install
npm run build
```

## Dev (Run Extension Host)

1. Open the repo in VS Code
2. Run and Debug → Run Extension
3. Extension Development Host will open
4. Use Command Palette to run Throttle commands

## Demo (v0.1.1)

- `Throttle: Set Mode (Dev)` – set mode and model tier (stored per workspace)
- `Throttle: Safe Submit` – evaluate before sending using stored mode/tier

> v0.2 goal: auto-detect mode/tier with fewer manual steps.

## Roadmap (high level)

- v0.1.1: friction removal (remember mode/tier, readable UI, default Continue)
- v0.2: auto mode/model detection; optional Doc Drift Sentinel
- v0.3 (optional): relative cost hints (no exact billing)

## Contributing

Please follow the UX Constitution (highest bar): `docs/ux-constitution.md`.
See PRD/specs in `docs/`.
