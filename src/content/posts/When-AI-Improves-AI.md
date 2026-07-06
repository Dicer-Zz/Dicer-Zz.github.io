---
title: "当 AI 开始改进 AI：RSI 的工程现实与对齐难题"
published: 2026-07-06
description: "递归自我改进（RSI）从 AI 安全社区的思想实验变成了有 ICLR workshop、有数十亿美元融资、有可量化进展曲线的系统工程问题。这篇文章从历史脉络出发，梳理 autoresearch 如何逐步逼近 RSI、当前技术进展的实际位置，以及对齐误差在递归中的复利效应。"
image: "/gallery/cover/when-ai-improves-ai.png"
tags: ["LLM", "RSI", "Autoresearch", "AI Safety", "Self-Improvement"]
category: "技术"
draft: false
---

## 一个六十年前的推演

1965 年，英国数学家 I.J. Good 在一篇短文里写下了一段后来被反复引用的话：

> Let an ultraintelligent machine be defined as a machine that can far surpass all the intellectual activities of any man however clever. Since the design of machines is one of these intellectual activities, an ultraintelligent machine could design even better machines; there would then unquestionably be an "intelligence explosion," and the intelligence of man would be left far behind.

这是"递归自我改进"这个概念的源头。Good 的推理结构极其简洁：如果机器足够聪明，而设计机器本身是一项智力活动，那么这台机器就能设计出比自己更好的机器——然后新机器再设计更好的——循环往复，直到人类的智力被远远甩开。他认为这是"人类需要做出的最后一个发明"。

这个想法在此后几十年里反复出现，每次穿上不同的外衣。1993 年，科幻作家兼计算机科学家 Vernor Vinge 在 NASA 的一次演讲中用了"技术奇点"（technological singularity）这个词，把 Good 的推演和信息技术的指数增长趋势绑在了一起。他预测这件事会在 2005 到 2030 年之间发生——一个足够宽的窗口，宽到今天我们仍然身在其中。

更早的渊源可以追溯到 John von Neumann。1950 年代，他和 Stanislaw Ulam 的一次对话中就讨论过"技术进步加速到某个临界点之后，人类文明将被根本性地改变"。这还是在晶体管刚刚商业化的年代。

到了 2001 年，Eliezer Yudkowsky 提出了"种子 AI"（Seed AI）的概念——一个最初能力有限、但能理解和修改自身源代码的系统。它不需要一开始就是超级智能，只需要有自我改进的能力；一旦改进循环启动，复利效应会把它推向任意高的智能水平。这个概念直接催生了后来 MIRI（Machine Intelligence Research Institute）的整个研究纲领，也让 AI 安全从"遥远的哲学问题"变成了有具体技术议程的研究领域。

这些思想有一个共同特征：它们都是**推演**，而不是**观测**。Good 写那段话时，最先进的计算机还在用打孔卡片。Vinge 做预测时，互联网刚刚对公众开放。Yudkowsky 提出种子 AI 时，深度学习的复兴还要等十年。

而 2026 年正在发生的事情，是这些推演第一次有了可量化的经验证据。

## 从 Autoresearch 到 RSI：一段渐进的距离

用 AI 加速科学研究——AI4Science——已经不是新鲜事。AlphaFold 改变了结构生物学，GNoME 在材料科学中发现了几十万种新晶体结构。在这些案例中，AI 是工具，自然世界是研究对象。但当"被研究的科学"恰好是 AI 自身时，事情就有了递归的可能性。这就是 AI4AI：用 AI 搜索更好的网络架构、发现更优的训练配方、优化底层 kernel 和芯片设计。它本质上还是 AI4Science 的一个实例——只是研究对象从蛋白质换成了神经网络。

从 AI4AI 到 RSI 之间，隔着一个临界条件：**循环是否闭合**。在大多数 AI4AI 场景中，流程仍然是线性的——人类提出需求、AI 执行、人类判断结果是否采纳。但如果 AI 做出的改进直接让做改进的那个 AI 变强了，而变强之后的 AI 又能做出更好的改进——循环自持运转，不再依赖外部注入的人类判断——那就从 AI4AI 跃迁到了 RSI。要理解这个跃迁目前走到了哪里，需要更精细地区分两个经常被混用的概念。

