---
title: "三年后，我重新打开了那篇文章"
published: 2026-05-18
description: "2023 年 6 月，Lilian Weng 写下了「LLM Powered Autonomous Agents」。三年后重读，99% 的 AI 文章已成废墟，这篇不是——她画下的地图，至今还在指引方向。"
image: "/gallery/cover/reread-lilianweng-agent.png"
tags: ["Agent", "LLM", "反思", "重读"]
category: "技术"
draft: false
---

我最近翻出了 2023 年 6 月的一个旧书签——[Lilian Weng 的「LLM Powered Autonomous Agents」](https://lilianweng.github.io/posts/2023-06-23-agent/)。

说是"翻出"并不准确。这篇文章从未真正离开过 agent 从业者的视野：会议讨论里引用它，新人入职推荐它，框架设计时对照它。但"知道它重要"和"重新逐字读完"是两回事。

重读的体验很奇特。2023 年的 AI 文章，99% 今天翻起来像废墟——结论过时、示例死亡、热情显得天真。这篇不是。打开的瞬间，你会发现三年前的墨迹还没干。

## 有人三年前就画好了地图

Lilian 在文章开头画了一张图：LLM 是大脑，三个组件环绕——Planning、Memory、Tool Use。

今天看这张图，你的第一反应可能是"这不是常识吗"。但请把时钟拨回 2023 年 6 月。那时候 agent 领域的主流叙事是 AutoGPT 和 BabyAGI——给它一个目标，它自己拆任务、自己执行、自己迭代。"autonomous"是关键词，三组件框架不是。

她做的不是罗列，是勘定。她把一个混乱的新领域拆成了三块明确的地盘：Planning 管怎么想，Memory 管怎么记，Tool Use 管怎么动手。每一块下面她标注了已有的路标——CoT、ReAct、Reflexion、向量检索、Toolformer——但没有把任何一条路当作终点。

这个克制很重要。因为三年后，这些具体的路标有些被走宽了（ReAct 成了事实标准），有些被绕过了（Tree of Thoughts 没有成为主流），但**地盘没有变**。所有后来者——Claude Code 的 subagent、Cursor 的 agentic editing、Devin 的自主开发——都长在这三根柱子上，只是各自的配比不同。

你甚至可以把 2026 年的 agent 生态映射进这张图：

- **Coding Agent**（Claude Code、Cursor）是 Tool Use + Planning 在窄域的胜利，Memory 交给 CLAUDE.md 和 context window
- **Multi-agent 编排**（subagents、CrewAI）是 Memory 向外生长的枝蔓——agent 之间也需要通信和协调
- **MCP 协议**是 Tool Use 的标准化，把 Lilian 文中零散的 API 调用变成了统一的总线

她没有预见到这些具体形态，但她画好了它们必然长出的土壤。

## 她看见了风暴

如果框架是这篇文章的骨架，那结尾的 Challenges 小节就是灵魂。

全世界的 agent 圈在 2023 年忙着为"能做什么"兴奋——AutoGPT 能自动写代码！BabyAGI 能自己拆任务！——而她在文章末尾安静地写下了三道坎：

1. **有限的上下文长度**——"有限的上下文窗口限制了历史信息、指令的包含和推理的能力"
2. **长期规划的困难**——"在较长的跨度上进行规划和探索解决方案空间仍然极具挑战"
3. **自然语言接口的可靠性**——"LLM 可能会格式错误、偶尔叛逆，也难免自信地犯错"

三年后一字未改，依然是瓶颈。

这不是巧合，是眼光。预见能力的人很多，预见边界的人很少。2023 年所有人都在画天花板，只有她在量地板——而地板的位置，三年没有移动过。

最尖锐的是第三点。今天我们有了 structured output、有了 function calling、有了更长的上下文，但 agent 仍然会幻觉、仍然会跳步、仍然会在你以为它理解了的时候做出匪夷所思的操作。而且问题变得更严重了——2023 年的 agent 最多帮你搜个网页、写个脚本，2026 年的 agent 可以直接改你的生产代码。能力越强，不可靠的代价越大。

Lilian 在 2023 年就看到了这个矛盾。她写的不是"现在的模型还不够好"，而是一个更深层的观察：**自然语言作为 agent 的控制接口，天然不可靠**。模型可以进化，但自然语言的歧义性不会消失。

## 时间改变了什么

框架没变，但三年的工程实践改变了三个组件之间的重量。

**Tool Use 长出了王冠。** Lilian 把它和 Planning、Memory 并列，但在 2026 年的实态中，Tool Use 是那个让 agent 从"能聊天"变成"能干活"的关键变量。MCP 把工具调用标准化了，function calling 成了所有主流模型的标配能力，而 coding agent 的爆发本质上是 Tool Use 在一个高价值窄域里的胜利。回看原文的 Tool Use 章节，她引用了 MRKL、Toolformer、HuggingGPT——这些具体项目有的沉寂了，但"让 LLM 调用外部工具"这个方向，时间给出了最响亮的肯定。

**Memory 被 context 的膨胀暂时遮住了。** 原文中 MIPS 一节占了相当大的篇幅——HNSW、FAISS、ScaNN、LSH、ANNOY，她逐一拆解了近似最近邻检索的算法族。这在 2023 年是合理的：4K context window 的世界里，长期记忆只能靠向量检索。但 2026 年，128K 到 1M 的上下文长度让大多数 agent 场景不再需要精心设计的检索管线——把对话历史和项目上下文直接塞进 prompt 就行了。这是一个"暂时"的绕过。context 不可能无限膨胀，当 agent 需要记住跨周、跨月的工作上下文时，Lilian 画的长期记忆问题会重新浮出水面。但此刻，它确实被淹在了 token 的洪流里。

**Planning 依然是那座翻不过去的山。** 三年了，通用长程规划没有突破性进展。Tree of Thoughts 没有成为标准，LLM+P 的 PDDL 路线也没有被工程界采纳。但有趣的是，窄域规划已经够用了——在代码领域，Claude Code 可以自主完成多步重构；在数据分析领域，agent 可以自主写 SQL、跑查询、画图表。不是规划问题被解决了，而是**模型变强之后，不需要那么精巧的规划算法了**。CoT 够用的时候，你不需要 ToT。

这是一种 Lilian 没有明确预见但隐含在框架中的工程智慧：当模型能力足够时，简单的 Planning + 强大的 Tool Use + 足够的 Memory，在窄域里已经可以闭环。不需要搜索树，不需要形式语言，让它试就行。

## 地图上没有的地方

她没画到的不是盲区，是三年前的世界还没有的版图。

**Coding Agent 是 agent 第一个真正成功的品类。** 2023 年的 case study 里，她写了 ChemCrow（化学研究）、Generative Agents（沙盒模拟）、AutoGPT / GPT-Engineer（代码生成）。三个方向，只有代码生成走到了工程落地的阶段。原因值得细想：代码是天然的验证环境——跑一下就知道对不对，这种即时反馈把 Planning 的容错空间撑大了。而化学实验和社交模拟没有这种奢侈。

**Multi-agent 编排从概念变成了工程现实。** 原文完全没有讨论多个 agent 之间的协作——这在 2023 年还只是学术实验室里的玩具。但 Claude Code 的 subagent、CrewAI 的角色编排、AutoGen 的多轮对话，都已经在生产环境里跑起来了。这个维度的核心问题其实是 Memory 的延伸：agent 之间如何共享上下文、如何避免重复劳动、如何合并结果。Lilian 的框架不需要大改就能容纳它——Memory 不只是"agent 怎么记"，也包括"agent 之间怎么通信"。

**从 Autonomous 到 Collaborative 的范式转移。** 这是最大的变化，也是 Lilian 的标题在今天读起来最需要重新审视的地方。2023 年的 agent 叙事是"全自主"——给它目标，它自己搞定一切。三年实践证明，这个叙事在工程上失败了。AutoGPT 死了，BabyAGI 沉寂了，"autonomous"这个词在产品宣传里越来越少见。取而代之的是人机协作：agent 做粗活，人做决策；agent 提方案，人做选择；agent 跑测试，人看结果。这不是退步，是对 Lilian 写的那个可靠性问题的诚实回应——既然自然语言接口天然不可靠，那就把人放回环路里。Human-in-the-loop 不是"autonomous"的反面，是她写的三个挑战指向的必然归途。

## 一张不需要重绘的地图

如果这篇文章今天重写，标题大概会从「LLM Powered **Autonomous** Agents」变成「LLM Powered **Collaborative** Agents」。

但正文不需要大改。

框架还在，挑战还在，三根柱子撑起的结构还在。具体的路标换了——ReAct 留下了，ToT 淡出了；HNSW 还在，LSH 退场了；Toolformer 被原生的 function calling 取代了，但 Tool Use 的方向比任何时候都更正确。这些是地图上的道路更替，不是地图本身的重绘。

一个框架三年不需要大改。在 AI 领域——这个以月为单位衡量范式迁移的领域——这大概是最高的赞美。
