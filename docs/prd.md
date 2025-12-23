# Throttle PRD（规范版 · Canonical）

> 状态：活文档（living document）。任何上线行为/交互/规则变化，必须同步更新本 PRD 以及相关目录文档。

## 问题（Problem）
AI 原生 IDE（尤其是 Cursor）正在把开发者从“按席位付费”推向“按消耗付费”。痛点不在于价格本身，而在于缺少运行时治理：人们会在不合适的模式下无意识地使用高推理/高成本模型，直到事后遭遇“账单冲击”。

我们的产品假设：少量、模式感知的护栏，可以在不拖慢用户的前提下，显著减少最常见的“过度加速（overkill）”误用。

## 产品主张（Product thesis）
Throttle 是 AI IDE 聊天中的一层**运行时行为感知（runtime behavior-aware）**副驾驶。

- 不以“账单面板”作为第一形态
- 专注 **调用前（pre-call）**的检测 + 冷静提示
- 优先优化 低摩擦 与 低误报

## 目标用户（Target users）
- Cursor 重度用户（Pro/Ultra），频繁在 Plan / Agent / Ask / Debug 间切换
- 偏“vibe coding/快节奏循环”的用户，对“多点几次”高度敏感

## 目标（Goals）
1. 降低在不合适模式下使用高推理/高成本模型的概率
2. 提供可执行的替代路径（切模式/切模型），不评判、不说教
3. 将交互开销压到近乎为零（正常流 0 次；命中风险时 ≤ 1 次额外交互）

## 非目标（Non-goals，v0.x）
- 精确计费（provider 级准确）或账单对账
- 在传输层硬拦截网络请求
- 完整的“团队治理”策略下发与强制执行
⸻
## 推荐环境：Fractal Docs Discipline（分形文档纪律）
Throttle 不要求你重写工作流，但它强烈建议把仓库改造成一个自解释系统，以降低上下文漂移、重复解释、以及高推理模型在边界不清时“乱跑”的概率。

### 1. 根目录主文档（Root MD）
- 任何功能/架构/写法更新，工作结束后必须同步更新相关目录的子文档。

### 2. 每个文件夹一个极简说明（≤3 行）
- 写清该文件夹的“地位/职责/边界”。
- 列出每个文件：名字 / 地位 / 功能。
- 顶部加一句：“一旦我所属的文件夹有所变化，请更新我。”

### 3. 每个文件头三行极简注释
- Input：依赖外部什么（库/模块/上游文件）
- Output：对外提供什么（导出/接口/副作用）
- Pos：在系统局部的地位是什么（它“是什么”以及“它不是什么”）
- 并声明：“一旦我被更新，务必更新我的开头注释，以及所属文件夹的 md。”

### 4. 语义链接网络（Input 引用依赖的 Pos）
- 在 Input 中尽量直接引用依赖文件的 Pos 描述，形成“语义链接”。
- 当依赖核心特性变化时，AI 更容易在引用处触发纠错反应，提高稳定性。

## Throttle 如何使用它（v0.2+，可选）
提供一个温和的调用前规则族：
- Doc Drift Sentinel（文档漂移哨兵）：在发送“实现/重构”提示词前，如果目标模块缺少最小定位注释或目录极简说明，建议先补齐（不阻断）。
⸻
## 核心概念：Mode-aware Overkill Detection（模式感知的过度加速检测）
Throttle 在每次发送提示词前，基于当前 模式 与 模型等级（tier），再结合轻量启发式（关键词 + 简单意图评分）评估风险。

若风险较高，Throttle 弹出非权威式建议，并提供一键替代路径。
⸻
## MVP（v0.1）范围
只做一条规则：

### R001 — Plan + Reasoning + 执行意图 ⇒ 提醒
触发条件：
- Mode  Plan
- Model tier  Reasoning（例如 Opus / o1 / “thinking” 类）
- Prompt 看起来是执行/落地（implement / generate code / write code / refactor / produce final code 等）

响应内容：
- 简短、可读的通知：
    - 检测到什么（Plan + reasoning + 执行意图）
    - 为什么需要注意（可能消耗较多资源）
    - 选项：
        - 继续
        - 切到轻量模型
        - 切到 Ask / Agent（按产品立场选择）
        - 忽略

设计约束
- 禁止道德化语言、禁止“说教/训斥”。
- 按钮文案短，避免被截断。
- 支持“此规则不再提醒”（按规则静音）。
⸻
### UX Constitution（硬约束）
1. 不羞辱：语气不评判。
2. v0.x 不硬阻断。
3. 宁可沉默也不要高误报（宁漏报不打扰）。
4. 一键可恢复：每次提醒必须提供直接可执行的下一步。
5. 摩擦预算（Friction budget）：减少重复手动操作；默认值必须可用。
⸻
### 实现策略（Implementation strategy）

#### v0.1：Extension 优先，低耦合
- 提供一个安全提交入口：Throttle: Safe Submit
- 将上次选择的 mode / model tier 存入全局状态（按 workspace 记忆）
- 提供快捷切换，但不要求用户反复设置

为了降低“点按税（click tax）”：
- 记忆上次选择（mode/tier），自动应用到当前工作区
- 建议把 Throttle: Safe Submit 绑定到单一快捷键（如 Cmd+Enter）
- 提供状态栏指示（当前 mode/tier），减少命令调用频率

#### v0.2+：Cursor Rules 集成（可行时优先）
如果 Cursor Rules 能承载部分行为约束，Throttle 可以退化为“模式检测 + 触发对应规则”的轻薄层，降低维护成本。
⸻
### 路线图（Roadmap）

#### v0.2 — 去摩擦（Friction removal）
- 尽可能自动识别 mode / model tier
- 支持 prompt 标签覆盖（如 `[mode:plan] [tier:reasoning]`），便于无 UI 自动识别
- 更好的 UI：可读的 modal/webview，避免文案被截断
- Doc Drift Sentinel（可选）

#### v0.3 — 成本透明化（可选模块）
增加相对成本提示与轻量遥测：
- “Context is money” 的框架化提示
- 粗略比例/风险信号（不做精确计费）

>注：更深的“成本治理”方向（context gauge、cache 线索、本地日志解析）存在，但它应当与 Throttle MVP 解耦，可作为姊妹模块或高级层，而不是 v0.x 强绑。

⸻
关键风险与应对（Key risks & mitigations）
- Cursor UI/内部逻辑变化 → 检测尽量依赖稳定 API；保持最小 hook；开源维护
- 误报率过高 → 阈值保守 + 一键静音
- 用户摩擦/点太多 → 热键优先、状态持久化、短文案、无命中不打扰
⸻
成功指标（Success metrics，MVP）
- 命中提醒后，用户切到轻量模型/切模式的比例
- 用户主观“烦躁度/打扰度”反馈
- Safe Submit 的日活/周活留存
⸻
规范文件放置（Canonical file placement）
将本 PRD 放入仓库时：
- docs/prd.md（唯一规范版）
- 可选拆分：
    - docs/ux-constitution.md
    - docs/recommended-environment.md