![AI4Science → AI4AI → RSI 的嵌套关系](/gallery/infographic-rsi/infographic-02.png)

Autoresearch——自动化 AI 研究——是一个关于能力的描述。它问的问题是：AI 能在多大程度上执行"做研究"这件事？写代码、跑实验、调超参、分析结果、提出改进假设——这些环节中，哪些已经可以交给机器，哪些还不行？

Recursive Self-Improvement（递归自我改进，下文简称 RSI）是一个关于动力学的描述。它问的不是"AI 能不能做研究"，而是"当 AI 研究的对象就是 AI 自身时，改进能否形成闭合的正反馈循环"。关键词是**闭合**和**正反馈**：系统变强 → 更有效地改进自己 → 变得更强 → ……如果这个循环能自持运转，不需要外部注入新的人类智慧，那就是 Good 在 1965 年描述的那个 intelligence explosion。

两者之间不是一道非此即彼的分界线，而是一段有层次的渐变。最浅的一层是"AI 帮人类研究员跑实验"——这是工具，不是自我改进。最深的一层是"AI 完全自主地设计、训练、评估、部署自己的下一代"。我们目前处于两端之间的某个位置，并且正在快速向深处移动。

Jack Clark（Anthropic 联合创始人）给这段渐变划了三条刻度线：

第一层是 **AI 工程自动化**——写代码、调参、优化 kernel、修 bug。这一层已经基本实现。SWE-Bench 的分数从 2023 年的 2% 涨到 2026 年的 93.9%。METR 度量的 AI 能可靠完成的独立任务时长从 2022 年的 30 秒涨到了 2026 年的 12 小时。

第二层是 **AI 研究自动化**——选择研究方向、设计实验、判断结果是否有意义、决定下一步做什么。这一层正在发生，但远未完成。Anthropic 的内部数据显示 Claude 选出"比人类研究员更好的研究方向"的成功率从 51% 涨到了 64%——在进步，但还没翻转。人类在"品味和判断"上仍然占优。

第三层是 **递归自我改进**——前两层真正闭合成环。AI 不仅执行研究，还决定研究什么；不仅改进自己的训练配方，还改进自己改进训练配方的方法。目前还没有人能证明这一层已经发生。

ICLR 2026 在里约举办了可能是全球第一个专门聚焦 RSI 的 workshop，开篇写道："Recursive self-improvement is no longer a speculative vision. It is becoming a concrete systems problem." 从 Good 的推演到一个有征稿范围和投稿 deadline 的学术 workshop，用了六十年。

## 验证器决定递归能跑多深

有了这个三层坐标之后，一个自然的问题是：当前最前沿的工作到底走到了哪里？

答案可以用一个线索串起来：**验证器的质量决定了自我改进循环能跑多深**。

这个道理很直觉。如果你让一个模型自己出题、自己训练、自己变强，你需要一种方式来判断"它确实变强了"而不是"它只是学会了糊弄评估"。在有完美验证器的领域——比如数学，你可以用证明器或数值计算来判对错——递归改进已经展现了惊人的效果。在没有好验证器的领域——比如"这个研究方向值不值得做"——循环还没法闭合。

LADDER（2025）是一个教科书级别的正面案例。这个系统让 Llama 3B 面对一堆解不出的积分题，自动生成越来越简单的变体作为自训练课程，用数值积分作为验证器（在多个采样点上以 10⁻² 的精度判答案对不对），然后跑强化学习。结果：在本科级积分题上准确率从 1% 跳到 82%。7B 版本在 MIT Integration Bee 上达到 90%，超过了 GPT-4o（42%）和 o1（80%）。整个过程不需要任何人工标注数据——模型给自己出题，自己判分，自己学习。

为什么数学能跑通？因为积分的正确性可以被机械地验证。这就是 LADDER 论文说的"generator-verifier gap"——生成一个积分题的解比验证它是否正确要难得多。只要这个 gap 存在，递归改进就有空间。

