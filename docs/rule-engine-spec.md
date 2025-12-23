# Throttle 规则执行器规格（Rule Engine Spec · v0.1 → v0.2）

> 目标：把 PRD 中的 **Mode-aware Overkill Detection** 变成可实现、可测试、可扩展的规则执行器，并且严格遵守 **UX Constitution**（不阻断、不接管、不评判）。

---

## 0. Ground Rules（必须先读）

### 0.1 UX Constitution 依赖

本规格所有“提示/动作”都必须满足：

* **Pre-call**：提示发生在 AI 调用之前
* **Non-blocking**：永远允许用户继续
* **Non-judgmental**：只提示风险与替代路径，不评价能力

### 0.2 Recommended Environment: Fractal Docs Discipline（分形文档纪律）

Throttle 不会要求你重写工作流，但它**强烈建议**你把项目改造成“自解释系统”。这会显著降低上下文漂移、重复解释、以及高推理模型在不确定边界里“乱跑”的概率，从而更省钱、更稳定。

下面这套纪律来自社区实践（1–4 条），我们将其正式纳入 Throttle 的推荐环境（Recommended Environment）：

1. **根目录主文档（Root MD）**

* 强调：任何功能/架构/写法更新，工作结束后必须同步更新相关目录的子文档。

2. **每个文件夹一个极简说明（≤3 行）**

* 写清该文件夹的“地位/职责/边界”。
* 下方列出该文件夹每个文件：**名字 / 地位 / 功能**。
* 文件夹说明顶部加一句：**“一旦我所属的文件夹有所变化，请更新我。”**

3. **每个文件头三行极简注释**

* **Input**：依赖外部什么（库/模块/上游文件）
* **Output**：对外提供什么（导出/接口/副作用）
* **Pos**：在系统局部的地位是什么（它“是什么”，以及“它不是什么”）
* 再加一句：**“一旦我被更新，务必更新我的开头注释，以及所属文件夹的 md。”**

4. **语义链接网络（Input 引用依赖的 Pos）**

* 在文件头的 Input 中，尽量直接引用依赖文件的 **Pos** 描述，形成“语义链接”。
* 这样当依赖的核心特性改变时，AI 更容易在引用处触发纠错反应，提高稳定性。

#### How Throttle will use it（v0.2 · optional）

* Throttle 增加一个可选规则族 **Doc Drift Sentinel**：在你即将发送一个“实现/重构”型提示词前，如果发现当前模块缺少最小定位注释（Input/Output/Pos）或目录缺少极简说明，则提示：

  * 这可能增加上下文成本与误改风险
  * 是否先补齐定位（提供打开文件/生成模板的建议动作）

> 注意：这仍然是 **Pre-call** 的、非阻断的提醒；用户永远可以选择“继续”。

---

## 1. 术语与核心对象

### 1.1 PromptEnvelope（发送前信封）

Rule Engine 的输入是一个“发送前快照”，统一封装为：

```ts
export type EditorMode = 'plan' | 'agent' | 'ask' | 'debug' | 'unknown';

export type ModelTier = 'light' | 'standard' | 'reasoning';

export interface ModelInfo {
  id: string;            // e.g. "claude-4.5-opus" "gpt-5.2" "o1" "sonnet"
  provider?: string;     // optional
  tier: ModelTier;
}

export interface ContextSignals {
  // 只做“相对信号”，v0.1 不算钱
  promptChars: number;
  promptTokensApprox?: number;

  // 来自 IDE 的上下文构成（如果能拿到）
  currentFileBytes?: number;
  referencedFilesCount?: number;
  referencedFilesBytes?: number;
  implicitContextBytes?: number;   // e.g. repo summary / hidden context

  // 影子信号（可选）：推测更像 cache write 还是 cache read
  cerClass?: 'likely_read' | 'likely_write' | 'unknown';
}

export interface PromptEnvelope {
  id: string;                   // uuid
  ts: number;                   // ms
  mode: EditorMode;
  model: ModelInfo;
  promptText: string;
  language?: 'zh' | 'en' | 'mixed' | 'unknown';
  context: ContextSignals;

  // 可选：本地只读解析出来的历史统计
  history?: {
    lastMode?: EditorMode;
    lastModelId?: string;
    recentWarnings?: number;
  };
}
```

> 注：Token 只能做近似（字符/词数估算）。精确 token 不属于 v0.1。

---

## 2. 规则执行器总体流程

### 2.1 Pipeline（同步、调用前）

