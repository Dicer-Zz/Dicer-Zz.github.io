---
title: "Agent 的钱花在哪里：一次推理的四层成本拆解"
published: 2026-05-26
description: "用了几天 Claude Code，账单比你想象的高？把一次 Agent 推理的 token 消耗拆开看会发现，钱并没有花在你以为的地方。这篇文章用四层结构讲清楚 Agent 的成本来自哪里、能从哪里省、以及具体能省多少。"
image: "/gallery/cover/agent-cost-structure.png"
tags: ["LLM", "Agent", "推理优化", "成本", "Prompt Caching"]
category: "技术"
draft: false
---

## 账单上那条最大的开销，你没看见

打开 Claude Code 跑了一个项目，跑了几个小时，结束后顺手敲一句 `/cost`，看到一个让人皱眉的数字。

你回想了一下：用户输入也就几条指令，加起来不到 1000 字；模型最后写出的代码也就几百行。怎么就花了这么多钱？

把这次会话的 token 消耗按来源拆开看，结果会让你意外——你输入的字 + 模型生成的字，加起来可能不到总消耗的 20%。剩下 80% 是一些"你压根没注意"的东西：

- 每一轮都要重新发一遍的 system prompt（足足 12K token，接近一篇万字长文的体量）
- 每次调工具产生的中间输出（一份 `git diff` 可能几千 token，但你只想看最后那个文件改了哪里）
- 一篇被塞进去的网页（80% 是导航栏和广告，真正有用的文字不到五分之一）
- 老轮次的对话和工具结果（第 1 轮的内容到第 30 轮还在 context 里，每一轮都被重新读一次、付一次钱）

这些内容很少出现在 prompt engineering 的教程里，也不在你写代码时关心的范围里。但它们才是账单的主角。

本文要做的事情就是把这张账单拆开看清楚——一次 Agent 推理的 token 都花在哪四个地方、每一处能不能省、以及具体能省多少。文末会用 Claude Opus 4.7 的官方价目算清楚每一层值多少钱。

## 先把账单分成四份

一次 Agent 推理的 token 消耗，可以按来源分成四个独立的层次：

| 层次 | 钱花在哪 | 时间特性 | 典型构成 |
|------|----------|----------|----------|
| 工具输出层 | 当前轮工具返回的内容 | 当下产生 | shell 命令的原始输出、API 返回的完整数据 |
| 数据入口层 | 外部塞进来的内容 | 当下产生 | 网页 HTML、PDF/PPT 等文档 |
| 上下文累积层 | 老轮次还在 context 里 | 跨轮重复 | 前面所有轮次的对话和工具结果 |
| 固定开销层 | 每轮都要重传的部分 | 跨轮重复 | system prompt、工具定义 |

四个层次的内容最终都要走一遍 prefill（模型把输入读一遍的过程）才能让模型回应。它们的"产生时机"和"能不能避开"完全不同——这就是为什么省钱要分层考虑。

每一层的工具和方法是不互通的：rtk 救不了 system prompt，prompt caching 救不了一份没洗的网页，subagent 救不了一条 30K 的命令输出。**第一步就是别把不同层的工具混在一起谈**。

下面四节分别看每一层。

## 工具输出层：result 一旦进 context，钱就花了

先讲一个具体场景。

你让 Agent 用 `git log` 看看最近这个仓库都改了什么。`git log` 老老实实把最近 200 个 commit 全打印出来，5K token。Agent 拿到这堆东西，看了一眼，回你一句"最近主要是修了几个 bug 和加了一个新功能"。

你掏的钱里，那 5K token 的 `git log` 输出**已经走完整个 prefill 了**。也就是说哪怕 Agent 只看一眼就忽略了它，模型也按 5K token 收了你钱。

这就是工具输出层的麻烦：**只要 result 进入了 message 列表，钱就已经花了**。下游再做什么处理都救不回这一轮——压缩、总结、丢弃都没用，因为这都发生在已经付费之后。

唯一有效的省钱时机，是在 result 从工具传到 Agent 的那条路径上**先做一道处理**。比如改写工具的输出格式，让它别返回那么多东西。