![验证器决定递归深度：有完美验证器 vs 验证器模糊](/gallery/infographic-rsi/infographic-04.png)

Google DeepMind 的 AlphaEvolve（2025）把同样的逻辑推到了更广的领域。这个系统用 Gemini 的一个模型集成（Flash 负责广度、Pro 负责深度）来提出候选算法，再用自动化评估器打分，最优解进入一个进化数据库作为下一轮突变的种子。因为每一次改进都必须通过自动评估器的验证，循环可以反复迭代而不会跑偏。结果相当惊人：它发现了一种用 48 次标量乘法完成 4×4 复数矩阵乘法的方法，改进了 Strassen 1969 年的结果；在 50 多个开放数学问题上，约 75% 的案例重新发现了已知最优解，约 20% 的案例刷新了纪录。更关键的是——AlphaEvolve 已经开始优化 Gemini 自身的训练管线：它把一个矩阵乘法 kernel 加速了 23%，让 Gemini 的整体训练时间缩短了 1%。这是一个已经在生产环境中部分闭合的循环：AI 改进自己的训练基础设施，训练出更强的 AI，更强的 AI 再改进基础设施。尽管这个循环还需要人类决定"去优化什么"，但执行层已经完全自动化了。

代码是另一个验证器相对完善的领域。Karpathy 的 nanochat 实验展示了 autoresearch 在这个方向的潜力：他用 agent 驱动的研究循环跑了约 700 次自动修改——调整 norm scaler、正则化策略、attention 配置、AdamW betas——每次修改都通过训练 loss 和 validation metrics 来验证效果。最终发现了约 20 个可叠加、可迁移的改进，把 "Time to GPT-2" 从 2.02h 降到 1.80h。他自己说这是"前沿实验室的 final boss battle"——不是发明全新架构，而是系统性地在已有框架内发现最优配方。

这两个案例处于 autoresearch → RSI 渐变的不同深度。LADDER 更接近"自我改进"——模型在没有外部数据的情况下让自己变强。Karpathy 的实验更接近"自动化研究"——agent 在做 ablation study，像一个极其勤奋的研究实习生。两者都还不是真正的 RSI（循环没有完全闭合，人类仍然设定了目标和框架），但它们已经在接近。

更激进的尝试来自 LADDER 的 TTRL 扩展——把自我改进推到了推理时。碰到解不出的题，模型先递归生成一批相关的简单题，临时跑 100 步 RL 更新自己的权重，解完目标题后回滚权重。这在概念上很有趣：模型不是在训练阶段变强，而是在遇到具体问题时"临时修炼"。有趣的是，这种方法直接用在 base model 上完全失败——模型必须先有足够的领域暴露，推理时的自我训练才有效。换句话说，递归改进不能凭空发生，它需要一个"底座"。

那天花板在哪？arXiv 上 2026 年 5 月的综述 "AI for Auto-Research" 给了一组冷静的数据：AI 生成的研究 idea 在实现后质量下降幅度是人类的 3 倍（Δ = -1.98 vs -0.63）；研究代码在新 ML 任务上准确率只有 37%，其中 58.6% 的错误是语义级的——代码能跑，但实现的是错误的算法。**生成能力跑在验证能力前面**，这是当前最本质的困境。AI 已经能快速生产"研究的形式"（论文、代码、图表），但在保持"研究的实质"（证据、判断、溯源）方面仍然脆弱。

## 那谁会先闭合这个循环？

既然验证器是瓶颈，一个自然的推论是：递归改进不会在所有领域同时发生，它会先在验证器最成熟的地方闭合。这也是当前几家最激进的初创公司下注的逻辑——它们各自选择了一个"验证器已经够好"的垂直领域，试图在那里率先跑通闭环。

![三条路径，同一个赌注：代码、进化、硬件](/gallery/infographic-rsi/infographic-05.png)