```ts
export interface RuleEngineConfig {
  enabled: boolean;
  strictness: 'low' | 'medium' | 'high'; // 影响阈值/误报倾向

  // 模型分级可配置
  reasoningModelIds: string[];

  // 关键词组
  keywords: {
    exec: string[];    // 执行/实现
    decision: string[];
    debug: string[];
    refactor: string[];
  };

  // 规则开关与静音
  rules: Record<string, { enabled: boolean; muted: boolean }>;
}

export interface RuleHit {
  ruleId: string;
  severity: 'info' | 'warn';
  confidence: number;   // 0..1
  reasons: string[];    // 用于可解释性
  actions: Array<{
    id: string;
    label: string;
    kind: 'continue' | 'cancel' | 'switch_mode' | 'switch_model' | 'open_new_chat' | 'mute_rule';
    payload?: any;
  }>;
  message: {
    title: string;
    body: string;
  };
}

export interface RuleDecision {
  hits: RuleHit[];            // 0..n
  recommendedHit?: RuleHit;   // 0..1（用于 UI 默认展开）
}

export function evaluate(envelope: PromptEnvelope, cfg: RuleEngineConfig): RuleDecision {
  // 0) 快速退出
  // 1) Feature extraction
  // 2) Rule evaluation (v0.1: single rule)
  // 3) Dedup / cooldown / mute
  // 4) Build actions + message
  // 5) Return decision
}
```

---

## 3. Feature Extraction（特征提取）

输出统一的特征对象：

```ts
export interface Features {
  mode: EditorMode;
  isReasoningModel: boolean;

  hasExecIntent: boolean;
  hasDecisionIntent: boolean;
  hasDebugIntent: boolean;
  hasRefactorIntent: boolean;

  promptLen: number;
  execKeywordMatches: string[];
  negationMatches: string[];

  // 上下文风险（可选）
  contextLarge: boolean;
  cerLikelyWrite: boolean;
}
```

### 3.1 v0.1 关键词命中规则

* 采用“包含匹配 + 简单归一化”（小写、去标点、压缩空格）
* 中英分词不做，先用 substring（MVP）

### 3.2 v0.1 contextLarge

* referencedFilesBytes >= 512KB 或 referencedFilesCount >= 8 → true
* 未知则 false（宁漏报）

---

## 4. v0.1 唯一规则：R001 Plan-Exec-Reasoning

### 4.1 规则定义

**Rule ID**：`R001_PLAN_EXEC_REASONING`

**触发条件（AND）**：

1. mode == `plan`
2. isReasoningModel == true
3. hasExecIntent == true

> 覆盖最常见烧钱误用：Plan 阶段直接要“写实现”，同时用高推理模型。

### 4.2 hasExecIntent 识别（v0.1）

命中任意一个即视为“执行倾向”：

* 中文（示例）：

  * 写代码、实现、生成代码、补全代码、改代码、帮我写、落地代码、直接给代码、apply diff、patch
* 英文（示例）：

  * implement, write code, generate code, code it, produce the code, edit the file, apply diff, patch

**反例/否定词（用于降权）**（不直接否决，降低误报）：

* “伪代码”“只写思路”“不需要代码”“只讨论方案”
* “high level”“no code”“pseudocode only”

### 4.3 置信度计算（v0.1）

* base = 0.60
* +0.15 每命中一个强执行关键词（最多 +0.30）
* -0.20 若命中否定词（可叠加）
* +0.10 若 prompt 包含文件操作暗示（如“修改这个文件/patch/apply diff”）
* clamp 到 0..1

**触发阈值**：

* strictness=low：>=0.75
* strictness=medium：>=0.65（默认）
* strictness=high：>=0.55

### 4.4 提示文案（v0.1）

**title（中文）**：`可能在 Plan 模式下过度加速`

**body（中文模板）**：

> 检测到你在 **Plan 模式**下请求代码实现，当前使用的是**高推理模型**。
> 这可能会消耗较多资源。
> 建议：先在 Ask 模式确认方案，或切换更快模型继续规划。

**reasons（可展开详情）**：

* `当前模式：Plan`
* `模型等级：Reasoning`
* `命中执行关键词：xxx`
* （可选）`上下文偏大：true/false`

### 4.5 Actions（v0.1）

必须包含：

* `continue`：继续本次操作（默认）
* `switch_mode`：切换到 Ask
* `switch_model`：切换到 standard/light（建议目标：Sonnet / GPT non-reasoning）
* `mute_rule`：此规则不再提示

> 注意：动作必须是“建议路径”，不替用户做决定。

---

## 5. 去重、冷却、静音

### 5.1 Mute（静音）

