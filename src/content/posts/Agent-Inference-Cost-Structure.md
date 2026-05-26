---
title: "一次 Agent 推理的成本结构：拆解与优化路径"
published: 2026-05-26
description: "Agent 推理的 token 消耗可以按物理来源拆成四个层次：工具输出、外部数据、上下文累积、固定开销。每一层有自己的产生时机、介入窗口、对应的优化手段。这篇文章把这四层讲清楚，并算清楚每一层值多少钱。"
image: "/gallery/cover/agent-cost-structure.png"
tags: ["LLM", "Agent", "推理优化", "成本", "Prompt Caching"]
category: "技术"
draft: false
---

## 一个被忽略的成本结构

写一个 LLM 应用很容易，跑一段时间之后看账单也很容易。但要回答"钱具体花在哪里"，就不那么容易了。

观察一次中等规模的 Agent 任务——比如用 [Claude Code](https://docs.claude.com/en/docs/claude-code) 跑一个 30-50 轮的 coding session——把 token 消耗拆开看，会发现一个反直觉的事实：用户输入和模型最终输出加起来不到 20%，剩下的 80% 来自一类很少被讨论的内容：重复传输的 system prompt、工具调用的原始返回、塞进 context 的网页与文档、以及历史轮次的累积。

这部分内容很少出现在 prompt engineering 的视野里，也不属于 model selection 的讨论范围。它属于 **Agent 系统的成本结构**——一个被多数使用者忽略、却在实际账单上占主体地位的层面。

本文要做的事情，是把这个结构拆开，逐层讨论它的产生机制、可介入的时机、以及对应的优化手段。最后用 Claude Opus 4.7 的实际定价算清楚每一层值多少钱。

## 四个层次：成本来源的物理分类

一次 Agent 推理的 token 消耗，可以按物理来源分成四个独立的层次：

| 层次 | 产生位置 | 时间特性 | 主要构成 |
|------|----------|----------|----------|
| 工具输出层 | tool result 返回时 | 当下产生 | CLI 命令的原始输出、API 返回的完整数据 |
| 数据入口层 | 外部内容注入 context 时 | 当下产生 | 网页 HTML、PDF/PPT 等格式化文档 |
| 上下文累积层 | 跨轮历史保留 | 跨轮重复 | 老轮次的对话与工具结果 |
| 固定开销层 | 每轮请求重复传输 | 跨轮重复 | system prompt、工具定义、persona |

四个层次最终都汇集到 prefill 阶段产生成本，但它们的物理位置不同，因此可介入的时机也不同。**这是后面四节分别展开的依据**——理解一个工具属于哪一层，是判断它是否能解决你问题的前提。

下面分别讨论。

## 工具输出层：在 result 进入 context 之前

**问题界定。** Agent 调用一次 shell 命令或 API，返回的原始数据可能是 3K 到 50K token，但 Agent 实际需要的信息往往只占其中很小一部分。`git log --oneline` 返回 200 个 commit，Agent 只想知道最近的 10 个；`pytest` 返回完整的回归报告，Agent 只关心失败的那几个。多余部分一旦进入 context，prefill 成本立即产生，无法回收。

**介入窗口。** 这一层唯一有效的介入点，是 **tool 与 agent 之间的传输路径**。一旦 result 被加入 message 列表，钱已经花了——下游任何处理都只能影响后续轮次，挽不回这一轮。

**rtk 的角色。** [rtk](https://github.com/rtk-ai/rtk) 在 shell 与 Agent 之间引入一个压缩层，对常见命令应用规则改写：`git status` 提取关键变更、`pytest` 仅保留失败用例、`grep` 按文件分组聚合。它的本质是**领域知识驱动的输出剪枝**——用一些"懂这条命令长什么样"的规则，在 result 跨过那条边界之前先做一次裁剪。

**适用边界。** 当前形态的 rtk 主要服务 coding agent，因为它的优化对象是 CLI 工具的输出。对于 RAG agent、客服 agent 等非 CLI 主导的场景，这一层的优化需要由工具自身的设计承担——比如限制返回字段、内置分页、提供按需细化的结构化接口。从架构角度，**让工具一开始就只返回 Agent 需要的东西，比事后压缩更优雅**，但这要求工具设计者就是 Agent 工程师，现实中很难做到。所以 rtk 这种"中间层"才有存在的空间。

## 数据入口层：外部内容的清洗与结构化

**问题界定。** Agent 接收的外部内容很少是干净的。一篇网页直接抓回来可能有 80% 是导航栏、广告、推荐区、JavaScript 占位符；一份 PPT 直接转 base64 喂进去既消耗 token 又让模型读不懂；PDF 的版式信息对模型几乎是噪声。这些"原始格式"的输入，往往是 Agent 系统中**单位价值最低**的 token——花了钱，但没有给模型带来对应的信息量。

**介入窗口。** 内容到达 Agent 之前的**预处理阶段**。这一层不是压缩，而是**减法**——本来就不该进入 context 的部分，从源头剔除。和工具输出层不同的是，这里处理的是"外部文档"而不是"工具返回"，介入窗口因此更长——文档可以在落盘时清洗、可以在调用时清洗、也可以离线批量清洗。

**defuddle 的角色。** [defuddle](https://github.com/kepano/defuddle) 是一个网页正文抽取工具，剥离装饰元素、保留主体内容，输出结构化 Markdown。设计思路对标 Mozilla Readability，但更针对 LLM 输入做了优化——比如保留代码块结构、剔除 cookie 提示、不输出大段无意义的属性。它由 Obsidian 的联合创始人 Steph Ango 维护，工程上稳定。

**markitdown 的角色。** [markitdown](https://github.com/microsoft/markitdown) 是 Microsoft 出品的异构文档转换工具，把 PDF、Office 全家桶、图像 OCR、音频转写统一为 Markdown。它的价值不在压缩比——单看 token 数，原始 PDF 转 Markdown 不一定省太多——而在**格式归一**：把"模型不熟悉的格式"翻译为"模型熟悉的格式"。同样信息量的 Markdown 比原始 PDF 文本更容易被理解，相当于把 token 的"信息密度"提了上来。

**与 Prompt Caching 的关系。** 之前那篇 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 讨论过"输入侧的减法"——能不进 context 的就不要进。本层是这个减法的**前置**：先洗净再缓存，比缓存噪声划算得多。两者是顺序关系，不是替代关系。一份脏 PDF 哪怕缓存了，每次读取也是在为大量噪声 token 付 0.1× 的费用，而干净的 Markdown 不仅缓存便宜，也让模型生成质量更稳定。

## 上下文累积层：历史轮次的处理策略

**问题界定。** 第 1 轮产生的 tool result，到了第 30 轮还在 context 中，每一轮都被重新 prefill 一次。随着会话延长，**老内容的反复支付**构成 Agent 系统中增长最快的成本项——每轮新增的 2K token，到了第 N 轮已经被付了 (N-t+1) 次的钱。这是为什么"当下"层的优化（rtk、defuddle、markitdown）有放大效应：节省一个 token 不只是节省一次，而是节省 (N-t+1) 次。

**介入窗口。** 这一层的介入点几乎全部位于 **Agent 框架内部**——具体是 message list 的构造逻辑。外部工具难以触及，决定权在框架的上下文管理策略里。装外部工具基本帮不上忙，**用户能做的不是装工具，而是用对策略**。

三种主流策略：

**滑动窗口截断。** 当 context 占用超过阈值（通常为模型上限的 80%），按时间顺序删除最早的轮次，直至降至安全水位。[Cline](https://github.com/cline/cline)、Claude Code 都内置类似机制。优点是零额外推理开销，缺点是早期信息直接丢失——如果第 1 轮的设计决定在第 30 轮还需要被引用，滑动窗口救不了你。

**主动 compact。** 触发一次 LLM 调用，将前 N 轮压缩为一段摘要替换原文。Claude Code 的 `/compact` 即此类。这是一笔零和交易——花一次 LLM call 换取后续每一轮的持续节省。盈亏点取决于会话还要走多远：剩 5 轮可能不值，剩 30 轮一定值。

**Subagent 隔离。** 这是结构上最优雅的方案。它本质上不属于"压缩历史"，而是让某些上下文**从一开始就不进入主 Agent**——子任务交给 subagent 完成，原始过程留在它自己的 context 内自生自灭，主 Agent 只接收一段返回结论。这种做法把"上下文管理"问题转化为"任务划分"问题。代价是每个 subagent 都要重新承担系统提示词的固定开销，所以它适合那种"结论简短、过程复杂"的子任务（典型如代码搜索、文件分析、独立验证）。

**关键论点。** 这一层用户能做的不是装工具，而是**理解框架自带的截断行为、合理使用 compact、在长任务中显式 spawn subagent**。Claude Code 的用户最容易踩的坑，是把所有任务都堆在一个主 session 里反复 `/compact`，而不是从一开始就把可独立的子任务分流到 subagent。前者是在治标，后者才是分而治之。

## 固定开销层：可复用部分的缓存机制

**问题界定。** Agent 的 system prompt 与 tool definitions 通常占 8-15K token——具体到 Claude Code，反编译的社区数据显示约 12K。它们在整个会话内不发生变化，但在每一轮请求中都被完整传输并重新 prefill。这部分内容是 Agent 系统中**最可预测、最该被复用**的成本来源。

**介入窗口。** 模型层。三大厂商均已提供 prompt caching 能力，将不变的前缀按缓存价计费——Anthropic 0.1× 读，OpenAI 0.5× 读，Google 类似量级。

**关键论点。** 这一层不依赖任何外部工具，依靠的是：

- **prompt 结构纪律**——静态内容置前、动态内容置后，避免在 system prompt 里内嵌时间戳、随机 ID 等会破坏前缀稳定性的字段；
- **厂商能力对齐**——选择支持 prompt caching 的模型，必要时显式声明 cache breakpoint；
- **Agent 框架配合**——确认框架在拼接 message 时不会无意打乱前缀（比如随机化工具顺序、把动态内容插入 system 段中部）。

**与已有讨论的关系。** 详见 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/)。本节不重复机制，只强调它在 Agent 场景下的特殊意义——**Agent 是 prompt caching 收益最大的应用形态**，因为它的固定开销占比远高于普通对话。下文的成本测算会量化这一点。

## 一个建模估算：钱具体花在哪里

至此四个层次已经讨论完。但具体到比例和金额，还需要一个量化估算。

**说明。** 以下数字基于"中等强度 coding 任务"的建模，参数取自社区对 Claude Code system prompt 反编译的公开数据以及对常见 tool 输出的经验估计。**不同任务形态会显著改变这个分布**——重读取场景（如 RAG agent）的 tool_result 占比会更高，纯写代码场景（如 Codegen）的 assistant 输出占比会更高。但**固定开销作为大头**这一结构性特征基本不变。

**参数设定：**

| 参数 | 值 | 说明 |
|------|-----|------|
| system + tools | 12K token | 反编译数据估值 |
| 每轮 user 输入 | 0.2K token | 经验值 |
| 每轮 assistant 输出（含 tool_use） | 0.8K token | 经验值，含 text + tool_use JSON |
| 每轮 tool_result | 1.5K token | Read/Bash/Grep 混合场景 |
| 总轮数 N | 10 | 假设 |

**第 t 轮 prefill 量：**

```
prefill(t) = 12K + (t-1) × (0.2 + 0.8 + 1.5)K
           = 12K + (t-1) × 2.5K
```

**10 轮总 prefill：**

```
Σ prefill(t) for t=1..10
= 10 × 12K + 2.5K × (0+1+2+...+9)
= 120K + 2.5K × 45
= 120K + 112.5K
= 232.5K token
```

**Decode 总量：** 10 × 0.8K = 8K token。

**各桶占总 token 量（≈ 240.5K）的比例：**

| 桶 | token | 占比 |
|------|--------|------|
| 固定开销（system + tools，10 轮重复） | 120K | **49.9%** |
| 历史 tool_result 累积 | 67.5K | 28.1% |
| 历史 assistant 累积 | 36K | 15.0% |
| 历史 user 累积 | 9K | 3.7% |
| 模型 decode 输出 | 8K | 3.3% |

**关键观察。** 固定开销占了近一半——这是 Agent 系统区别于普通对话的最大特征。普通对话的 system prompt 可能只有 200 token，所以固定开销几乎可以忽略；但 Agent 因为带着十几个工具定义，system + tools 会一直保持在 10K 以上的量级。**Prompt Caching 在 Agent 场景的收益由此而来**。

## 用 Claude Opus 4.7 的实际价目算一遍

[Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/pricing) 的官方定价（2026 年 5 月）：

| 项目 | 单价 |
|------|------|
| Base input | \$5 / MTok |
| 5m cache write | \$6.25 / MTok（1.25×） |
| 1h cache write | \$10 / MTok（2×） |
| Cache read | \$0.50 / MTok（0.1×） |
| Output | \$25 / MTok |

### 不开 Prompt Caching

```
Prefill: 232.5K × $5/MTok      = $1.1625
Decode:  8K     × $25/MTok     = $0.2000
─────────────────────────────────────────
Total:                         ≈ $1.36
```

Prefill 占总成本 85%，decode 占 15%。**钱主要花在"读"上，不在"写"上**——和 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 里讲的输入输出非对称性一致，只是 Agent 场景把这个非对称性放得更大。

### 开启 Prompt Caching（5m 自动缓存）

每次 model invocation，新增的内容会被写入缓存，下一次 invocation 时前面所有内容都是 cache hit。

```
prefix(t)   = 12K + (t-1) × 2.5K        本轮 prefill 总长度
cache_read  = prefix(t-1)               上一轮的 prefix 全部命中
cache_write = prefix(t) - prefix(t-1)   每轮新增的 delta
```

10 轮累加：

```
总 cache_write = 12K + 9 × 2.5K = 34.5K
总 cache_read  = 0 + 12K + 14.5K + 17K + 19.5K + 22K
                + 24.5K + 27K + 29.5K + 32K = 198K
```

成本：

```
Cache write: 34.5K × $6.25/MTok = $0.2156
Cache read:  198K  × $0.50/MTok = $0.0990
Decode:      8K    × $25/MTok   = $0.2000
─────────────────────────────────────────
Total:                          ≈ $0.51
```

### 对比

| 项目 | 无缓存 | 有缓存 | 节省 |
|------|--------|--------|------|
| 输入侧 | \$1.1625 | \$0.3146 | **−73%** |
| 输出侧 | \$0.2000 | \$0.2000 | 0% |
| **总计** | **\$1.36** | **\$0.51** | **−62%** |

10 轮会话，输入侧节省 73%，总成本节省 62%。Anthropic 官方宣传的"up to 90% savings on input"在这里没有完全兑现，原因是会话还不够长，cache write 的固定成本没被充分摊薄。

把模型推到 30 轮和 50 轮：

| 会话长度 | 无缓存输入费 | 有缓存输入费 | 输入节省 | 总成本节省 |
|----------|--------------|--------------|----------|------------|
| 10 轮 | \$1.16 | \$0.31 | 73% | 62% |
| 30 轮 | \$7.24 | \$1.21 | **83%** | 76% |
| 50 轮 | \$18.31 | \$2.60 | **86%** | 79% |

50 轮时输入侧节省 86%，已经接近官方口径。**Prompt Caching 的收益是会话长度的单调函数**——会话越长，固定开销和老历史被反复 prefill 的次数越多，缓存价值越大。

值得单独提的几点：

**Decode 成本几乎不变。** Prompt Caching 只影响输入侧，所以 8K 输出 × \$25 = \$0.20 这一块怎么都省不掉。Output 单价是 input 的 5 倍，但 Agent 任务里 output 量远小于 input 量，所以总成本仍然由 input 主导——这也是为什么 Agent 优化的重心一直在"读"侧。

**Cache write 不是免费的。** 1.25× 的写入费意味着，如果某段内容写入后只被读 1 次就过期，反而比不缓存更贵（写 1.25 + 读 0.1 = 1.35 vs 直接 input 1.0）。盈亏点：5m cache 至少要被读 2 次才回本（写 1.25 + 读 0.2 = 1.45 vs 2.0）。Agent 场景每轮都命中，远高于盈亏点，所以始终划算。

**真正的省钱来自"老历史的反复读"。** 系统 + 工具固定开销虽然占 50%，但只构成一笔固定的 cache write；真正爆发式节省的是历史累积——每轮新增 2.5K 写入一次，但接下来所有轮次都按 0.1× 读取。**节省总量近似与会话轮数的平方成正比**，这是为什么长 session 收益增长这么快。

**Opus 4.7 的 tokenizer 变化要注意。** 官方文档明确写了 Opus 4.7 用了新 tokenizer，"may use up to 35% more tokens for the same fixed text"。也就是说同一段代码，Opus 4.7 算出的 token 数比 4.5/4.6 多 35%。账单层面这是不能忽略的成本因素，从 4.6 升级到 4.7 时直观感受可能是"价格没变但账单涨了"。

## 如何估算自己 Agent 的成本结构

上面的数字是建模估算，不是实测。要拿到自己 Agent 的真实数据，可以按下面的流程跑一次：

1. **选定可控任务**——比如"用 Claude Code 实现一个 FastAPI hello world，包含路由、单元测试、README"。任务要能稳定产生 Read、Write、Bash 等典型 tool call。
2. **开启 token 日志**——Claude Code 直接用 `/cost` 看 session 累计；用 API 的话，每次请求保存完整 messages 列表和 `response.usage` 字段。
3. **定义分桶口径**——每次 model invocation 的 input tokens 按来源分成六类：`system_static`、`tools_static`、`history_user`、`history_assistant`、`history_tool_result`、`current`。
4. **测量方式**——`system_static` 和 `tools_static` 用 Anthropic 的 `count_tokens` API 单独算（整个 session 不变）；历史三桶从 messages 列表中按 role 拆出后逐个跑 token counter；`current` 是本轮新加入的最后一条 message。
5. **累加 + 算占比**——跑 10-30 轮后，把每一轮六个桶的数字累加，算各桶占总 prefill 的百分比，与上面的建模值对照。

每一步都用厂商提供的工具，不用拍脑袋。如果你的实测分布和上面建模差异很大，多半是任务形态的偏向——大文件读取多则 tool_result 偏高，纯代码生成则 assistant 偏高。结构性结论（固定开销占大头、历史累积是放大器）应当稳定。

## 分层即决策

四个层次对应四类介入手段——工具侧（rtk）、数据侧（defuddle、markitdown）、框架侧（截断、compact、subagent）、机制侧（prompt caching）。它们不可互相替代，**理解一个工具属于哪一层，是判断它是否解决你问题的前提**。

ROI 在层与层之间极不均匀：

- **Prompt caching** 几乎零成本，对 Agent 收益最大，应当作为基线先行启用——上面的测算显示一个 10 轮会话能省 62%，30 轮会话能省 76%。
- **数据入口层**的清洗收益稳定可预期，工程链路也轻——defuddle 和 markitdown 都是命令行工具，集成成本低。
- **工具输出层**依赖场景，主要在 coding agent 价值显著——rtk 的目标群体是重 CLI 的 Agent 框架开发者，普通使用者用处有限。
- **上下文累积层**的策略选择最复杂，需要结合任务长度、保真要求权衡——subagent 比 compact 优雅，但要求任务能被合理切分。

**优化次序**：先做免费且高收益的（prompt caching、数据入口清洗），再考虑场景特定的（工具输出压缩），最后处理需要架构层介入的（上下文管理策略）。这是一条由廉到贵、由易到难的路径，也是 Agent 工程最朴素的成本规约。

呼应一下两篇相关文章。本文讨论的是"读"侧——输入 token 的成本结构与减法路径；之前 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 是"读"侧的物理机制；[Test-Time Compute：让模型在回答之前先想一想](/posts/test-time-compute/) 是"写"侧的算力经济学。三者合起来，构成一次 Agent 推理成本的完整地图——读侧有结构有缓存，写侧有预算有强度，每一笔花销都有去向。

Agent 的成本不是一个数字，是一张地图。读懂这张地图，比省掉任何单一处都更值钱。

## 参考资料

### 工具仓库

- [rtk](https://github.com/rtk-ai/rtk) — Rust 编写的 CLI 输出压缩代理，针对 Agent 场景做规则改写
- [defuddle](https://github.com/kepano/defuddle) — TypeScript 网页正文抽取工具，Readability 的现代替代
- [markitdown](https://github.com/microsoft/markitdown) — Microsoft 出品的异构文档转 Markdown 工具
- [cline](https://github.com/cline/cline) — 开源 coding agent，内置滑动窗口与上下文管理

### 厂商文档

- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — Opus 4.7 / Sonnet 4.6 / Haiku 4.5 完整定价表与 prompt caching 倍率说明
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — Anthropic 的 cache_control 接口与最佳实践
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code) — Claude Code 官方文档，包含 `/compact`、`/cost` 等命令

### 相关阅读

- [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) — KV Cache 到 Prompt Cache 的物理基础与三家厂商设计哲学
- [Test-Time Compute：让模型在回答之前先想一想](/posts/test-time-compute/) — 推理时算力扩展的学术源头与工业实现