[rtk](https://github.com/rtk-ai/rtk) 就是干这件事的。它在 shell 和 Agent 之间加了一层规则压缩——`git status` 提取关键变更、`pytest` 只保留失败用例、`grep` 按文件分组聚合。本质是用"懂这条命令长什么样"的领域知识，对 result 做一次主动剪枝。

但 rtk 有它的边界。它针对的是 CLI 工具，所以受益最大的是重命令行的 coding agent。如果你做的是客服 agent、RAG agent，工具调用本身就不是 CLI，rtk 用不上。这种场景下"压缩工具输出"得靠工具自己——返回字段精简一点、内置分页、提供按需细化的接口。**让工具一开始就只返回 Agent 需要的，永远比事后压缩优雅**。但现实是工具设计者很少考虑 Agent 场景，所以才有 rtk 这种"中间层"的位置。

## 数据入口层：网页和 PDF 喂进去之前先洗一下

第二个场景：Agent 抓了一篇博客让你总结。

用最朴素的办法，直接把网页 HTML 丢给模型——80K token 进 context，模型读完给你 200 字摘要。但这 80K 里有什么？导航栏、侧边栏、广告位、推荐文章、cookie 提示、JavaScript 占位符、各种 div 嵌套带的属性。真正的正文部分，可能不到 15K。

也就是说你为 65K **完全没用的 token** 付了钱。这部分内容噪声特别大——它们提供的信息量几乎为零，但 token 计费一视同仁。

PDF 更夸张。一份带版式信息的 PDF 直接转 base64 喂进去，token 数会爆到惊人，而且模型还读得磕磕绊绊。

这一层的省钱思路和上一层不太一样。工具输出层的成本是 Agent 自己产生的（它调了 `git log` 才有的输出），所以介入只能在那条路径上。但数据入口层处理的是**外部内容**，它在到达 Agent 之前就可以被预处理——可以在抓的时候就洗、可以离线批量洗、也可以由 Agent 临时洗。介入窗口长得多。

两个工具值得一提：

[defuddle](https://github.com/kepano/defuddle) 是网页正文抽取工具，剥离装饰元素只留主体内容，输出干净的 Markdown。设计思路对标浏览器的 Reader 模式（Mozilla Readability），但更针对 LLM 输入做了优化——保留代码块结构、剔除 cookie 提示、不输出大段无意义的 HTML 属性。维护者是 Obsidian 的联合创始人 Steph Ango，工程上稳定。

[markitdown](https://github.com/microsoft/markitdown) 是 Microsoft 出品的异构文档转换工具——PDF、Office 全家桶、图像 OCR、音频转写，统一翻译成 Markdown。它的价值不光在压缩，更在**格式归一**：把模型不熟悉的格式翻译成它熟悉的格式。同样的信息量，Markdown 比原始 PDF 文本被理解得更准、生成得更稳。

这一层和 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 那篇有个有趣的关系。那篇讲的是"输入侧的减法"——能不进 context 的就不要进。本层是这个减法的**前置**：先洗净再缓存。一份脏 PDF 就算缓存了，每次读取也是在为大量噪声 token 付 0.1 倍的费用——便宜但仍是浪费。先洗再缓存，才是组合出最优解。

## 上下文累积层：老内容会被反复读，反复付钱

第三个场景，最容易被忽略：

Agent 跑到第 30 轮，需要回答一个新问题。

模型怎么回答？它需要看完整的对话历史——从第 1 轮的用户输入、第 1 轮的工具调用、第 1 轮返回的 5K 数据，一直到第 29 轮的所有内容，然后再加上第 30 轮的新问题。

也就是说，**第 1 轮产生的那 5K，你已经付过 30 次钱了**。

这是 Agent 系统里增长最快的一笔账。每轮新增看起来不多——平均也就 2-3K——但累积是平方级的：第 t 轮新增的 token 会被付 (N-t+1) 次，N 越大，老内容的重复支付越爆炸。

这一层的省钱方法和前两层完全不同。前两层靠外部工具，这一层**几乎全部依赖 Agent 框架自己的策略**。装外部工具基本帮不上忙，决定权在框架的上下文管理逻辑里。用户能做的不是"装对工具"，是"用对策略"。

主流策略有三种：

**滑动窗口截断**。当 context 占用超过阈值（一般是模型上限的 80%），就从最早的轮次开始删，删到剩下 60% 为止。Cline 和 Claude Code 都内置了类似机制。这个方法零额外推理开销，简单粗暴。代价是早期信息真的丢了——如果第 1 轮做的设计决策在第 30 轮还要被引用，滑动窗口救不了你。

**主动 compact**。触发一次额外的 LLM 调用，把前 N 轮压缩成一段摘要，替换掉原文。Claude Code 的 `/compact` 就是这种。这是一笔零和买卖：花一次 LLM call 换后续每一轮都更轻盈。值不值看会话还要走多远——剩 5 轮可能不值，剩 30 轮一定值。

**Subagent 隔离**。这个最优雅。它本质上不属于"压缩历史"，而是**让某些上下文从一开始就不进入主 Agent**。子任务交给一个独立的 subagent 去做，原始的那一坨过程留在 subagent 自己的 context 里自生自灭，主 Agent 只接收一段返回的结论。

举个例子：你让 Agent "搜一下这个项目里所有用到 Redis 的地方"。直接做的话，主 Agent 要 grep 出几十个文件、Read 进十几个，工具结果一堆累积在 context 里。换成 subagent 的做法是——主 Agent 派一个 subagent 去做这件事，subagent 来回 grep + Read 折腾半天，最后只回报一句"主要在 cache.py、queue.py、session.py 三个文件用了"。整个搜索过程对主 Agent 不可见，主 Agent 只承担那一行结论的成本。

这种做法把"上下文管理"问题转化成了"任务划分"问题。代价是每个 subagent 都要重新承担系统提示词的固定开销，所以适合"结论简短、过程复杂"的子任务——典型如代码搜索、文件分析、独立验证。

Claude Code 用户最容易踩的一个坑，是把所有任务都堆在一个主 session 里反复 `/compact`。这是治标。从一开始就把可独立的子任务分流到 subagent，才是分而治之。

## 固定开销层：那段每次都重复的开头

最后一层最简单，但收益可能最大。

Agent 的 system prompt 加上工具定义，通常占 8-15K token。具体到 Claude Code，社区反编译的数据是约 12K。这部分内容**整个会话内不变**，但每一轮请求都被完整重传、重新 prefill 一遍。

Agent 跑 30 轮，那 12K 就被 prefill 了 30 次。**每一次都在为同样的内容付同样的钱**。

这层的解法叫 [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)——简单说，就是让模型给那段不变的开头打个标记缓存起来。下次请求来的时候，不用重新算了，直接读缓存就行。Anthropic 的缓存读取价是基础输入价的 0.1 倍，相当于打了一折。OpenAI、Google 都有类似机制，倍率略不同。

这一层的好处是**不依赖任何外部工具**。要做的就三件事：

第一，**prompt 结构纪律**。静态内容放前面、动态内容放后面，避免在 system prompt 里塞时间戳、随机 ID 这种破坏前缀稳定性的字段。前缀只要变一个字符，缓存就废了。

第二，**确认厂商和模型支持**。三家头部厂商都已实现，但小模型、老版本、第三方接口可能没有。

第三，**确认 Agent 框架配合**。框架在拼接 message 时不能无意打乱前缀（比如随机化工具顺序、把动态内容插入 system 中部）。Claude Code 默认是支持的，但如果你自己写 Agent，需要自己保证。

具体的机制和工程细节，[Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 那篇讲得很细，这里不重复。但要强调一句——**Agent 是 prompt caching 收益最大的应用形态**，因为它的固定开销占比远超普通对话。下面的测算会量化这一点。

## 用数字说话：这四层各占多少钱

到这里四层都讲完了。但具体到比例，还得算一笔账。

下面这套估算基于"中等强度 coding 任务"建模——参数取自社区对 Claude Code system prompt 反编译的公开数据，以及对常见 tool 输出的经验估计。**不同任务形态会改变分布**——重读取场景的 tool_result 会更高、纯写代码场景的 assistant 输出会更高，但"固定开销是大头"这个结构性结论基本不变。

参数：

| 项目 | 取值 | 说明 |
|------|------|------|
| system + tools | 12K token | Claude Code 反编译数据 |
| 每轮 user 输入 | 0.2K | 经验值 |
| 每轮 assistant 输出（含 tool_use） | 0.8K | text + 工具调用的 JSON |
| 每轮 tool_result | 1.5K | Read/Bash/Grep 混合场景 |
| 总轮数 N | 10 | 假设 |

每一轮的 prefill 量等于：12K（固定开销）+ 之前所有轮次累积的 (user + assistant + tool_result)。

```
prefill(t) = 12K + (t-1) × 2.5K
```

把 10 轮加起来：

```
Σ prefill(t) for t=1..10
= 10 × 12K + 2.5K × (0+1+2+...+9)
= 120K + 112.5K
= 232.5K token
```

模型输出（decode）= 10 × 0.8K = 8K。

按来源拆开（总量 ≈ 240.5K）：

| 桶 | token | 占比 |
|------|--------|------|
| 固定开销（system + tools 重复 10 轮） | 120K | **49.9%** |
| 历史 tool_result 累积 | 67.5K | 28.1% |
| 历史 assistant 累积 | 36K | 15.0% |
| 历史 user 累积 | 9K | 3.7% |
| 模型 decode 输出 | 8K | 3.3% |

固定开销一项就占了一半。这是 Agent 系统区别于普通对话的最大特征——普通对话的 system prompt 可能只有几百 token，所以固定开销几乎可以忽略；Agent 因为带着十几个工具定义，system + tools 一直保持在 10K 量级。**这是 prompt caching 在 Agent 场景收益巨大的根本原因**。

## 算钱：开缓存能省多少

[Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/pricing) 的官方价目（2026 年 5 月）：

| 项目 | 单价 |
|------|------|
| Base input | \$5 / MTok |
| 5m cache write | \$6.25 / MTok（1.25×） |
| 1h cache write | \$10 / MTok（2×） |
| Cache read | \$0.50 / MTok（0.1×） |
| Output | \$25 / MTok |

**不开缓存的情况：**

```
Prefill: 232.5K × $5/MTok      = $1.1625
Decode:  8K     × $25/MTok     = $0.2000
─────────────────────────────────────────
Total:                         ≈ $1.36
```

注意一个细节：prefill 占了总成本的 85%，decode 只占 15%。**钱主要花在"读"上，不在"写"上**。Output 单价是 input 的 5 倍听起来很贵，但 Agent 任务里 output 的总量远小于 input，所以总成本仍然由 input 主导。这跟 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 里讲的输入输出非对称性是一回事——只是 Agent 场景把这个不对称放得更大。

**开缓存的情况（5 分钟自动缓存）：**

每次新发请求，前一轮的所有内容都已经在缓存里了，只有"本轮新增的部分"需要写进缓存。具体到我们这个模型：

```
prefix(t)   = 12K + (t-1) × 2.5K
cache_read  = prefix(t-1)              (上一轮的内容，全部命中)
cache_write = 本轮新增 = 2.5K           (除了第 1 轮要写 12K 的初始 prompt)
```

10 轮累计：

```
总 cache_write = 12K + 9 × 2.5K = 34.5K
总 cache_read  = 0 + 12K + 14.5K + ... + 32K = 198K
（验证：34.5K + 198K = 232.5K ✓）
```

成本：

```
Cache write: 34.5K × $6.25/MTok = $0.2156
Cache read:  198K  × $0.50/MTok = $0.0990
Decode:      8K    × $25/MTok   = $0.2000
─────────────────────────────────────────
Total:                          ≈ $0.51
```

**对比一下：**

| 项目 | 无缓存 | 有缓存 | 节省 |
|------|--------|--------|------|
| 输入侧 | \$1.1625 | \$0.3146 | **−73%** |
| 输出侧 | \$0.2000 | \$0.2000 | 0% |
| **总计** | **\$1.36** | **\$0.51** | **−62%** |

10 轮就省了 62%。Anthropic 官方宣传的"输入侧节省高达 90%"，在这里看到的是 73%，没完全兑现——因为会话还不够长，cache write 的固定成本还没被充分摊薄。

把模型推到更长的会话：

| 会话长度 | 无缓存输入费 | 有缓存输入费 | 输入节省 | 总成本节省 |
|----------|--------------|--------------|----------|------------|
| 10 轮 | \$1.16 | \$0.31 | 73% | 62% |
| 30 轮 | \$7.24 | \$1.21 | **83%** | 76% |
| 50 轮 | \$18.31 | \$2.60 | **86%** | 79% |

50 轮时输入侧节省 86%，已经接近官方口径。**Prompt Caching 的收益是会话长度的单调函数**——会话越长，固定开销和老历史被反复读取的次数越多，缓存的价值越大。

几个值得单独提的观察：

**Cache write 不是免费的**。1.25 倍的写入费意味着，如果某段内容写入后只被读 1 次就过期，反而比不缓存还贵（写 1.25 + 读 0.1 = 1.35，不如直接付 1.0）。盈亏点是被读 2 次：1.25 + 0.2 = 1.45 vs 直接付 2.0。Agent 场景每轮都命中，远高于盈亏点，所以始终划算。

**真正爆发式的省钱来自"老历史的反复读"**。固定开销虽然占比 50%，但只构成一笔固定的写入费；真正赚的是历史累积——每轮新增 2.5K 写入一次，但接下来所有轮次都按 0.1 倍读取。**节省总量近似与会话轮数的平方成正比**。

**Opus 4.7 的 tokenizer 换了**。官方文档明确写了 Opus 4.7 用了新 tokenizer，"may use up to 35% more tokens for the same fixed text"。也就是同一段代码 Opus 4.7 算出的 token 数比 4.5/4.6 多 35%。账单层面不能忽略——从 4.6 升级到 4.7 的直观感受可能是"价格没变但账单涨了"。

## 想自己测一遍？

上面的数字是建模值，不是实测。要拿到自己 Agent 的真实分布，可以这样跑一次：

1. **选一个可控任务**——比如"用 Claude Code 写一个 FastAPI hello world，包含路由、单元测试、README"。任务要能稳定触发 Read、Write、Bash 这些典型 tool call。
2. **开 token 日志**——Claude Code 直接用 `/cost` 看 session 累计；如果是自己调 API，每次请求保存完整 messages 列表和 `response.usage` 字段。
3. **分桶**——每次 model invocation 的输入按来源分成六类：`system_static`、`tools_static`、`history_user`、`history_assistant`、`history_tool_result`、`current`。
4. **测量**——`system_static` 和 `tools_static` 用 Anthropic 的 `count_tokens` API 单独算（整个 session 不变）；历史三桶从 messages 列表中按 role 拆出后逐个跑 token counter；`current` 是本轮新加入的最后一条 message。
5. **累加算占比**——跑 10-30 轮后，把每一轮六个桶的数字累加，算各桶占总 prefill 的百分比，与上面的建模值对照。

如果你的实测和建模差异很大，多半是任务形态偏向——大文件读取多则 tool_result 偏高，纯代码生成则 assistant 偏高。但结构性结论（固定开销占大头、历史累积是放大器）应当稳定。

## 钱到底怎么省：先做免费的，再做困难的

四个层次对应四种省钱手段：工具侧（rtk）、数据侧（defuddle、markitdown）、框架侧（截断、compact、subagent）、机制侧（prompt caching）。它们不可互相替代，**理解一个工具属于哪一层，是判断它是否解决你问题的前提**。

各层的 ROI 极不均匀：

- **Prompt caching** 几乎零成本、收益最大——10 轮会话省 62%，30 轮会话省 76%。这是免费的钱，应当作为基线先开。
- **数据入口层**收益稳定可预期，工程链路也轻——defuddle 和 markitdown 都是命令行工具，集成成本极低。
- **工具输出层**依赖场景，主要在 coding agent 价值显著——rtk 的目标群体是重 CLI 的 Agent 框架开发者，普通使用者用处有限。
- **上下文累积层**的策略选择最复杂，需要结合任务长度和保真要求权衡——subagent 比 compact 优雅，但要求任务能被合理切分。

**优化的次序应该是这样的**：先做免费且高收益的（prompt caching、数据入口清洗），再考虑场景特定的（工具输出压缩），最后处理需要架构层介入的（上下文管理策略）。这是一条由廉到贵、由易到难的路径，也是 Agent 工程最朴素的成本规约。

呼应一下两篇相关文章。本文讲的是"读"侧——输入 token 的成本结构与减法路径；[Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 是"读"侧的物理机制；[Test-Time Compute：让模型在回答之前先想一想](/posts/test-time-compute/) 是"写"侧的算力经济学。三篇合起来，构成一次 Agent 推理成本的完整地图——读侧有结构有缓存，写侧有预算有强度，每一笔花销都有去向。

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