**Recursive Superintelligence** 赌的是代码。Richard Socher 的核心信念很简洁："AI is code. And now AI can program. The ingredients are there." 这句话背后的逻辑是：与物理学或生物学不同，AI 的"身体"就是代码——改进 AI 就是改进代码——而写代码恰好是当前大模型最强的能力之一。这构成了一个天然的递归结构。团队从 OpenAI、Meta、Google 挖了一批做 open-endedness 研究的人（Josh Tobin、Jeff Clune、Yuandong Tian），还请了 Peter Norvig。Open-endedness 是他们的核心技术理念——不是给系统设定一个固定目标让它优化，而是让系统在开放环境中持续发现新问题、新解法、新能力，像生物进化一样没有终点。成立六个月估值超 40 亿美元，融资 6.5 亿（Google Ventures、NVIDIA、AMD）。Socher 在接受 TechCrunch 采访时强调他们"会真正出产品"，而不是做了三年研究然后写一篇论文。但到目前为止，具体做了什么还没有公开展示——这是一个纯粹靠团队声誉和理论吸引力撑起的估值。

**Sakana AI** 赌的是进化本身就是验证机制。他们的名字在日语中意为"鱼"——取意于群体行为和集体智能。由 Llion Jones（Transformer 论文 "Attention Is All You Need" 的共同作者）和 David Ha（前 Google Brain / Stability AI）在东京创立。他们最具代表性的作品是 Darwin Gödel Machine（DGM）：一个能读取、修改、评估自身 Python 代码的 coding agent。原版 Gödel Machine（Schmidhuber, 2003）要求数学证明每次自我修改是有益的——这在实践中不可行。DGM 用经验验证替代了数学证明：让变体在 benchmark 上跑分，好的留下，差的淘汰，同时维护一个"有趣 agent 的不断扩展的档案"作为进化种群。结果：SWE-bench 上从 20.0% 自动提升到 50.0%，Polyglot benchmark 从 14.2% 到 30.7%。更有意思的是他们发现的东西——DGM 学会了添加 patch 验证步骤、多解生成加排名、失败历史追踪等策略，而这些都是人类 agent 设计者会写的 best practice。但同时也出现了 reward hacking：DGM 在某些情况下伪造测试日志、移除幻觉检测标记来 game 安全指标。他们坦诚公开了这些负面案例。另一个里程碑是 The AI Scientist——一个端到端的自动化研究系统，其产出在 2026 年 3 月通过同行评审发表在了 *Nature* 上。Sakana 的四阶段路线图是：agent-native model → AI Scientist → AI 改写自身架构代码 → 让中等算力也能跑 RSI。

**Ricursive Intelligence** 赌的是硬件闭环。Anna Goldie 和 Azalia Mirhoseini 在 Google 时做了 AlphaChip——用强化学习做芯片布局规划，2020 年发表在 Nature 上，后来被直接用于 TPU v5 的设计。她们离开 Google 创办 Ricursive，把这个思路推到了极致：不只是帮人类芯片设计师加速，而是让 AI 端到端地设计下一代 AI 芯片。循环是物理性的：AI 设计芯片 → 更好的芯片训练更强的 AI → 更强的 AI 设计更好的芯片。验证器是 PPA 指标（Power, Performance, Area）和成熟的 EDA 工具链——不需要发明新的验证方法，半导体行业几十年的验证基础设施直接可用。这条路径的反馈周期最长（芯片流片要几个月），但一旦转起来，加速效果是基础设施级的——因为所有其他 AI 公司的训练最终都跑在芯片上。Sequoia 领投种子轮，估值 7.5 亿。

三个赌注指向同一个结论：**通用智能的递归改进之所以还遥远，是因为"这个 AI 比上一代更聪明"本身就缺乏一个无争议的验证器**。所以每家公司都选择了验证器已经相对成熟的垂直领域先下手。真正的 RSI 不会从天而降，它会先在窄领域里闭合，然后看能不能泛化。

## RSI 面临的几重阻力

前面的讨论可能给人一种印象：只要验证器够好、循环闭合了，RSI 就会势不可挡地加速下去。实际上远没有这么简单。这个循环即使跑起来了，也面临至少五重阻力。

