---
title: "Token-Efficient Reasoning：教模型让每个 token 都值回票价"
published: 2026-08-05
description: "上一篇讲了推理时怎么给模型一个'想多久'的旋钮。但问题从来不是'想了多少 token'，而是'每个 token 有没有在推进答案'。这一篇讲训练侧怎么做到 token-efficient reasoning——从诊断低效 token，到提升单 token 信息密度，到压缩冗余表达，再到极致的零 token 隐空间推理。"
image: "/gallery/cover/efficient-thinking.png"
tags: ["LLM", "推理优化", "Efficient Reasoning", "Token Efficiency", "RLHF"]
category: "技术"
draft: false
---

## 不是想多久的问题，是每个 token 值不值的问题

[上一篇文章](/posts/test-time-compute/)讲了一件事：让模型在回答前多想一会儿，是提升能力的一条新轴。各家厂商也顺势给了开发者一个旋钮——从 `budget_tokens` 到 `effort` 级别，让你决定模型该花多少脑力。

但旋钮控制的是**量**——你拧多了就多想，拧少了就少想。它回避了一个更根本的问题：**模型想出来的那些 token，每一个都在推进答案吗？**

学术圈最近越来越多地用一个术语来定义这件事：**token-efficient reasoning**。它的意思不是"用更少的 token"，而是"让每个 token 的边际效用（marginal utility）最大化"。一个 token 如果不提供新信息、不推进推理、不纠正错误，它就是低效的——不管这条思考链总共有多长。

这个视角的好处是：它把"长度"从目标降格成了**读数**。你不需要直接去压长度，你只需要把每个 token 都变得有信息量，长度就自然会短——因为废话本来就不携带信息。反过来，如果你硬压长度却不管信息密度，模型可能把有用的推理也一起砍了。

这一篇从训练侧出发，讲四件递进的事：先看低效 token 长什么样，再看怎么提升单个 token 的信息密度，接着是怎么压缩冗余的表达 token，最后是最激进的——让推理根本不占用 output token。

## 诊断：低效 token 长什么样

要提升 token efficiency，得先知道"低效"长什么样。把一条真实的长思考链摊开看，低效 token 基本是三种东西在反复出现：

**重复**——同一个结论换个说法再说一遍，典型如 "So the answer is X. To confirm, we can see that indeed X is correct. Therefore X." 三句话只有一句话的信息量，另外两句的边际效用为零。

**无信息环路**——"wait, let me reconsider… actually, let me check again… hmm, let me think about this differently…" 这些 token 既没推进答案，也没带来新信息，只是模型在原地打转，不确定该往哪走。

**错误试探累积**——一头撞进死胡同，花了几百个 token 才发现此路不通，然后换个方向再撞。每次错误试探本身不可避免，但如果模型缺乏早停和回溯的能力，这些 token 就会大量堆积。

![一条臃肿的思考链，放大看全是重复、兜圈和撞墙的错误试探](/gallery/infographic-efficient-thinking/infographic-05.png)

