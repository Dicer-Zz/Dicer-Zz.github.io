---
title: "教模型少说废话：想得成体系，说得够精确"
published: 2026-08-05
description: "上一篇讲了推理时怎么给模型一个'想多久'的旋钮。但把思考链拉长一看会发现：它长，往往不是因为想得深，而是因为塞满了重复、兜圈和错误的试探。这一篇讲训练侧怎么教模型少说废话——真正的两门功夫是想得成体系、说得够精确，长度只是这两件事做对之后自然掉下来的副产品。"
image: "/gallery/cover/efficient-thinking.png"
tags: ["LLM", "推理优化", "Efficient Reasoning", "Reasoning", "RLHF"]
category: "技术"
draft: false
---

## 从"想多久"到"为什么这么长"

[上一篇文章](/posts/test-time-compute/)讲了一件事：让模型在回答前多想一会儿，是提升能力的一条新轴。各家厂商也顺势给了开发者一个旋钮——从 `budget_tokens` 到 `effort` 级别，让你在每个请求上决定模型该花多少脑力。

但旋钮只回答了"想多久"，没回答一个更扎心的问题：**模型的思考链凭什么这么长？**

把一条真实的长思考链摊开看，你会发现它的长度里藏着大量水分。不是深邃的推演，而是三类东西反复出现：**重复**——同一个结论换个说法再说一遍；**兜圈**——"wait, let me reconsider… actually, let me check again…"，绕来绕去不落地；**错误的试探**——一头撞进死胡同，撞了半天才发现此路不通，然后换个方向再撞。真正有用的推理可能只占其中一小部分，剩下的都是废话。

![一条臃肿的思考链，放大看全是重复、兜圈和撞墙的错误试探](/gallery/infographic-efficient-thinking/infographic-05.png)

所以"少说废话"这件事，本质上不是"把话说短"，而是"别产生废话"。而废话之所以产生，根子在两处：一是**想得乱**——没有章法，才会兜圈、才会一条道走到黑；二是**说得糙**——同一个意思注水式地反复表达。对应地，治本的两门功夫就是：**想得成体系**，和**说得够精确**。

这一篇要讲的训练侧研究，几乎都能归到这两门功夫底下。但在展开之前，得先说一个最容易踩的坑。

## 最容易踩的坑：砍字数 ≠ 少废话

看到思考链太长，最直觉的反应是：那就罚它长呗。原来的训练信号是"答对了给你钱"，现在改成"答对了给你钱，但每多说一个字扣你一点点"。模型为了净收益最大，自然会去找"用最短的话把题做对"的策略。这类方法统称 **RL length shaping**（强化学习长度塑形）。

