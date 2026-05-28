---
title: "用了一天 Claude Code，20 美元花在哪里"
published: 2026-05-26
description: "用了一天 Claude Code，账单比你想象的高？把 token 消耗按来源拆开看，你输入的字 + 模型生成的字加起来不到 20%，剩下 80% 是你压根没注意到的东西。这篇文章拆清楚钱花在哪四个地方、每处能不能省、以及具体能省多少。"
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

本文要做的事情就是把这张账单拆开看清楚——一次 Coding Agent 推理的 token 都花在哪四个地方、每一处能不能省、以及具体能省多少。文末会用 Claude Opus 4.7 的官方价目算清楚每一层值多少钱。

## 钱去了四个地方

一次 Coding Agent 推理的 token 消耗，可以按来源分成四个独立的层次：

| 层次 | 钱花在哪 | 时间特性 | 典型构成 |
|------|----------|----------|----------|
| 工具输出层 | 当前轮工具返回的内容 | 当下产生 | shell 命令的原始输出、API 返回的完整数据 |
| 数据入口层 | 外部塞进来的内容 | 当下产生 | 网页 HTML、PDF/PPT 等文档 |
| 上下文累积层 | 老轮次还在 context 里 | 跨轮重复 | 前面所有轮次的对话和工具结果 |
| 固定开销层 | 每轮都要重传的部分 | 跨轮重复 | system prompt、工具定义 |

四个层次的内容最终都要走一遍 prefill（模型把输入读一遍的过程）才能让模型回应。它们的"产生时机"和"能不能避开"完全不同——这就是为什么省钱要分层考虑。

每一层的工具和方法是不互通的：rtk 救不了 system prompt，prompt caching 救不了一份没洗的网页，subagent 救不了一条 30K 的命令输出。**第一步就是别把不同层的工具混在一起谈**。

下面四节分别看每一层。

## 工具说了一堆，Agent 只看了一眼

先讲一个具体场景。

你让 Agent 用 `git log` 看看最近这个仓库都改了什么。`git log` 老老实实把最近 200 个 commit 全打印出来，5K token。Agent 拿到这堆东西，看了一眼，回你一句"最近主要是修了几个 bug 和加了一个新功能"。

你掏的钱里，那 5K token 的 `git log` 输出**已经走完整个 prefill 了**。也就是说哪怕 Agent 只看一眼就忽略了它，模型也按 5K token 收了你钱。

这就是工具输出层的麻烦：**只要 result 进入了 message 列表，钱就已经花了**。下游再做什么处理都救不回这一轮——压缩、总结、丢弃都没用，因为这都发生在已经付费之后。

唯一有效的省钱时机，是在 result 从工具传到 Agent 的那条路径上**先做一道处理**。比如改写工具的输出格式，让它别返回那么多东西。