DeepSeek-R1（[arXiv 2501.12948](https://arxiv.org/abs/2501.12948)）是最好的案例。它用大规模强化学习把推理能力刷得很高，但奖励函数只看答案对错、完全不管 token 效率。结果它学到了一个朴素又危险的关联：**产出越多 token 越不容易错**——但那些多出来的 token 里有大量是上面三类低效 token。一道 `1+1` 级别的问题也能触发几百 token 的内心戏，绝大部分的边际效用约等于零。

这就是 token-efficient reasoning 这个研究方向要解决的问题。下面四步，是从粗到精、从治标到治本的递进。

## 第一步：直接砍低效 token（治标但有用）

最朴素的做法：既然有大量低效 token，那就给它们定价。原来的训练信号是"答对了给你钱"，现在改成"答对了给你钱，但每个 token 收费"。模型为了净收益最大，自然会去砍那些对答案没贡献的 token。这类方法统称 **RL length shaping**（强化学习长度塑形）。

Moonshot 的 **Kimi k1.5**（[arXiv 2501.12599](https://arxiv.org/abs/2501.12599)）最早把这条路走通，在 RL 里引入长度惩罚，配合 long2short 蒸馏，短 CoT 版本用远少于 R1 的 token 拿到了有竞争力的成绩。**ThinkPrune**（[arXiv 2504.01296](https://arxiv.org/abs/2504.01296)）把 AIME24 的推理长度砍掉约一半，性能只掉了 2%。**Concise Reasoning**（[arXiv 2504.05185](https://arxiv.org/abs/2504.05185)）观察到冗长往往是 RL 训练本身的副产物，一轮简洁化训练就能压掉 40%–54%。

注意 ThinkPrune 的数字真正说明了什么：**砍掉的那一半 token，几乎全是低效的**。如果它们携带了有用推理信息，性能不可能只掉 2%。这恰恰验证了"长思考链里确实注满了低效 token"这个诊断。

但这一步本质上是在**按量收费**——它不管一个 token 为什么低效，只管它存在就要付费。罚轻了没效果，罚重了模型会连有用的推理 token 也一起省掉，准确率跟着崩（O1-Pruner [arXiv 2501.12570](https://arxiv.org/abs/2501.12570) 和后续工作都在反复打磨这个力度问题）。要真正提升 token efficiency，得进入下面两步——让有用 token 更有用，让冗余 token 不产生。

## 第二步：提升单 token 信息密度

这一步对应的问题是"无信息环路"和"错误试探累积"——不是表达冗余，而是推理本身缺乏结构，每一步 token 不知道自己在解空间的哪个位置。一个聪明的博士生和一个小学生解同一道题，草稿纸可能写得一样满，差别在于博士生的每一笔都在推进解题，小学生的很多笔是在原地打转。

![同样写满一页草稿纸，新手一条道走到黑，高手会分叉、验证、剪枝](/gallery/infographic-efficient-thinking/infographic-04.png)

**让推理有结构，每一步 token 才知道自己在做什么。** Tree of Thoughts（[arXiv 2305.10601](https://arxiv.org/abs/2305.10601)）把推理从一条直线改成可分叉、评估、剪枝的树；rStar-Math（[arXiv 2501.04519](https://arxiv.org/abs/2501.04519)）用蒙特卡洛树搜索配合过程奖励，让小模型也能在数学上博出惊人成绩。有了结构，"探索"和"回溯"就成了有目的的动作，而不是无意识地堆低效 token。

**把搜索内化进模型权重，而不是外挂框架。** Stream of Search（[arXiv 2404.03683](https://arxiv.org/abs/2404.03683)）拿"包含走错路和掉头"的完整搜索轨迹去训练模型，让它在线性输出里学会自己探索、自己回溯。Meta Chain-of-Thought（[arXiv 2501.04682](https://arxiv.org/abs/2501.04682)）把这层意思说得最透：今天的思维链只展示了"誊写工整后的解题过程"，却藏起了产生它的那段凌乱试错——真正的 System-2 推理，是要把**搜索过程本身**学进权重里。DeepSeek-R1 在纯 RL 训练中自发冒出的"aha moment"就是经验证据：只要奖励给对了，模型能学会早点掉头，而不是在死胡同里堆 token。

**给每一步打分，逼着每个 token 都"算数"。** 只奖励最终答案（Outcome Reward），模型可能蒙对——答案对了，中间有低效甚至错误的 token 却被一并强化了。OpenAI 的 *Let's Verify Step by Step*（[arXiv 2305.20050](https://arxiv.org/abs/2305.20050)）证明了给**每一步**单独打分（Process Reward Model, PRM）显著更可靠；Math-Shepherd（[arXiv 2312.08935](https://arxiv.org/abs/2312.08935)）用蒙特卡洛 rollout 把逐步标注自动化；ReasonFlux-PRM（[arXiv 2506.18896](https://arxiv.org/abs/2506.18896)，NeurIPS 2025）进一步做"轨迹感知"的过程奖励。这相当于给每个 token 标了信息贡献分——边际效用为零的那些，训练时就会被抑制。

**自我纠错和抽象，减少错误试探的 token 成本。** Self-Refine（[arXiv 2303.17651](https://arxiv.org/abs/2303.17651)）、Reflexion（[arXiv 2303.11366](https://arxiv.org/abs/2303.11366)）让模型学会自我批评再修正，Google 的 SCoRe（[arXiv 2409.12917](https://arxiv.org/abs/2409.12917)）用 RL 把"自我纠错"训练成稳定技能——早发现撞墙，就少花一次试探的 token。Step-Back Prompting（[arXiv 2310.06117](https://arxiv.org/abs/2310.06117)）让模型先退一步抽象出一般原理再解题——先看清问题类型，就能调用现成套路，而不是从零一步步试。

这一整步的共同点：它们都在提升"每个输出 token 对最终答案的贡献度"。结构对了，推理的信息密度就上去了，低效 token 从源头减少。

## 第三步：压缩冗余表达 token

上一步解决的是推理结构——让模型"想得对"。这一步解决的是表达效率——就算思路是对的，同一个意思用三句话反复确认，每一步都写成完整自然语言长句，那多出来的 token 也是冗余的。它们不提供新的推理信息，只是表达上的注水。

![把一条注水的思考链拧干：滴掉的是填充和重复，留下的是一次说对](/gallery/infographic-efficient-thinking/infographic-06.png)

**改表达风格，用更少 token 承载同样的推理。** Chain of Draft（[arXiv 2502.18600](https://arxiv.org/abs/2502.18600)）的灵感来自人打草稿——记推理步骤时只写关键几个字，不写完整句子。它让模型模仿"极简草稿"风格，在某些任务上只用标准 CoT 约 7.6% 的 token 就达到相当准确率。TokenSkip（[arXiv 2502.12067](https://arxiv.org/abs/2502.12067)）学会识别哪些 token 是"可跳过的填充"并主动删掉；CoT-Valve（[arXiv 2502.09601](https://arxiv.org/abs/2502.09601)）像给推理装了阀门，可连续调节推理链长短。

**判断哪些题根本不需要展开——最高效的冗余控制是"不启动"。** 很多题不需要进入思考模式：`1+1` 不必先写一段分析。AdaptThink（[arXiv 2505.13417](https://arxiv.org/abs/2505.13417)，EMNLP 2025）用 RL 让模型按难度自主选择要不要思考，把平均回复长度压掉 53%、准确率反而涨 2.4%——省下的全是本不该产生的 token。Thinkless（[arXiv 2505.13379](https://arxiv.org/abs/2505.13379)，NeurIPS 2025）训练模型输出"直接答"或"进入思考"两种 token 自主决策；字节 AdaCoT（[arXiv 2505.11896](https://arxiv.org/abs/2505.11896)）把这套自适应放到接近生产的规模上验证。CMU 的 L1 / LCPO（[arXiv 2503.04697](https://arxiv.org/abs/2503.04697)，COLM 2025）让模型服从 prompt 里给的 token 预算；SelfBudgeter（[arXiv 2505.11274](https://arxiv.org/abs/2505.11274)）更进一步，让模型动手前先自己预估需要多少 token——把"看题给 token 预算"这个动作内化了。

**蒸馏：把长链里的有效 token 提纯给短链。** s1（[arXiv 2501.19393](https://arxiv.org/abs/2501.19393)）用 budget forcing（在模型想收尾时硬塞 "Wait" 逼它继续检查）把 AIME24 从 50% 推到 57%；反过来，k1.5 的 long2short 把擅长长推理的模型的精华蒸馏进短模型——相当于只保留高效用的 token，丢弃冗余的。

## 第四步：零 token 推理——最高效的 token 是不存在的 token

前三步都在优化"写出来的 token"。但有一群研究者问了一个更激进的问题：**推理为什么一定要占用 output token？**

人心算 `17 × 23` 时，脑子里并不是逐字默念，很多中间过程以某种压缩的、非语言的形式一闪而过。语言是思维的输出格式，不一定是运算格式。如果能让模型在**连续的向量空间**里推理，只在最后把结论翻译成语言，那些中间 token 就直接从账单上消失了——token efficiency 趋向于无穷大。

Meta 的 **Coconut**（Chain of Continuous Thought，[arXiv 2412.06769](https://arxiv.org/abs/2412.06769)，COLM 2025）让推理发生在隐空间，上一步的隐状态直接喂给下一步，不解码成文字，直到需要答案时才输出。**Pause token**（[arXiv 2310.02226](https://arxiv.org/abs/2310.02226)，ICLR 2024）在输入里插"停顿符"，给模型多一点前向计算余地却不占输出。**Recurrent depth**（[arXiv 2502.05171](https://arxiv.org/abs/2502.05171)，NeurIPS 2025）更硬核——让模型内部循环模块反复迭代加深思考，一个 35 亿参数的模型靠这机制博出了相当于 500 亿参数的推理表现。

思考的"深度"就此和输出的"长度"彻底解耦。你可以想得很深，却几乎不多产出一个 token。这也顺带绕开了上一篇讲的"thinking token 不可缓存、每轮重算"的成本困境——压根就没那么多 token 了。

这一步目前还更偏研究、离大规模产品化有距离，但它指向的方向很清楚：**token efficiency 的理论上限，是推理能力和 output token 数完全脱钩**。

## 从指标回到产品

把这四步叠在一起看：诊断低效 → 按量定价 → 提升密度 → 压缩冗余 → 零 token，是一个 token efficiency 从低到高的连续谱。而在最新的产品里，这个连续谱已经在被整合。

Moonshot 的 **Kimi K3**（[arXiv 2607.24653](https://arxiv.org/abs/2607.24653)）在后训练阶段用 RL 在多个 reasoning-effort 档位上训练，把不同 token efficiency 水平的思考模式直接烤进模型，对外只暴露一个 `reasoning_effort` 参数（`low` / `high` / `max`），思考常开。用户拧的还是那个粗旋钮，但旋钮的每一档背后，是训练阶段就调教好、各自在 token efficiency 上有分寸的策略。

想更系统地看这个领域，有几篇综述值得一读：**Stop Overthinking**（[arXiv 2503.16419](https://arxiv.org/abs/2503.16419)，TMLR 2025）按"改模型 / 改输出 / 改提示"分了类，是最好的入门地图；**Reasoning Economy**（[arXiv 2503.24377](https://arxiv.org/abs/2503.24377)）从"推理经济学"角度把成本与收益放一起算账。更近的 **Token-Level Marginal Utility**（ACL 2026）和 **DiffAdapt**（ICLR 2026）则直接把 token efficiency 作为第一性原理来建模——前者定义了逐 token 的边际效用并以此做裁剪，后者按题目难度自适应分配 token 预算。这条线还在快速生长。

## 两篇文章，一枚硬币

回到上一篇的框架。我在那篇里说，LLM 推理的成本结构不是铁板一块，可以被理解、拆解、重新设计——prompt caching 优化的是"读"，test-time compute 权衡的是"写"。

这一篇讲的 token-efficient reasoning，是同一枚硬币的训练侧。上一篇讲**推理时怎么用好那段思考**（给它定预算、定档位），是交到用户手里的外部旋钮；这一篇讲**训练时怎么让模型产出的每个 token 都值回票价**——四步递进：诊断低效 token、提升单 token 信息密度、压缩冗余表达、直到推理本身不再需要占用 output token。

![一枚硬币的两面：推理侧是给用户的旋钮，训练侧是把分寸教进模型](/gallery/infographic-efficient-thinking/infographic-03.png)

那个在草稿纸上演算的博士生，草稿之所以短，从来不是因为他刻意省字——而是他的**每一笔都在推进答案**：有结构所以不兜圈，有策略所以不乱试，有精确的表达所以不重复。他的 token efficiency 天生就高。训练侧做的这一切，说到底就是在把模型往"博士生式的 token efficiency"上培养。

倒 U 型曲线的教训，最好的解法不是让人小心翼翼地避开右半段，而是训练出一个每个 token 都高效、天生就不冲过头的模型。

---

## 参考资料

**诊断：低效 token 的来源**

- DeepSeek-AI. (2025). [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948). — 纯正确率奖励、无 token 效率约束，低效 token 累积的典型。

**第一步：直接砍量（RL length shaping）**

- Kimi Team. (2025). [Kimi k1.5: Scaling Reinforcement Learning with LLMs](https://arxiv.org/abs/2501.12599). — length penalty + long2short 蒸馏的早期系统实践。
- Luo, H., et al. (2025). [O1-Pruner: Length-Harmonizing Fine-Tuning for O1-Like Reasoning Pruning](https://arxiv.org/abs/2501.12570).
- Hou, B., et al. (2025). [ThinkPrune: Pruning Long Chain-of-Thought via RL](https://arxiv.org/abs/2504.01296). — AIME24 长度砍半、只掉约 2%，证明砍掉的多是低效 token。
- Wand AI. (2025). [Concise Reasoning via Reinforcement Learning](https://arxiv.org/abs/2504.05185). — 冗长是 RL 副产物，简洁化压缩 40–54%。
- Arora, D., & Zanette, A. (2025). [Training Language Models to Reason Efficiently](https://arxiv.org/abs/2502.04463). *NeurIPS 2025*.

**第二步：提升单 token 信息密度（结构、搜索、过程奖励、纠错）**

- Yao, S., et al. (2023). [Tree of Thoughts: Deliberate Problem Solving with LLMs](https://arxiv.org/abs/2305.10601). *NeurIPS 2023*.
- Guan, X., et al. (2025). [rStar-Math: Small LLMs Can Master Math Reasoning with Self-Evolved Deep Thinking](https://arxiv.org/abs/2501.04519). — MCTS + 过程奖励。
- Gandhi, K., et al. (2024). [Stream of Search (SoS): Learning to Search in Language](https://arxiv.org/abs/2404.03683). *COLM 2024*.
- Xiang, V., et al. (2025). [Towards System 2 Reasoning in LLMs: Learning How to Think With Meta Chain-of-Thought](https://arxiv.org/abs/2501.04682).
- Lightman, H., et al. (2023). [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050). *ICLR 2024*. — PRM 优于 ORM。
- Wang, P., et al. (2024). [Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations](https://arxiv.org/abs/2312.08935).
- Zou, J., et al. (2025). [ReasonFlux-PRM: Trajectory-Aware PRMs for Long Chain-of-Thought Reasoning](https://arxiv.org/abs/2506.18896). *NeurIPS 2025*.
- Madaan, A., et al. (2023). [Self-Refine: Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651). *NeurIPS 2023*.
- Shinn, N., et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366). *NeurIPS 2023*.
- Kumar, A., et al. (2024). [Training Language Models to Self-Correct via Reinforcement Learning (SCoRe)](https://arxiv.org/abs/2409.12917).
- Zheng, H. S., et al. (2023). [Take a Step Back: Evoking Reasoning via Abstraction in LLMs](https://arxiv.org/abs/2310.06117). *ICLR 2024*.

**第三步：压缩冗余表达 token（草稿、自适应、蒸馏）**

- Xu, S., et al. (2025). [Chain of Draft: Thinking Faster by Writing Less](https://arxiv.org/abs/2502.18600). — 约 7.6% token 达到相当准确率。
- Xia, H., et al. (2025). [TokenSkip: Controllable Chain-of-Thought Compression in LLMs](https://arxiv.org/abs/2502.12067).
- Ma, X., et al. (2025). [CoT-Valve: Length-Compressible Chain-of-Thought Tuning](https://arxiv.org/abs/2502.09601).
- Zhang, J., et al. (2025). [AdaptThink: Reasoning Models Can Learn When to Think](https://arxiv.org/abs/2505.13417). *EMNLP 2025*. — 长度 -53%，准确率 +2.4%。
- Fang, G., et al. (2025). [Thinkless: LLM Learns When to Think](https://arxiv.org/abs/2505.13379). *NeurIPS 2025*.
- ByteDance. (2025). [AdaCoT: Pareto-Optimal Adaptive Chain-of-Thought Triggering](https://arxiv.org/abs/2505.11896).
- Aggarwal, P., & Welleck, S. (2025). [L1: Controlling How Long a Reasoning Model Thinks with RL](https://arxiv.org/abs/2503.04697). *COLM 2025*.
- Li, Z., et al. (2025). [SelfBudgeter: Adaptive Token Allocation for Efficient LLM Reasoning](https://arxiv.org/abs/2505.11274).
- Muennighoff, N., et al. (2025). [s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393). — budget forcing，AIME24 50→57。

**第四步：零 token 推理（隐空间 / 架构）**

- Hao, S., et al. (2024). [Training Large Language Models to Reason in a Continuous Latent Space (Coconut)](https://arxiv.org/abs/2412.06769). *COLM 2025*.
- Goyal, S., et al. (2023). [Think before you speak: Training Language Models with Pause Tokens](https://arxiv.org/abs/2310.02226). *ICLR 2024*.
- Geiping, J., et al. (2025). [Scaling up Test-Time Compute with Latent Reasoning: A Recurrent Depth Approach](https://arxiv.org/abs/2502.05171). *NeurIPS 2025*. — 3.5B 博出等效 50B。

**产品与综述**

- Moonshot AI. (2026). [Kimi K3: Open Frontier Intelligence](https://arxiv.org/abs/2607.24653). — 多 reasoning-effort 档位，API 暴露 `reasoning_effort`。
- Sui, Y., et al. (2025). [Stop Overthinking: A Survey on Efficient Reasoning for LLMs](https://arxiv.org/abs/2503.16419). *TMLR 2025*.
- Wang, R., et al. (2025). [Harnessing the Reasoning Economy: A Survey of Efficient Reasoning for LLMs](https://arxiv.org/abs/2503.24377).
- Chen, Y., et al. (2026). [Token-Level Marginal Utility for Efficient Reasoning in Large Language Models](https://aclanthology.org/2026.acl-long.1386.pdf). *ACL 2026*. — 逐 token 边际效用建模。
- DiffAdapt. (2026). [Difficulty-Adaptive Reasoning for Token-Efficient Thinking](https://proceedings.iclr.cc/paper_files/paper/2026/file/353d4deedc4aac78b24924c485cdb4a3-Paper-Conference.pdf). *ICLR 2026*. — 按难度自适应分配 token 预算。