这条路是有真东西的。要理解它为什么必要，先看个反面教材：DeepSeek-R1（[arXiv 2501.12948](https://arxiv.org/abs/2501.12948)）用大规模强化学习把推理能力刷得很高，但奖励函数里只看答案对错、完全不管长度。结果它成了"话痨"的典型——一道 `1+1` 级别的问题也能触发几百 token 的内心戏。它学到了一个朴素又危险的关联：**想得越多越不容易错**，却没有"够了"的边界感。

于是一批工作来给它装刹车。Moonshot 的 **Kimi k1.5**（[arXiv 2501.12599](https://arxiv.org/abs/2501.12599)）最早把这条路走通，在 RL 里明确引入长度惩罚，短 CoT 版本用远少于 R1 的 token 拿到了有竞争力的成绩。**ThinkPrune**（[arXiv 2504.01296](https://arxiv.org/abs/2504.01296)）做得很干净：把 AIME24 的推理长度砍掉约一半，性能只掉了 2%。

但请注意 ThinkPrune 这个数字真正说明了什么：**砍掉的那一半，几乎全是废话**。如果那半截里有真推理，性能不可能只掉 2%。换句话说，长度惩罚之所以有效，恰恰是因为长思考链里本来就注满了水——罚长度只是把水挤了出来，它治的是"症状"，没碰到"想得乱、说得糙"这两个病根。

病根没除，副作用就会冒出来。O1-Pruner（[arXiv 2501.12570](https://arxiv.org/abs/2501.12570)）、Wand AI 的 Concise Reasoning（[arXiv 2504.05185](https://arxiv.org/abs/2504.05185)）这些工作都在反复打磨同一个难点：罚款力度太难定了。罚轻了没效果，罚重了模型会"惜字如金"到不敢展开必要的推理，准确率跟着崩。你能靠外力把话压短，却没法靠外力让它变得有条理——**真正让思考不长废话的，不是嘴上的封条，而是脑子里的章法**。下面这两门功夫，才是奔着病根去的。

## 功夫一：想得成体系（治"兜圈"和"瞎试探"）

先治"乱"。兜圈和瞎试探的共同根源，是思考没有结构：模型不知道自己在搜索解空间，也就不知道哪条路走过了、哪条是死路、什么时候该掉头。一个聪明的博士生解题时是有章法的——同时铺开几条思路、快速评估、砍掉没戏的分支、必要时推倒重来；小学生则容易一条道走到黑，错了也浑然不觉。同样写满一页草稿纸，装着的思考质量可以天差地别。

![同样写满一页草稿纸，新手一条道走到黑，高手会分叉、验证、剪枝](/gallery/infographic-efficient-thinking/infographic-04.png)

**第一步，是让思考有形状。** Tree of Thoughts（[arXiv 2305.10601](https://arxiv.org/abs/2305.10601)）把推理从一条直线改成一棵可以分叉、评估、剪枝的树；rStar-Math（[arXiv 2501.04519](https://arxiv.org/abs/2501.04519)）用蒙特卡洛树搜索配合过程奖励，让很小的模型也能在数学上博出惊人成绩。有了结构，"探索"和"回溯"才成为可控的动作，而不是无意识的乱撞。

**第二步，是把搜索内化进模型本身**，而不是永远外挂一个搜索框架。Stream of Search（[arXiv 2404.03683](https://arxiv.org/abs/2404.03683)）干脆拿"包含走错路和掉头"的完整搜索轨迹去训练模型，让它在一条线性输出里学会自己探索、自己回溯。Meta Chain-of-Thought（[arXiv 2501.04682](https://arxiv.org/abs/2501.04682)）把这层意思说得最透：今天的思维链只展示了"誊写工整后的解题过程"，却藏起了产生它的那段凌乱试错——真正的 System-2 推理，是要把**搜索过程本身**学进权重里。DeepSeek-R1 在纯 RL 训练中自发冒出的"aha moment"（写着写着突然自我怀疑、回头重算）就是最好的经验证据：只要奖励给对了，这种"会掉头"的习惯是能被学出来的。

**第三步，是给过程本身打分，而不只给结果打分**。只奖励最终答案，模型就可能"蒙对"甚至歪打正着——答案对了，中间的推理却是错的、侥幸的，这种坏习惯还会被强化。OpenAI 的 *Let's Verify Step by Step*（[arXiv 2305.20050](https://arxiv.org/abs/2305.20050)）证明了给**每一步**推理单独打分（Process Reward Model, PRM）比只看结果显著更可靠；Math-Shepherd（[arXiv 2312.08935](https://arxiv.org/abs/2312.08935)）用蒙特卡洛 rollout 把逐步标注自动化，省掉了昂贵的人工；到了长思维链时代，ReasonFlux-PRM（[arXiv 2506.18896](https://arxiv.org/abs/2506.18896)，NeurIPS 2025）进一步做"轨迹感知"的过程奖励，专门评估一条长推理里每一段的真实贡献。像老师批卷子给步骤分，逼着每一步都得算数——走得稳，自然就少绕路。

在这之上还有两块更"元"的能力。一是**自我纠错**：模型天生并不擅长发现并改正自己的错误，Self-Refine（[arXiv 2303.17651](https://arxiv.org/abs/2303.17651)）、Reflexion（[arXiv 2303.11366](https://arxiv.org/abs/2303.11366)）让它先自我批评再修，Google 的 SCoRe（[arXiv 2409.12917](https://arxiv.org/abs/2409.12917)）用 RL 把"自我纠错"训练成一项稳定技能——早点发现撞墙，就不用撞第二次。二是**抬高抽象层**：Step-Back Prompting（[arXiv 2310.06117](https://arxiv.org/abs/2310.06117)）让模型先退一步、抽象出更一般的原理，再回头解具体题——先看清"这是一类什么问题"，就能直接调用现成套路，而不是从零硬试。

这一整套功夫的共同点是：它们都不在"字数"上做文章，而在**思考的结构**上做文章。结构对了，兜圈和瞎试探这两类废话就从源头上少了。

## 功夫二：说得够精确（治"重复"和"注水"）

再治"糙"。就算思路本身是对的、有章法的，表达上依然可能注水——同一个中间结论用三句话反复确认，每一步都写成完整的自然语言长句。这类废话不来自思路混乱，而来自表达冗余。

![把一条注水的思考链拧干：滴掉的是填充和重复，留下的是一次说对](/gallery/infographic-efficient-thinking/infographic-06.png)

**最直接的，是改表达风格。** Chain of Draft（[arXiv 2502.18600](https://arxiv.org/abs/2502.18600)）的灵感来自人打草稿——我们记推理步骤时只写关键的几个字，不写完整句子。它让模型模仿这种"极简草稿"风格，在某些任务上只用了标准 CoT 约 7.6% 的 token 就达到相当的准确率。TokenSkip（[arXiv 2502.12067](https://arxiv.org/abs/2502.12067)）学会识别 CoT 里哪些 token 是"可跳过的填充"并主动删掉；CoT-Valve（[arXiv 2502.09601](https://arxiv.org/abs/2502.09601)）则像给推理装了个阀门，能在一个模型上连续调节推理链的长短。

**更上游的精确，是判断一道题到底要不要展开说**。很多题根本不需要进入思考模式——`1+1` 不必先写一段"让我分析一下这个问题的结构"。这个"要不要动用深度思考"的判断，本身就是一种元认知。**AdaptThink**（[arXiv 2505.13417](https://arxiv.org/abs/2505.13417)，EMNLP 2025）用 RL 让模型按题目难度自主选择要不要思考，把平均回复长度压掉 53%、准确率反而涨 2.4%——省下的都是本不该有的过度思考。**Thinkless**（[arXiv 2505.13379](https://arxiv.org/abs/2505.13379)，NeurIPS 2025）训练模型输出"直接答"或"进入思考"两种 token 自主决策；字节 AdaCoT（[arXiv 2505.11896](https://arxiv.org/abs/2505.11896)）把这套自适应放到接近生产的规模上验证。CMU 的 L1 / LCPO（[arXiv 2503.04697](https://arxiv.org/abs/2503.04697)，COLM 2025）让模型服从 prompt 里给定的长度目标；SelfBudgeter（[arXiv 2505.11274](https://arxiv.org/abs/2505.11274)）更进一步，让模型动手前先自己预估这题需要多少预算——把"看题给分"这个动作也内化了。

**精确的极致，是有些思考根本不必说出口**。人心算 `17 × 23` 时，脑子里并不是逐字默念，很多中间过程以某种压缩的、非语言的形式一闪而过。语言是思维的输出格式，不一定是运算格式。Meta 的 Coconut（[arXiv 2412.06769](https://arxiv.org/abs/2412.06769)，COLM 2025）让推理发生在连续的隐空间里，上一步的隐状态直接喂给下一步，不解码成文字，直到需要答案时才输出；pause token（[arXiv 2310.02226](https://arxiv.org/abs/2310.02226)，ICLR 2024）在输入里插"停顿符"，给模型多一点计算余地却不占输出；recurrent depth（[arXiv 2502.05171](https://arxiv.org/abs/2502.05171)，NeurIPS 2025）更硬核，让内部循环模块反复迭代加深思考，一个 35 亿参数的模型靠这机制博出了相当于 500 亿参数的推理表现。思考的"深度"就此和输出的"长度"解耦——你可以想得很深，却几乎不多说一个字。这也顺带绕开了上一篇讲的"thinking token 不可缓存、每轮重算"的成本困境——压根就没那么多 token 了。

## 长度，是副产品

绕了一圈，回到开头那个旋钮。你会发现：**当两门功夫都做对了，长度会自己掉下来，根本不用专门去压。**

看那些数字就明白了。AdaptThink 想得清楚了，长度 -53%、准确率还 +2.4%；k1.5 的 long2short 把长推理的精华蒸馏进短回答，用一小截 token 追平长篇；ThinkPrune 砍掉一半只掉 2%。它们减掉的从来不是推理，而是重复、兜圈和瞎试探——是废话。长度是这两门功夫的**读数**，不是它们的**目标**。你把目标错设成"变短"，就会得到那个封条式的副作用；你把目标设成"想清楚、说精确"，短是水到渠成的结果。

这一点在最新的产品里已经能看到痕迹。Moonshot 的 **Kimi K3**（[arXiv 2607.24653](https://arxiv.org/abs/2607.24653)）在后训练阶段用 RL 在多个 reasoning-effort 档位上训练，把不同强度的思考模式直接烤进模型，对外只暴露一个 `reasoning_effort` 参数（`low` / `high` / `max`），思考常开。用户拧的还是那个粗旋钮，但每一档背后，是训练阶段就调教好、各自懂得分寸的思考策略。如果想更系统地看这个领域，**Stop Overthinking**（[arXiv 2503.16419](https://arxiv.org/abs/2503.16419)，TMLR 2025）把方法按"改模型 / 改输出 / 改提示"分了类，是最好的入门地图；**Reasoning Economy**（[arXiv 2503.24377](https://arxiv.org/abs/2503.24377)）则从"推理经济学"的角度把成本与收益放一起算账，正好和上一篇对上。

## 两篇文章，一枚硬币

回到上一篇的框架。我在那篇里说，LLM 推理的成本结构不是铁板一块，可以被理解、拆解、重新设计——prompt caching 优化的是"读"，test-time compute 权衡的是"写"。

这一篇讲的高效思考，是同一枚硬币的训练侧。上一篇讲**推理时怎么用好那段思考**（给它定预算、定档位），是交到用户手里的、粗粒度的外部旋钮；这一篇讲**训练时怎么让那段思考本身就不长废话**，靠的是两门内功——想得成体系，说得够精确。旋钮是外力，功夫是内力；外力只能把话压短，内力才能让废话根本不产生。

![一枚硬币的两面：推理侧是给用户的旋钮，训练侧是把分寸教进模型](/gallery/infographic-efficient-thinking/infographic-03.png)

那个在草稿纸上演算的学生，草稿之所以短，从来不是因为他刻意省字，而是因为**他想得有章法、写得够精准**——废话在落笔之前就已经不存在了。倒 U 型曲线的教训，最好的解法不是让人小心翼翼地避开右半段，而是训练出一个天生就不冲过头的模型。少说废话，说到底，是想清楚之后自然的沉默。

---

## 参考资料

**反面基线**

- DeepSeek-AI. (2025). [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948). — 纯正确率奖励、无长度约束，废话累积的典型。

**治标：直接罚长度**

- Kimi Team. (2025). [Kimi k1.5: Scaling Reinforcement Learning with LLMs](https://arxiv.org/abs/2501.12599). — length penalty + long2short 的早期系统实践。
- Luo, H., et al. (2025). [O1-Pruner: Length-Harmonizing Fine-Tuning for O1-Like Reasoning Pruning](https://arxiv.org/abs/2501.12570).
- Hou, B., et al. (2025). [ThinkPrune: Pruning Long Chain-of-Thought via RL](https://arxiv.org/abs/2504.01296). — AIME24 长度砍半、只掉约 2%，说明砍掉的多是废话。
- Wand AI. (2025). [Concise Reasoning via Reinforcement Learning](https://arxiv.org/abs/2504.05185). — 冗长是 RL 副产物，简洁化压缩 40–54%。
- Arora, D., & Zanette, A. (2025). [Training Language Models to Reason Efficiently](https://arxiv.org/abs/2502.04463). *NeurIPS 2025*. — 单一超参在效率与成本间权衡。

**功夫一：想得成体系（结构、搜索、过程打分、自我纠错）**

- Yao, S., et al. (2023). [Tree of Thoughts: Deliberate Problem Solving with LLMs](https://arxiv.org/abs/2305.10601). *NeurIPS 2023*. — 把推理从直线变成可分叉、剪枝的树。
- Guan, X., et al. (2025). [rStar-Math: Small LLMs Can Master Math Reasoning with Self-Evolved Deep Thinking](https://arxiv.org/abs/2501.04519). — MCTS + 过程奖励。
- Gandhi, K., et al. (2024). [Stream of Search (SoS): Learning to Search in Language](https://arxiv.org/abs/2404.03683). *COLM 2024*. — 拿含回溯的搜索轨迹训练模型。
- Xiang, V., et al. (2025). [Towards System 2 Reasoning in LLMs: Learning How to Think With Meta Chain-of-Thought](https://arxiv.org/abs/2501.04682). — 把"搜索过程本身"学进模型。
- Lightman, H., et al. (2023). [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050). *ICLR 2024*. — 过程奖励（PRM）优于结果奖励，PRM800K 数据集。
- Wang, P., et al. (2024). [Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations](https://arxiv.org/abs/2312.08935). — 用 MC rollout 自动做逐步标注。
- Zou, J., et al. (2025). [ReasonFlux-PRM: Trajectory-Aware PRMs for Long Chain-of-Thought Reasoning](https://arxiv.org/abs/2506.18896). *NeurIPS 2025*. — 面向长思维链的轨迹感知过程奖励。
- Madaan, A., et al. (2023). [Self-Refine: Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651). *NeurIPS 2023*.
- Shinn, N., et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366). *NeurIPS 2023*.
- Kumar, A., et al. (2024). [Training Language Models to Self-Correct via Reinforcement Learning (SCoRe)](https://arxiv.org/abs/2409.12917). — 用 RL 把自我纠错训练成稳定技能。
- Zheng, H. S., et al. (2023). [Take a Step Back: Evoking Reasoning via Abstraction in LLMs](https://arxiv.org/abs/2310.06117). *ICLR 2024*. — 先抽象出一般原理再解具体题。

**功夫二：说得够精确（草稿风格、自适应、隐空间）**

- Xu, S., et al. (2025). [Chain of Draft: Thinking Faster by Writing Less](https://arxiv.org/abs/2502.18600). — 约 7.6% token 达到相当准确率。
- Xia, H., et al. (2025). [TokenSkip: Controllable Chain-of-Thought Compression in LLMs](https://arxiv.org/abs/2502.12067).
- Ma, X., et al. (2025). [CoT-Valve: Length-Compressible Chain-of-Thought Tuning](https://arxiv.org/abs/2502.09601).
- Zhang, J., et al. (2025). [AdaptThink: Reasoning Models Can Learn When to Think](https://arxiv.org/abs/2505.13417). *EMNLP 2025*. — 长度 -53%，准确率 +2.4%。
- Fang, G., et al. (2025). [Thinkless: LLM Learns When to Think](https://arxiv.org/abs/2505.13379). *NeurIPS 2025*.
- ByteDance. (2025). [AdaCoT: Pareto-Optimal Adaptive Chain-of-Thought Triggering](https://arxiv.org/abs/2505.11896).
- Aggarwal, P., & Welleck, S. (2025). [L1: Controlling How Long a Reasoning Model Thinks with RL](https://arxiv.org/abs/2503.04697). *COLM 2025*. — LCPO，服从 prompt 中的长度目标。
- Li, Z., et al. (2025). [SelfBudgeter: Adaptive Token Allocation for Efficient LLM Reasoning](https://arxiv.org/abs/2505.11274). — 动手前先自估预算。
- Muennighoff, N., et al. (2025). [s1: Simple Test-Time Scaling](https://arxiv.org/abs/2501.19393). — budget forcing 与 "Wait"，AIME24 50→57。
- Hao, S., et al. (2024). [Training Large Language Models to Reason in a Continuous Latent Space (Coconut)](https://arxiv.org/abs/2412.06769). *COLM 2025*.
- Goyal, S., et al. (2023). [Think before you speak: Training Language Models with Pause Tokens](https://arxiv.org/abs/2310.02226). *ICLR 2024*.
- Geiping, J., et al. (2025). [Scaling up Test-Time Compute with Latent Reasoning: A Recurrent Depth Approach](https://arxiv.org/abs/2502.05171). *NeurIPS 2025*. — 3.5B 参数博出等效 50B 的推理表现。

**产品与综述**

- Moonshot AI. (2026). [Kimi K3: Open Frontier Intelligence](https://arxiv.org/abs/2607.24653). — 多 reasoning-effort 档位烤进模型，API 暴露 `reasoning_effort`。
- Sui, Y., et al. (2025). [Stop Overthinking: A Survey on Efficient Reasoning for LLMs](https://arxiv.org/abs/2503.16419). *TMLR 2025*. — 改模型/改输出/改提示的分类地图。
- Wang, R., et al. (2025). [Harnessing the Reasoning Economy: A Survey of Efficient Reasoning for LLMs](https://arxiv.org/abs/2503.24377).