[rtk](https://github.com/rtk-ai/rtk) 就是干这件事的。它在 shell 和 Agent 之间加了一层规则压缩——`git status` 提取关键变更、`pytest` 只保留失败用例、`grep` 按文件分组聚合。本质是用"懂这条命令长什么样"的领域知识，对 result 做一次主动剪枝。

但 rtk 有它的边界。它针对的是 CLI 工具，所以受益最大的是重命令行的 coding agent。如果你做的是客服 agent、RAG agent，工具调用本身就不是 CLI，rtk 用不上。这种场景下"压缩工具输出"得靠工具自己——返回字段精简一点、内置分页、提供按需细化的接口。**让工具一开始就只返回 Agent 需要的，永远比事后压缩优雅**。但现实是工具设计者很少考虑 Agent 场景，所以才有 rtk 这种"中间层"的位置。

## 一篇网页 80K token，有用的不到五分之一

第二个场景：Agent 抓了一篇博客让你总结。

用最朴素的办法，直接把网页 HTML 丢给模型——80K token 进 context，模型读完给你 200 字摘要。但这 80K 里有什么？导航栏、侧边栏、广告位、推荐文章、cookie 提示、JavaScript 占位符、各种 div 嵌套带的属性。真正的正文部分，可能不到 15K。

也就是说你为 65K **完全没用的 token** 付了钱。这部分内容噪声特别大——它们提供的信息量几乎为零，但 token 计费一视同仁。

PDF 更夸张。一份带版式信息的 PDF 直接转 base64 喂进去，token 数会爆到惊人，而且模型还读得磕磕绊绊。

这一层的省钱思路和上一层不太一样。工具输出层的成本是 Agent 自己产生的（它调了 `git log` 才有的输出），所以介入只能在那条路径上。但数据入口层处理的是**外部内容**，它在到达 Agent 之前就可以被预处理——可以在抓的时候就洗、可以离线批量洗、也可以由 Agent 临时洗。介入窗口长得多。

两个工具值得一提：

[defuddle](https://github.com/kepano/defuddle) 是网页正文抽取工具，剥离装饰元素只留主体内容，输出干净的 Markdown。设计思路对标浏览器的 Reader 模式（Mozilla Readability），但更针对 LLM 输入做了优化——保留代码块结构、剔除 cookie 提示、不输出大段无意义的 HTML 属性。维护者是 Obsidian 的联合创始人 Steph Ango，工程上稳定。

[markitdown](https://github.com/microsoft/markitdown) 是 Microsoft 出品的异构文档转换工具——PDF、Office 全家桶、图像 OCR、音频转写，统一翻译成 Markdown。它的价值不光在压缩，更在**格式归一**：把模型不熟悉的格式翻译成它熟悉的格式。同样的信息量，Markdown 比原始 PDF 文本被理解得更准、生成得更稳。

这一层和 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 那篇有个有趣的关系。那篇讲的是"输入侧的减法"——能不进 context 的就不要进。本层是这个减法的**前置**：先洗净再缓存。一份脏 PDF 就算缓存了，每次读取也是在为大量噪声 token 付 0.1 倍的费用——便宜但仍是浪费。先洗再缓存，才是组合出最优解。

## 第 1 轮说的话，到第 30 轮还在付钱

第三个场景，最容易被忽略：

Agent 跑到第 30 轮，需要回答一个新问题。

模型怎么回答？它需要看完整的对话历史——从第 1 轮的用户输入、第 1 轮的工具调用、第 1 轮返回的 5K 数据，一直到第 29 轮的所有内容，然后再加上第 30 轮的新问题。

也就是说，**第 1 轮产生的那 5K，你已经付过 30 次钱了**。

这是 Coding Agent 里增长最快的一笔账。每轮新增看起来不多——平均也就 2-3K——但累积是平方级的：第 t 轮新增的 token 会被付 (N-t+1) 次，N 越大，老内容的重复支付越爆炸。

**与前两层的关系。** 工具输出层和数据入口层是"当轮产生"的成本，通过源头压缩可以一次性解决；上下文累积层是"跨轮重复"的成本，它的膨胀源于 Agent 框架将历史完整保留的设计决策。但两者并非独立——**前两层的优化会在这一层产生放大收益**。第 t 轮如果用 rtk 压缩了 3K 的 CLI 输出、用 defuddle 去除了 5K 的网页噪声，这省下来的 8K 不只是当轮少付了一次钱，而是在后续每一轮都少付一次——累计节省 8K × (N-t) token 的 prefill 费用。源头做的减法，在这一层被时间放大。

这一层的省钱方法和前两层完全不同。前两层靠外部工具，这一层**几乎全部依赖 Agent 框架自己的策略**。装外部工具基本帮不上忙，决定权在框架的上下文管理逻辑里。用户能做的不是"装对工具"，是"用对策略"。

主流策略有三种：

**滑动窗口截断**。当 context 占用超过阈值（一般是模型上限的 80%），就从最早的轮次开始删，删到剩下 60% 为止。Cline 和 Claude Code 都内置了类似机制。这个方法零额外推理开销，简单粗暴。代价是早期信息真的丢了——如果第 1 轮做的设计决策在第 30 轮还要被引用，滑动窗口救不了你。

**主动 compact**。触发一次额外的 LLM 调用，把前 N 轮压缩成一段摘要，替换掉原文。Claude Code 的 `/compact` 就是这种。这是一笔零和买卖：花一次 LLM call 换后续每一轮都更轻盈。值不值看会话还要走多远——剩 5 轮可能不值，剩 30 轮一定值。

**Subagent 隔离**。这个最优雅。它本质上不属于"压缩历史"，而是**让某些上下文从一开始就不进入主 Agent**。子任务交给一个独立的 subagent 去做，原始的那一坨过程留在 subagent 自己的 context 里自生自灭，主 Agent 只接收一段返回的结论。

举个例子：你让 Agent "搜一下这个项目里所有用到 Redis 的地方"。直接做的话，主 Agent 要 grep 出几十个文件、Read 进十几个，工具结果一堆累积在 context 里。换成 subagent 的做法是——主 Agent 派一个 subagent 去做这件事，subagent 来回 grep + Read 折腾半天，最后只回报一句"主要在 cache.py、queue.py、session.py 三个文件用了"。整个搜索过程对主 Agent 不可见，主 Agent 只承担那一行结论的成本。

Claude Code 目前内置了三个等级的 subagent：**Explore**（用 Haiku 跑，只有只读权限，专干代码搜索）、**Plan**（继承主模型，只读，用于规划前的信息收集）、**General-purpose**（全工具权限，处理复杂的多步骤任务）。注意 Explore 用的是 Haiku——这意味着不但主 Agent 的 context 没被污染，subagent 本身跑的还是便宜模型。一次代码搜索如果在主 session（Opus）里跑完全程要花 \$0.15，派给 Explore（Haiku）可能只花 \$0.01，而主 Agent 只接收几十 token 的结论。

你也可以[自定义 subagent](https://code.claude.com/docs/en/sub-agents)——指定名字、系统提示、允许哪些工具、用哪个模型。比如定义一个 `test-runner` subagent，只有 Bash 和 Read 权限，用 Sonnet 跑。每次主 Agent 想确认测试是否通过，就派它去跑一遍 pytest，主 Agent 只拿到 pass/fail 和失败摘要。整个 pytest 输出（动辄上千行）永远不会出现在主 context 里。

更进一步，Claude Code 还有一个实验功能叫 [Agent Teams](https://code.claude.com/docs/en/agent-teams)（专家团）——多个 Claude Code 实例组成一个团队，各自拥有独立的 context，通过共享任务列表和消息系统协作。一个 session 充当 team lead（组长），其他 session 是 teammate（组员）。每个 teammate 在自己的 context 窗口里独立工作，完成后把结论汇报给 lead。

Agent Teams 比单个 subagent 更激进：subagent 是"主 Agent 派出去干活再收回结论"的一次性代理；Agent Teams 是多个持续运行的独立 Agent，它们之间可以**互相通信、互相质疑**，不需要通过主 Agent 中转。典型用法是让三个 teammate 分别从安全、性能、测试覆盖率三个角度审查同一段代码——三个人各自在自己的 context 里翻文件、推理、写结论，互相看到对方的发现再做补充。最后 lead 只接收三份审查报告的综合摘要。

从成本视角看这件事：

- **单个 subagent** = 一次固定开销（~12K system prompt）+ 自己的过程 token，只返回结论。适合"结论简短、过程复杂"的子任务。
- **Agent Teams** = N 个独立 context 各承担一份固定开销（N × 12K），但彼此之间的过程完全隔离，主 Agent 的 context 极轻。适合"任务可并行、需要多视角"的大型工作。

代价很明确：**每多开一个 subagent / teammate，就多付一份系统提示词的底钱**。所以子任务不能切得太碎——一个只需要 `ls` 一下的任务，不值得为它开一个新 context。经验法则是：**如果子任务的过程 token > 2 × 系统提示词（~24K），分流就是值的**。

Claude Code 用户最容易踩的一个坑，是把所有任务都堆在一个主 session 里反复 `/compact`。这是治标。更好的做法分两步：第一，从任务规划阶段就识别出"结论简短、过程复杂"的子任务，显式分流到 subagent；第二，如果有多个可并行的独立方向（代码审查、竞品调研、多方案验证），考虑开 Agent Teams 让它们各自在独立 context 里跑完再汇总。compact 是止血，subagent 是预防，Agent Teams 是分而治之的极致形态。

## 同一段开场白，念了 30 遍

你用 Claude Code 打开一个项目的时候，第一件事是什么？模型读了 12K token 的内容——system prompt、所有工具定义、权限规则、CLAUDE.md 文件。你什么都还没说，这 12K 就已经被 prefill 了一遍、付了一次钱。

然后你说了第一句话，模型回了你。第二轮开始，这 12K 原封不动地再来一次——因为每次 API 调用都是一次独立的推理，模型不会在两次调用之间记住任何东西，唯一让它"看见历史"的方式就是每次从头传。第三轮又一次。第十轮又一次。**30 轮会话下来，同一段你从未修改过的文本被重复读了 30 遍，每一遍都按全价计费**。

这就是固定开销层的荒谬之处：内容完全不变，但成本线性增长。

解法叫 [Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)。原理不复杂：模型在第一次 prefill 那段不变的前缀时，把计算出来的 KV 状态存下来；后续请求只要前缀没变，就跳过重算，直接读缓存。Anthropic 的缓存读取价是基础输入价的 0.1 倍——也就是 12K 的 system prompt，第一次写入缓存花 1.25 倍，后面 29 次每次只花 0.1 倍。

但这里有一个很多人没意识到的点：**Prompt Caching 命中的不只是 system prompt**。

缓存的判定逻辑是前缀匹配——只要本轮请求的 token 序列和上一轮请求有相同的前缀，这段前缀全部命中缓存。在 Coding Agent 场景里，"前缀"包含什么？system prompt + tools 定义 + 从第 1 轮到第 t-1 轮的完整历史。也就是说，**上一节讲的那些累积历史——只要它们在本轮没有被修改或截断——全部走缓存读取**。每轮请求里真正需要全价 prefill 的，只有"本轮新增的部分"（当前 user 输入 + 上一轮的 assistant 输出 + 上一轮的 tool_result）。

这意味着 Prompt Caching 实际上同时缓解了两层成本：固定开销层（system prompt 反复重传）和上下文累积层（老历史反复读取）。后面的测算会量化这一点——开缓存后，10 轮会话的输入侧成本直接降 73%。

你可能会问：既然每次都要传完整的 message list，为什么不做成"绑定 session id、只发增量"的设计？答案是：**重传的成本不在网络**。200K token 的文本在 JSON 里不过 1-2MB，网络传输可忽略。贵的是模型收到这些 token 后要做的事——每个 token 都要参与 attention 计算，这才是按 token 收钱的原因。Prompt Caching 解决的正是这个计算层面的重复——让已经算过的前缀不用再算一遍。API 形式上保持无状态（便于调度和容错），计算层面做了有状态的缓存复用。

要让缓存生效，需要守住三条纪律：

**第一，前缀稳定性。** 缓存判定是逐 token 比对前缀的。只要前缀中任何一个 token 变了，从那个位置开始往后的缓存全部失效。最常见的破坏方式：在 system prompt 里插一个 `当前时间：2026-05-28 14:32:07`——每一秒都在变，于是 12K 的 system prompt 每轮都要重新写入缓存。正确做法是**把所有动态内容移到消息列表的末尾**，而不是塞进 system prompt。

**第二，确认模型和接口支持。** Anthropic（显式标记缓存段）、OpenAI（全自动前缀匹配）、Google（隐式 + 显式双模式）三家都已支持，但倍率和 TTL 不同。第三方中转接口、老版本 API、以及部分开源模型部署可能没有实现这一层——调之前先确认 `usage` 返回字段里有没有 `cache_read_input_tokens`。

**第三，框架不能无意破坏前缀。** 如果你的 Agent 框架在每次拼 message 列表时随机化了工具定义的顺序，或者把某个动态字段插到了 system prompt 中间，前缀就断了。Claude Code 默认保证了这一点——tools 定义的顺序固定、system prompt 结构不变。但如果你自己写 Agent 框架，需要做一个简单的回归测试：连续两轮请求，对比 token 序列前缀是否一致。不一致就意味着每轮都在做 cache write 而不是 cache read。

一个容易被忽略的反面案例：某些 Agent 框架在 system prompt 末尾追加了 `当前工作目录：/Users/xxx/project` 这类运行时信息。大部分时候目录不变所以没问题——但一旦 agent 执行了 `cd` 或者切了分支，这个字段变了，整段 system prompt 的缓存就废了。Debug 时表现为突然出现一次 `cache_creation_input_tokens` 而非 `cache_read_input_tokens`，账单上是一个不可见的尖刺。

具体的物理机制（KV Cache 复用、前缀哈希、TTL 管理）以及三家厂商的设计哲学对比，在 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 那篇里讲得很细，这里不重复。但要强调一句——**Coding Agent 是 Prompt Caching 收益最大的应用形态**。普通对话的 system prompt 可能只有几百 token，缓存与否差别不大；Coding Agent 的固定开销占到总 prefill 的 50%，再加上稳定的历史前缀，缓存命中率天然就高。下面的测算会用具体数字证明这一点。

## 掏计算器：一个 Session 到底花多少钱

前面四层都是定性分析。现在用具体数字算一遍——一个中等强度的 coding session，开缓存和不开缓存，分别要花多少钱。

**建模参数：**

| 项目 | 取值 | 来源 |
|------|------|------|
| system + tools | 12K token | Claude Code 社区反编译数据 |
| 每轮 user 输入 | 0.2K | 经验值（一两句指令） |
| 每轮 assistant 输出 | 0.8K | text + tool_use JSON |
| 每轮 tool_result | 1.5K | Read/Bash/Grep 混合场景 |
| 每轮新增合计 | 2.5K | user + assistant + tool_result |

这组参数对应的场景是"中等强度 coding"——不是纯聊天（那样 tool_result 为零），也不是重文件读取（那样 tool_result 可能 4-8K）。后面会讨论参数变化对结论的影响。

**[Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/pricing) 费率（2026 年 5 月）：**

| 项目 | 单价 |
|------|------|
| Input | \$5 / MTok |
| Cache write（5min） | \$6.25 / MTok（1.25×） |
| Cache read | \$0.50 / MTok（0.1×） |
| Output | \$25 / MTok |

### 每轮要 prefill 多少 token

第 t 轮的输入 = 固定开销 + 前面所有轮次的历史：

```
prefill(t) = 12K + (t-1) × 2.5K
```

10 轮累计：

```
Σ prefill = 10×12K + 2.5K×(0+1+...+9)
          = 120K + 112.5K
          = 232.5K token
```

总 output = 10 × 0.8K = 8K token。

一个 10 轮 session，模型总共要"读" 232.5K token、"写" 8K token。读写比接近 30:1。

### 不开缓存的费用

```
Input:  232.5K × \$5/MTok   = \$1.16
Output: 8K × \$25/MTok      = \$0.20
───────────────────────────────────
Total:                        \$1.36
```

Prefill 占总费用的 **85%**。虽然 output 单价是 input 的 5 倍，但 Coding Agent 场景里 output 总量远小于 input，所以总成本完全由"读"主导。这跟 [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 里讲的输入输出非对称性是一回事——只是 Coding Agent 场景把这个不对称放得更大。

### 开缓存的费用

Prompt Caching 的工作方式：每轮请求的前缀如果和上一轮一致，就命中缓存（按 0.1× 计费）；只有本轮新增的部分需要写入缓存（按 1.25× 计费）。

在 Coding Agent 场景里，turn t 的输入前缀 = turn t-1 的完整输入（system + 历史都没变），所以前缀**必然完全命中**。每轮真正需要全价处理的只有新增的 2.5K。

```
总 cache_write = 12K（首轮写入 system）+ 9×2.5K = 34.5K
总 cache_read  = 232.5K - 34.5K = 198K
```

```
Cache write: 34.5K × \$6.25/MTok  = \$0.22
Cache read:  198K × \$0.50/MTok   = \$0.10
Output:      8K × \$25/MTok       = \$0.20
───────────────────────────────────────────
Total:                              \$0.51
```

**10 轮 session：从 \$1.36 降到 \$0.51，省 62%。**

### 会话越长，缓存越值

把模型推到更长的 session：

| 轮数 | 总 prefill | 无缓存费用 | 有缓存费用 | 节省 |
|------|-----------|-----------|-----------|------|
| 10 轮 | 232.5K | \$1.36 | \$0.51 | 62% |
| 30 轮 | 1,447.5K | \$7.84 | \$1.81 | 77% |
| 50 轮 | 3,662.5K | \$19.31 | \$3.60 | 81% |

50 轮时总 prefill 接近 3.7M token——没有缓存的话，一个 session 光输入就要 \$18.31。这不是一个理论极端：Claude Code 跑一个中型重构任务跑 50 轮是很常见的事。开了缓存压到 \$3.60，仍然不便宜，但至少可控。

为什么会话越长节省比例越高？因为 cache_write 只在每轮新增的 2.5K 上付 1.25×，但 cache_read 覆盖了全部历史前缀按 0.1× 计费。历史前缀以 N² 速度膨胀，而 cache_write 只以 N 速度线性增长——两者的差距随轮数拉大，缓存的摊薄效应越来越强。

### 几个值得单独说的观察

**Output 占比随轮数急剧缩小。** 10 轮时 output 费 \$0.20 占 15%；50 轮时仍然是 \$1.00 但只占 5%。这验证了一个直觉：Coding Agent session 的钱几乎全花在"读"上。优化"写"（比如让模型少生成）对总账单的影响微乎其微。

**Cache write 有盈亏点。** 一段内容写入缓存花 1.25×，读一次花 0.1×。如果它只被读 1 次就过期：1.25 + 0.1 = 1.35×，反而比直接付 1.0× 还贵。盈亏点是被读 **2 次以上**（1.25 + 0.2 = 1.45× < 2.0×）。Coding Agent 场景里每段内容从写入到会话结束，每轮都被读一次，远超盈亏点。

**Opus 4.7 新 tokenizer 的隐性涨价。** 官方文档写了 Opus 4.7 用了新 tokenizer，同样的文本可能多算 35% 的 token。也就是说从 Sonnet 4.6 换到 Opus 4.7，即使单价不变，账单也可能涨三分之一——因为同一段 system prompt 被算成了更多 token。

## 怎么省：从不花力气的开始

四个层次对应四套不同的省钱手段：工具侧（rtk）、数据侧（defuddle、markitdown）、框架侧（截断、compact、subagent、Agent Teams）、机制侧（prompt caching）。它们解决的问题不同，不可互相替代——**判断一个工具属于哪一层，是判断它能不能解决你的问题的前提**。比如你看到账单高就去装 rtk，但实际上你的成本大头是 system prompt 反复重算——rtk 帮不了这件事。

各层的投入产出比（ROI）极不均匀，按"花多少力气、省多少钱"排列：

**Prompt Caching：零投入，最大收益。** 如果你用的是 Claude Code、Cursor 这类主流框架，prompt caching 已经默认开启了——你什么都不用做，就已经在享受 0.1x 的缓存读取费率。如果你自己写 Agent 框架调 API，要做的只是保证 prompt 前缀稳定（别在 system prompt 里塞动态内容）。没有外部依赖、没有工程改造，10 轮省 62%，30 轮省 76%。**这是免费的钱，唯一的成本是"别做蠢事把缓存搞废了"。**

**数据入口清洗：10 分钟集成，稳定回报。** `npx defuddle parse <url> --md` 或 `markitdown input.pdf` 就是全部操作。一篇 80K 的网页 HTML 洗完变 15K，一份带版式的 PDF 转 Markdown 压缩率通常在 3-5 倍。而且这些省下来的 token 不是只省一次——如果这份内容留在 context 里被后续轮次反复读取，每省 1K 就是后续每一轮都少付 1K 的缓存读取费。**源头做的减法会被时间放大**。

**工具输出压缩：场景依赖，重 CLI 场景价值显著。** rtk 对 coding agent 效果拔群（git log、pytest、grep 这些重输出命令压缩 60-90%），但如果你做的是客服 agent 或 RAG agent，工具调用本身不是 CLI 命令，rtk 帮不上忙。这一层的通用策略是让工具返回精简的结构化数据而不是 dump 全文——但这需要改工具实现或找到支持分页/过滤的替代工具，工程量因场景而异。

**上下文管理策略：架构层介入，收益高但决策复杂。** 滑动窗口、compact、subagent、Agent Teams——这些不是装一个工具就搞定的事。它们要求你理解自己的任务结构：哪些子任务可以独立？会话还要走多远？哪些早期信息后面还会用到？决策空间大，做对了收益很高（subagent 可以让主 context 始终保持精简），做错了要么丢信息要么浪费固定开销。这一层的优化更像架构设计，不像装工具。

**优化的次序就是按这个顺序来**：先确认 prompt caching 没有被你的实现意外破坏（查 `usage` 字段里 `cache_read` 是否正常），再处理数据入口（脏内容别往 context 里塞），然后看场景决定是否需要工具输出压缩，最后规划上下文管理策略。**由免费到昂贵、由通用到场景特定、由被动享受到主动设计**——这是 Coding Agent 工程最朴素的成本规约路径。

还有一个容易忽略的点：**各层的优化是可以叠加的**。在数据入口层把一篇 80K 的网页洗成 15K，这 65K 的减量不仅当轮省了钱，还让后续每一轮少付 65K × 0.1x 的缓存读取费（上下文累积层收益），同时如果这份内容恰好在 system prompt 的缓存前缀之后紧接着（固定开销层），它被缓存的概率也更高。**层与层之间不是独立的减法，是乘法**。

## 带走这几句话

**1. Coding Agent 的钱花在"读"上，不在"写"上。** 一个 10 轮 session 的读写比是 30:1，prefill 占总费用 85%。Output 单价虽然是 input 的 5 倍，但 Coding Agent 场景里 output 总量太小，对总账单的影响不到 15%。优化方向永远是减少输入、而不是让模型少说话。

**2. 四个层次的优化路径完全不同，工具不可混用。** rtk 只能压 CLI 输出（工具输出层），defuddle 只能洗网页（数据入口层），compact/subagent 只能管历史（上下文累积层），prompt caching 只能缓存不变前缀（固定开销层）。搞清楚自己的钱花在哪一层，是选对工具的前提。

**3. Prompt Caching 是 ROI 最高的单一优化。** 零工程投入、零外部依赖，10 轮省 62%，50 轮省 81%。主流框架已经默认开启，唯一要做的是别把它搞废——不要在 system prompt 里塞动态内容。

**4. 源头做的减法会被时间放大。** 第 t 轮省下来的 token 不是省一次，是在后续每一轮都少付一次缓存读取费。数据入口层洗掉 60K 噪声，在 50 轮 session 里的累计节省远不止 60K × 一次费率——它避免了 60K 被反复缓存读取 49 次。各层优化之间是乘法关系，不是加法。

**5. 上下文管理是最难但最根本的一层。** Subagent 隔离和 Agent Teams 从架构上解决了"过程 token 不应进入主 context"的问题。它们不是事后压缩，是事前预防。代价是每个 subagent 都要重新承担一份固定开销——所以只适合"过程复杂、结论简短"的子任务。

**6. 这张地图和另外两篇文章一起读。** 本文讲的是"读"侧——输入 token 的来源与减法路径。[Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) 是"读"侧的物理机制——为什么前缀能被缓存、为什么 prefill 是计算密集而 decode 是带宽密集。[Test-Time Compute：让模型在回答之前先想一想](/posts/test-time-compute/) 是"写"侧的算力经济学——thinking token 的定价逻辑和预算控制。三篇合起来，构成一次 Coding Agent 推理成本的完整地图。

## 参考资料

### 工具与框架

- [rtk](https://github.com/rtk-ai/rtk) — Rust 编写的 CLI 输出压缩代理，在 shell 和 Agent 之间做规则改写，压缩率 60-90%
- [defuddle](https://github.com/kepano/defuddle) — 网页正文抽取工具，Readability 的现代替代，输出干净 Markdown
- [markitdown](https://github.com/microsoft/markitdown) — Microsoft 出品的异构文档转 Markdown 工具，支持 PDF/Office/OCR/音频
- [Cline](https://github.com/cline/cline) — 开源 coding agent，内置滑动窗口截断与上下文管理

### 厂商文档

- [Claude Opus 4.7 Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — 完整定价表，含 prompt caching 倍率与新 tokenizer 说明
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — cache_control 接口、TTL 机制与工程最佳实践
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) — 自定义 subagent 的定义、工具限制、模型选择与持久化记忆
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — 多 Agent 协作的实验功能：共享任务列表、消息通信、并行工作

### 相关阅读

- [Prompt Caching：被忽视的非对称性](/posts/prompt-caching-asymmetry/) — 从 KV Cache 到 Prompt Cache 的物理基础，三家厂商的设计哲学对比
- [Test-Time Compute：让模型在回答之前先想一想](/posts/test-time-compute/) — 推理时算力扩展的学术源头、工业实现与 thinking token 经济学