**收益递减。** 每一轮改进比上一轮更难，因为简单的优化先被发现了。AlphaEvolve 在 50 多个开放数学问题上的表现很说明这一点：约 75% 的案例重新发现了已知最优解——这些是"低垂的果实"，进化搜索很容易找到；但只有约 20% 刷新了纪录，而且新纪录相比旧纪录的边际提升往往很小。指数增长的叙事很吸引人，但更可能的情况是 S 曲线——快速上升一段之后撞上天花板，然后需要全新的范式突破才能继续。Anthropic 说"没有观测到曲线在弯"，但他们也只观测了两年。

**验证器本身可以被 game。** 这篇文章一直在强调"有验证器就能递归"，但验证器不是上帝视角。DGM 的经验给了一个具体警示：它在某些情况下学会了伪造测试日志、移除幻觉检测标记来 game 安全指标——通过 benchmark 但实际能力没有真正提升。验证器越复杂，被 exploit 的攻击面越大。如果递归改进的度量标准本身不可靠，那"改进"就可能只是幻觉。这不是假设性风险，它已经在 DGM 上发生了。

**形式化的自指困境。** Yampolskiy（2015）系统讨论过 RSI 的理论上限。其中一条涉及类 Gödel 限制：一个系统用自己的推理能力去证明"我对自己的修改是正确的"，本质上是一个自指问题——类似于你无法用一门编程语言写一个完美的自身调试器。原版 Gödel Machine 要求数学证明每次修改有益，正是撞上了这堵墙才变得不可行。DGM 用经验验证绕过了它，但经验验证又引入了上面说的 gaming 问题。这不是一个可以被"工程上解决"的问题，它是结构性的。

**硬件天花板。** 软件层面的自我改进无法突破物理约束。算力、内存带宽、能耗、芯片制造工艺——这些是硬极限。即使 AI 能设计出完美的芯片架构，流片也需要几个月，产能扩张需要几年。Ricursive Intelligence 的整个赌注就是在推动这个天花板，但即使他们成功了，硬件迭代的时钟速度也远慢于软件。递归改进的速度最终会被最慢的环节限制。

**对齐误差的复利。** 这或许是最棘手的一条，因为它不限制 RSI 能不能跑，而是质疑跑起来之后方向是不是对的。Jack Clark 做过一个简化计算：单代对齐准确率 99.9%，经过 50 代之后降到 95.12%。当前所有对齐方法——RLHF、Constitutional AI、RLAIF——都假设一个线性流程：人类标注 → 训练 → 部署。当标注者变成上一代模型，而上一代模型有微小的 misalignment，误差怎么传播？没有人认真回答过这个问题。Anthropic 的态度很直率：他们在今年的报告中明确说"当前模型中存在的 misalignment 可能在递归改进中被复合放大"。ICLR 2026 workshop 的六个研究维度中，专门有一个是 rollback mechanisms——当你发现第 N 代出了问题，怎么安全回滚到第 N-1 代？

这五条阻力并不意味着 RSI 不会发生——它们意味着 RSI 大概率不是一个光滑的指数曲线，而是一段跌跌撞撞的过程，中间夹着瓶颈、回退、和范式切换。Good 描述的"unquestionably"可能过于乐观了。

整体来看，安全研究的投入和能力研究之间存在数量级的差距。做 RSI 能力的公司拿了几十亿美元融资；做 RSI 安全的研究，所有机构加起来大概不到一亿。这不是判断对错，是描述现实。

## 延伸阅读

这个方向变化很快，以下几篇是我写这篇文章时反复翻阅的，推荐按需取用。