* per-rule 静音：`cfg.rules[ruleId].muted = true`
* UI 提供一键“永不提示此规则”

### 5.2 Cooldown（冷却）

* 同一规则在 5 分钟内最多提示一次
* 若用户连续选择 continue ≥ 3 次，可将 severity 降为 info（可选）

---

## 6. 可测试性（Test Spec）

### 6.1 最小单元测试集

* **T1**：Plan + Reasoning + “实现这段逻辑” → 触发 warn
* **T2**：Plan + Reasoning + “不要代码，只讲思路” → 不触发或低置信度不足
* **T3**：Ask + Reasoning + “实现这段逻辑” → 不触发（模式不符）
* **T4**：Plan + Standard/Light + “实现这段逻辑” → 不触发（模型不符）
* **T5**：Plan + Reasoning + “写伪代码” → 触发但置信度下降（high 可能触发，low 不触发）

### 6.2 Golden prompts（回归样本）

维护 `samples/prompts.jsonl`：

* prompt
* mode
* model tier
* expected: hit/no-hit

用于回归测试与误报控制。

---

## 7. v0.2 扩展接口（预留）

### 7.1 多规则与优先级

示例规则（先占位，不强制实现）：

* `R002_AGENT_REDESIGN`：Agent 模式出现“重新选型/架构对比/decision”类词
* `R003_DEBUG_REFACTOR`：Debug 模式出现“大规模重构/架构改造”类词

冲突解决：

* 取最高 severity
* 置信度最高者为 `recommendedHit`

### 7.2 Doc Drift Sentinel（v0.2 · optional）

**目的**：把“分形文档纪律”从建议变成“可选的运行时轻提醒”。

**Rule ID（建议）**：`R101_DOC_DRIFT_SENTINEL`

**触发条件（AND）**：

1. hasExecIntent 或 hasRefactorIntent
2. contextLarge == true 或 promptLen >= 某阈值
3. 目标文件/目录缺少最小自解释结构

**最小自解释结构（检查项）**：

* 目录：存在 `README.md`，且前 3 行非空（极简说明）
* 文件：前 15 行内存在 `Input:`/`Output:`/`Pos:`（或等价标记）

**提示文案（中文）**：

* title：`可能缺少最小定位注释`
* body：

  * `你正在发起实现/重构，但当前模块缺少最小定位（Input/Output/Pos）或目录极简说明。`
  * `这可能增加上下文成本与误改风险。`

**Actions**：

* continue
* open_file / open_folder_readme
* generate_templates（仅生成，不自动写入；保持 non-blocking）
* mute_rule

> 关键：Doc Drift Sentinel 必须宁漏报，不要误报；且永远允许继续。

### 7.3 Thinking Tax 信号（占位）

* 当 isReasoningModel && (hasRefactorIntent 或 hasDecisionIntent)
* 提示“可能产生隐藏输出（Reasoning tokens）”

---

## 8. 与 UI/插件集成（最小集）

### 8.1 触发点（v0.1）

优先实现：

* 命令：`Throttle: Safe Submit`（开发期入口）

### 8.2 交互要求（向 v0.2 收敛）

为减少“点太多次”的摩擦，UI 侧应逐步做到：

* mode/tier **默认读取当前状态**（或记忆上次选择），仅在必要时让用户更改
* 支持 prompt 标签覆盖（如 `[mode:plan] [tier:reasoning]` / `mode=ask tier=light` / `/plan /reasoning`）
* 命中规则才提示；不命中不打扰
* actions 用 QuickPick 展示完整信息（避免按钮文字截断）

---

## 9. 默认配置（v0.1）

```json
{
  "enabled": true,
  "strictness": "medium",
  "reasoningModelIds": ["claude-opus", "claude-4.5-opus", "o1", "grok-4"],
  "keywords": {
    "exec": ["写代码", "实现", "生成代码", "补全代码", "改代码", "直接给代码", "apply diff", "patch", "implement", "write code", "generate code", "code it", "edit the file"],
    "decision": ["方案", "取舍", "tradeoff", "design"],
    "debug": ["报错", "复现", "stack trace", "repro"],
    "refactor": ["重构", "refactor", "redesign", "architecture"]
  },
  "rules": {
    "R001_PLAN_EXEC_REASONING": {"enabled": true, "muted": false}
  }
}
```

---

## 10. 约束与声明

* Rule Engine **不负责精确计费**（v0.1 只给相对风险信号）
* 所有判断仅是“风险提示”，允许用户无视
* 默认保守（宁漏报）
* 推荐环境（分形文档纪律）是**增益项**，不是强制前置条件