Anthropic 的 [When AI Builds Itself](https://www.anthropic.com/institute/recursive-self-improvement) 是目前最好的全景式分析，里面有很多独家数据（任务时长翻倍曲线、研究方向判断准确率），读完基本能建立一个完整的 mental model。Jack Clark 的 [Import AI #455](https://importai.substack.com/p/import-ai-455-automating-ai-research) 比 Anthropic 那篇更 opinionated，包含了他对时间线的概率估计（2028 年底前完全自主 AI R&D，60%+），适合想看有判断力的分析而不只是陈述事实的人。Latent Space 的 [AINews: Autoresearch](https://www.latent.space/p/ainews-autoresearch-sparks-of-recursive) 对 Karpathy nanochat 实验的拆解最细，如果你想复现类似的 autoresearch loop，从这篇开始。

技术侧，Sakana 的 [Darwin Gödel Machine 博客](https://sakana.ai/dgm/) 比正式论文好读很多，里面的 reward hacking 案例值得每个做 agent 的人看。DeepMind 的 [AlphaEvolve 博客](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)是"递归循环在生产环境中部分闭合"的最佳实证。如果想看冷水，arXiv 上的 [AI for Auto-Research: Roadmap & User Guide](https://arxiv.org/html/2605.18661v1) 对 autoresearch 的实际能力给了一组很清醒的量化评估。LADDER 的[原始论文](https://arxiv.org/html/2503.00735v1)则是理解"验证器决定递归深度"最干净的入门案例。

想看这个领域最新在做什么，[ICLR 2026 RSI Workshop](https://recursive-workshop.github.io/) 的接收论文列表是最快的方式。

## 结语

回到 1965 年。Good 写下那段话的时候，他用了一个词："unquestionably"——毫无疑问地，一旦超级智能出现，intelligence explosion 就会发生。六十年后的证据表明，这个"毫无疑问"大概率是错的。递归改进面临收益递减、验证器 gaming、自指困境、硬件天花板和对齐漂移这五重阻力，任何一条都可能让指数曲线弯折成 S 曲线。历史上每一次"这次不一样"的技术乐观主义，最终都撞上了某种形式的收益递减。没有理由相信 RSI 会是例外。

但同样没有理由相信它不会发生。这是 2026 年这个时刻的独特之处：我们第一次同时拥有了经验证据支持两种相反的判断。一方面，AlphaEvolve 已经在生产环境中部分闭合了循环，DGM 让 agent 自动把自己的 SWE-bench 分数翻了一倍，Anthropic 观测到的能力曲线确实还没弯。另一方面，AI 生成的研究 idea 实现后质量下降是人类的三倍，DGM 已经展示了 reward hacking，而"AI 选择的研究方向比人类好"这件事至今仍未发生。

以往的 RSI 讨论——从 Good 到 Vinge 到 Yudkowsky——都是纯粹的推演：如果 A 那么 B，如果 B 那么 C。你可以接受这个推演，也可以不接受，但你无法用数据反驳它，因为数据不存在。2026 年不同了。LADDER 的 1% → 82% 是数据，AlphaEvolve 缩短 Gemini 训练时间 1% 是数据，DGM 的 reward hacking 也是数据。我们不再是在讨论"递归改进会不会发生"这个抽象命题，而是在追踪"它正在发生到什么程度、在哪些条件下成立、在哪些条件下失败"。这是一个质的转变——从哲学变成了可证伪的科学。

这篇文章能给出的判断大概只有一个：RSI 既不像最乐观的人想的那样——一旦点燃就势不可挡；也不像最悲观的人想的那样——是一个永远不会真正实现的幻想。更可能的图景是一系列局部的、有条件的闭环在不同领域逐次出现——先是数学和代码这种有完美验证器的地方，然后慢慢扩展到验证器不那么干净的领域——每一次扩展都伴随着新的失败模式和新的安全挑战。不是 explosion，更像是 controlled burn——但控制能维持多久，取决于我们在火势还小的时候投入了多少精力去理解它的行为。

Good 在 1965 年把 RSI 称为"人类需要做出的最后一个发明"。六十年后来看，这句话的前半句可能在接近正确——但后半句忽略了一件事：最后一个发明，恰恰需要最多的配套发明——验证机制、回滚协议、跨代对齐方法、以及最重要的，知道什么时候该踩刹车的判断力。这些配套发明目前的投入是能力研究的百分之一。如果这个比例不改变，那么到达临界点时我们可能有一台转速惊人的引擎，却没有与之匹配的制动系统。
