---
title: "Multi-Token Prediction：从下一个 Token 到下 N 个 Token 的范式跃迁"
published: 2026-04-28
description: "Next-Token Prediction 统治了 LLM 训练范式近十年。2024 年，Meta 提出 Multi-Token Prediction，用多个预测头同时预测未来 N 个 token，在代码生成上提升 17%，推理速度提升 3 倍。DeepSeek-V3 将其改造为因果链式架构，Qwen3.5 和小米 MiMo 纷纷跟进。MTP 正在成为 LLM 架构的标配。"
image: "/gallery/cover/multi-token-prediction.png"
tags: ["LLM", "MTP", "Speculative Decoding", "AI"]
category: "技术"
draft: false
---

## 引言：Next-Token Prediction 的局限

自 GPT 时代以来，几乎所有主流大语言模型的训练都遵循同一个范式——**Next-Token Prediction (NTP)**：给定前文 $x_1, x_2, \ldots, x_t$，最大化 $P(x_{t+1} | x_{1:t})$。这个目标函数极其简洁，但它有一个根本性的局限：**每一步训练只提供一个 token 的监督信号**。

想象你在学写文章，老师每次只告诉你「下一个字应该写什么」，而从不告诉你「后面几句话的走向是什么」。你或许能学会在局部上写出流畅的句子，但很难培养出全局的谋篇布局能力。这正是 NTP 面临的困境——训练信号太「近视」了。

2024 年 4 月，Meta FAIR 团队发表了一篇论文 *"Better & Faster Large Language Models via Multi-token Prediction"*，提出了一个直觉上简单但效果显著的改进：**让模型同时预测未来 N 个 token**。这个被称为 Multi-Token Prediction (MTP) 的技术，不仅在代码生成任务上带来了 17% 的提升，还能让推理速度加快 3 倍——而训练开销几乎为零。

从那以后，MTP 迅速从一篇学术论文演变为工业界的标配架构。DeepSeek-V3 用它训练了 671B 参数的 MoE 模型，Qwen3.5 将其内置为原生能力，小米 MiMo 用 7B 参数的 MTP 模型打败了 32B 级别的竞争对手。

这篇文章将深入剖析 MTP 的技术细节、架构演进、理论基础和工业落地，尝试回答一个核心问题：**为什么预测多个 token 能让语言模型变得更好？**

## 一、Meta 的原始方案：独立并行头

### 1.1 核心思想

Meta 论文的核心思想用一句话概括：**在共享的 Transformer 主干网络之上，接 n 个独立的预测头，每个头分别预测未来第 1、2、...、n 个 token**。

传统 NTP 的训练损失为：

$$L_{\text{NTP}} = -\sum_t \log P_\theta(x_{t+1} | x_{1:t})$$

MTP 将其推广为：

$$L_{\text{MTP}} = -\sum_t \sum_{k=1}^{n} \log P_\theta(x_{t+k} | x_{1:t})$$

注意这里每个预测头都是**独立**的——预测 $x_{t+3}$ 的头不依赖于 $x_{t+2}$ 的预测结果。所有头共享主干的隐藏表示，但各自独立地输出 logits。

### 1.2 架构设计

具体而言，模型由两部分组成：

**共享主干（Shared Trunk）**：标准的 Transformer，接收输入序列并产生隐藏表示。无论有多少个预测头，主干只做一次前向计算。

**n 个独立预测头**：每个预测头包含一个轻量级的单层 Transformer block，以及一个与所有头共享的 unembedding 矩阵（输出投影层）。共享 unembedding 是关键的设计选择——这个矩阵的大小与词表维度 $V$ 成正比，如果每个头各复制一份，参数开销和显存消耗都会非常大。

整个前向过程可以表示为：

```
输入序列 → 共享 Transformer 主干 → 隐藏表示 h
                                      │
         ┌──────────┬──────────┬──────────┐
         ↓          ↓          ↓          ↓
      Head 1     Head 2     Head 3     Head n
    (1层TF块)  (1层TF块)  (1层TF块)  (1层TF块)
         ↓          ↓          ↓          ↓
       共享 Unembedding    共享 Unembedding
         ↓          ↓          ↓          ↓
     P(x_{t+1})  P(x_{t+2})  P(x_{t+3})  P(x_{t+n})
```

### 1.3 省显存的秘密：逐头反向传播

朴素实现下，同时计算 n 个头的 logits 需要 $O(nV + d)$ 的峰值显存（$V$ 是词表大小，$d$ 是隐藏维度）。对于 128K 级别的词表，这个开销不可忽视。

Meta 的解决方案巧妙而简单：**逐头串行地做前向+反向计算**。

1. 共享主干只做一次前向传播（最昂贵的部分）
2. 对每个头 $k = 1, 2, \ldots, n$：
   - 前向计算 Head $k$ 的 Transformer 层 + 共享 unembedding → 得到 logits
   - 计算交叉熵损失
   - 反向传播计算梯度
   - **立即丢弃该头的中间激活值**
3. 累积所有头的梯度

这样，峰值显存降至 $O(V + d)$——与只训练单头的 NTP 模型完全一样。论文报告这个实现在 A100 集群上仅增加约 **2% 的训练时间**。

### 1.4 实验结果

**代码生成（增益最大的领域）：**

- 13B 参数模型在 HumanEval 上解出的问题数 **+12%**
- 在 MBPP 上也有类似的显著提升
- 总体代码任务改善约 **+17%**

这一现象的直觉解释是：代码是一种需要「规划」的结构化语言。写一个函数需要提前想好函数签名、控制流、变量作用域。预测多个 token 迫使模型的内部表示编码更长距离的结构信息——比如匹配的括号、函数签名的一致性。

**自然语言任务**：提升相对温和（约 +2.4%），但有一个关键发现——**模型越大，从 MTP 获益越多**。

**最优头数**：系统实验表明，对于标准子词分词器，**n=4** 是最优的头数；对于字节级分词器，最优值提高到 **n=8**——因为单个字节携带的信息量更少，需要预测更多步才能捕获有意义的模式。

## 二、DeepSeek-V3 的改造：因果链式架构

Meta 的方案是「独立并行头」，每个头只看共享主干的输出。DeepSeek-V3 在 2024 年 12 月提出了一个关键的架构变体：**将并行头改为串行的因果链**。

### 2.1 架构差异

在 DeepSeek-V3 中，MTP 模块不再独立运行，而是形成一条因果依赖链：

- 第 $k$ 个 MTP 模块的输入 = 第 $(k-1)$ 个模块的 RMSNorm 输出 ⊕ 第 $(i+k)$ 个 token 的 RMSNorm embedding
- 两者拼接后经过线性投影，再送入该层的 Transformer block

这意味着预测 $x_{t+2}$ 时，模型能利用预测 $x_{t+1}$ 时积累的信息——形成了一条完整的因果推理链条。

用表格对比两种架构：

| 维度 | Meta（2024） | DeepSeek-V3（2024） |
|------|-------------|---------------------|
| 头间依赖 | 无（独立并行） | 有（因果链式） |
| 预测深度 | 最优 n=4 | 实践中 D=1 |
| 共享组件 | 仅共享主干 | 共享 embedding + 共享输出头 |
| 额外参数 | n 个单层 TF 块 | 14B（主模型 671B） |
| 推理用途 | 自投机解码 | 同样用于投机解码 |

### 2.2 为什么因果链更好？

直觉上，独立并行头在预测 $x_{t+3}$ 时，对 $x_{t+1}$ 和 $x_{t+2}$ 的内容完全不知情——它只能从主干的通用表示出发去「猜」三步之后的 token。而因果链式架构让每一步预测都能站在前一步的肩膀上，信息传递更加充分。

但这也引入了一个 trade-off：因果链必须串行计算（不能并行），在训练时会增加一些延迟。DeepSeek-V3 的解决方案是只用 **D=1**（一个额外 MTP 模块），在收益和开销之间取得平衡。

### 2.3 双重用途

DeepSeek-V3 的 MTP 模块有一个优雅的双重用途设计：

**训练时**：MTP 作为辅助训练目标，改善主模型的表示质量。即使在推理时丢弃 MTP 模块，主模型依然受益于更丰富的训练信号。

**推理时**：MTP 模块摇身一变成为投机解码（Speculative Decoding）的 draft 模型。传统投机解码需要维护一个独立的小模型作为 drafter，而 MTP 模块天然就是一个训练好的 drafter——不需要额外训练，不需要额外部署。

DeepSeek-R1 继承了这一架构。NVIDIA 的 TensorRT-LLM 专门为 R1 的 MTP 投机解码做了 Blackwell GPU 级别的 kernel 优化。

## 三、投机解码：MTP 的推理加速

MTP 不仅改善训练质量，更直接带来了**推理加速**的能力。这个加速机制的核心是 **Speculative Decoding（投机解码）**。

### 3.1 投机解码的基本原理

标准自回归解码的瓶颈在于：生成每个 token 都需要一次完整的前向传播，而且前后两个 token 的生成不能并行（后一个依赖前一个）。Transformer 在解码阶段是「算力受限」还是「访存受限」取决于 batch size，但单条请求的延迟始终受限于串行步数。

投机解码的思路是：用一个快速的 **draft 模型**先「猜」出 $k$ 个后续 token，然后用主模型做一次前向传播来**并行验证**这 $k$ 个猜测。如果猜对了若干个，就等于用一次前向传播生成了多个 token，实现了加速。

关键在于：验证步骤可以保证输出分布与原始自回归解码**完全一致**（lossless），因此不存在质量损失。

### 3.2 MTP 作为天然的 Drafter

传统投机解码需要单独训练和部署一个 draft 模型（通常是主模型的小型蒸馏版本），增加了工程复杂度。MTP 预测头提供了一个优雅的替代方案：

- 训练时学会预测未来 token 的 MTP 头，在推理时直接充当 drafter
- 无需单独训练、无需额外显存、与主模型无缝集成
- Meta 的 7B 4-token 预测模型实现了 **最高 3 倍加速**

### 3.3 投机解码生态

MTP 催生了一系列投机解码框架：

**EAGLE 系列**（北大 SafeAILab）：EAGLE-1 通过外推模型倒数第二层的特征向量来生成 draft token，实现 3 倍加速；EAGLE-2 引入动态 draft 树结构，达到 4-5.6 倍加速；EAGLE-3（2025 年 3 月）抛弃了特征级约束，改为直接生成 token，达到**最高 6.5 倍加速**。

**Medusa**（Together AI / Princeton）：在基座模型上接多个解码头，使用树状注意力机制同时生成和验证多个候选延续。Medusa-1 冻结主模型只训练新头，实现 2.2 倍加速。

**Lookahead Decoding**（LMSYS / UC Berkeley）：基于 Jacobi 迭代的零训练方案，利用 n-gram 池动态缓存候选 token，实现 1.5-2.3 倍加速。完全不需要额外训练。

| 方法 | 需要训练 | 无损 | 典型加速 | 需要 draft 模型 |
|------|---------|------|---------|---------------|
| MTP (DeepSeek) | 是（预训练阶段） | 是 | ~1.8x | 否（复用 MTP 模块） |
| EAGLE-3 | 是（轻量级） | 是 | 最高 6.5x | 是（小型 draft 头） |
| Medusa-1 | 是（头训练） | 是 | ~2.2x | 否（用主模型+头） |
| Lookahead | 否 | 是 | 1.5-2.3x | 否 |

### 3.4 服务框架的原生支持

2025 年，主流推理框架已全面支持 MTP 投机解码：

- **vLLM**：通过 `method: "mtp"` 配置原生支持 DeepSeek、Qwen3.5、MiMo 模型家族
- **SGLang**：支持 `--speculative-algo NEXTN --speculative-num-steps 3`，并深度集成 EAGLE-3
- **TensorRT-LLM**：为 DeepSeek-R1 的 MTP 做了 Blackwell GPU kernel 级优化

## 四、工业界的广泛采用

截至 2026 年初，MTP 已从学术论文演变为多家顶级 AI 公司的标准架构选择。

### 4.1 Qwen3.5（阿里巴巴，2025-2026）

Qwen3.5 是第一个在模型卡上明确标注 "MTP: trained with multi-steps" 的主流开源模型家族。MTP 被烘焙进预训练过程，SGLang 和 vLLM 均提供开箱即用的 MTP 投机解码支持。

### 4.2 MiMo（小米，2025）

小米的 MiMo-7B-Base 在 25 万亿 token 上预训练，使用 MTP 作为额外的训练目标。令人印象深刻的是，这个 7B 模型在推理任务上超越了许多 32B 模型，经过 RL 微调后在编程和数学上超过了 OpenAI o1-mini。

MiMo 的案例表明：MTP 不仅适用于超大模型，在中等规模模型上同样能释放巨大潜力——尤其是与强化学习结合时。

### 4.3 DeepSeek-R1

R1 继承了 V3 的 MTP 架构。其突破性的创新在于将 MTP 增强的基座模型与强化学习驱动的链式推理结合。MTP 提供了更好的内部表示基础，RL 则教会模型如何在 token 空间中显式地「推理」。两者互补：MTP 改善每一步推理的质量，RL 组织整体的推理过程。

## 五、理论基础：为什么预测多个 Token 有效？

### 5.1 信息论视角：更密的训练信号

标准 NTP 每步只提供一个 token 的监督信号。从信息论角度看，这是一个相当窄的信息通道——关于序列全局结构的大量信息被压缩成了对单个 token 的预测。

MTP 将信息通道拓宽了 $n$ 倍。模型的内部表示必须编码足够丰富的信息，才能同时支撑对 $n$ 个不同位置的准确预测。这等价于对表示质量施加了更强的约束，迫使模型学习更具全局性的特征。

一个类比：NTP 像是通过窥视孔看世界，每次只看一个像素；MTP 像是把窥视孔扩大成窗户，一次看到更多的画面。

### 5.2 梯度解耦与规划能力

2026 年 4 月的一篇理论论文 *"How Transformers Learn to Plan via Multi-Token Prediction"* 给出了迄今最严格的理论分析。

作者在一个两层 Transformer 的路径查找任务上证明了：

**NTP 的失败模式**：在标准 NTP 下，梯度信号是纠缠的。当 Layer 2 未初始化时，NTP 的梯度在整个上下文中扩散，模型无法发现完成路径规划所需的「反向推理回路」。

**MTP 的成功机制**：MTP 中浅层预测头（预测 $x_{t+2}$）的梯度**专门经过 Layer 1**，绕过了未初始化的 Layer 2。这种**梯度解耦**提供了隔离的训练信号，让每层可以独立学习自己的功能：
- **Phase I**：Layer 1 通过浅层 MTP 损失收敛到「通用前驱指针」（纯位置学习）
- **Phase II**：Layer 1 固定后，深层损失优化 Layer 2 进行内容匹配

简言之，MTP 不只是提升了 token 级别的准确率——它从根本上改变了学习动力学，使模型能够发展出 NTP 无法单独实现的**规划能力**。

### 5.3 隐式的「思考」能力

2025 年的一个有趣发现是：用标准 NTP 训练的 LLM 在隐藏状态中**已经编码了关于多个未来 token 的信息**，只是这种能力是潜在的、未被显式利用的。MTP 训练做的事情是把这种潜在能力「激活」并强化——让模型显式地学会利用它。

这也解释了 MTP 与链式思维（Chain-of-Thought）推理的关系：

- MTP 在表示空间中培养「隐式规划」能力（模型的隐藏状态编码了对未来的预判）
- CoT 在 token 空间中展开「显式推理」过程（模型通过输出中间步骤来推理）
- 两者互补：MTP 改善每一步推理的基础质量，CoT 组织整体的推理链条

DeepSeek-R1 和小米 MiMo 正是这种组合的成功案例——MTP 预训练 + RL 驱动的 CoT。

## 六、前沿研究方向

MTP 的故事远未结束。2025-2026 年涌现了多个推进 MTP 边界的研究方向：

### 6.1 L-MTP：跳跃式多 Token 预测

标准 MTP 只预测**相邻**的未来 token（+1, +2, +3...）。NeurIPS 2025 的 L-MTP（Leap Multi-Token Prediction）引入了**跳跃机制**，可以预测非相邻的未来 token，理论上能提供更好的梯度信号来学习长距离依赖。

### 6.2 Future Summary Prediction：超越逐 Token 预测

与其预测 $n$ 个独立的未来 token，不如训练一个辅助头来预测未来序列的**紧凑摘要向量**。这种方法在 ARC 和 MATH 基准上一致超越标准 MTP，可能代表了 MTP 的下一个演进方向。

### 6.3 MTP 自蒸馏

MTP 头在投机解码中的接受率往往有限。2025 年的 MTP-D 方案通过自蒸馏来对齐训练和推理时的使用模式，将接受率提升了 **+7.5%**。

### 6.4 Register Tokens

NeurIPS 2025 的另一篇工作提出在输入序列中交错插入可学习的 register token 来支持 MTP，不需要架构改动，额外参数几乎可忽略。

### 6.5 FastMTP

腾讯的 FastMTP 方案解决了 MTP 头训练-推理不匹配的问题，通过位置共享权重和语言感知的动态词表压缩，在 7 个基准上实现了 **2.03 倍平均加速**，比原始 MTP 提升了 82%。

## 七、总结与展望

回顾 MTP 的发展历程，可以清晰地看到几个阶段：

**2024 年 4 月**，Meta 奠定了理论和实验基础，证明了在共享主干上接多个独立预测头就能显著提升模型质量并加速推理。

**2024 年 12 月**，DeepSeek-V3 用因果链式架构重新诠释了 MTP，并创造性地将其用于训练和推理的双重目的。

**2025 年**，EAGLE-3、vLLM、SGLang、TensorRT-LLM 构建了生产级的 MTP 投机解码基础设施。Qwen3.5 和 MiMo 将 MTP 内置为原生训练组件。

**2026 年**，理论研究解释了 MTP 如何通过梯度解耦实现规划能力，前沿工作正在探索跳跃预测、摘要预测等更高级的多 token 目标。

MTP 的成功传递了一个深刻的洞察：**训练目标的设计，可能比模型架构的改动更能释放 Transformer 的潜力**。从 GPT 到 MTP，我们并没有改变 Transformer 的核心结构，只是把「看一步」变成了「看 N 步」，就获得了质量和速度的双重提升。

下一个问题或许是：如果预测多个 token 这么好，那预测一段**语义**而非离散 token 会不会更好？Future Summary Prediction 已经在探索这个方向。当模型的训练目标从「预测下一个 token」演进到「预测未来的含义」，可能才是 LLM 训练范式真正的范式转换。

## 参考文献

1. Gloeckle, F., et al. "Better & Faster Large Language Models via Multi-token Prediction." ICML 2024. [arXiv:2404.19737](https://arxiv.org/abs/2404.19737)
2. DeepSeek-AI. "DeepSeek-V3 Technical Report." 2024. [arXiv:2412.19437](https://arxiv.org/abs/2412.19437)
3. Li, Y., et al. "EAGLE-3: Scaling up Speculative Decoding." 2025. [arXiv:2503.01840](https://arxiv.org/abs/2503.01840)
4. Cai, T., et al. "Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads." 2024. [arXiv:2401.10774](https://arxiv.org/abs/2401.10774)
5. "How Transformers Learn to Plan via Multi-Token Prediction." 2026. [arXiv:2604.11912](https://arxiv.org/abs/2604.11912)
6. Xiaomi. "MiMo: Unlocking the Reasoning Potential of Language Model." 2025. [arXiv:2505.07608](https://arxiv.org/abs/2505.07608)
7. Cai, S., et al. "FastMTP: Accelerating LLM Inference with Enhanced Multi-Token Prediction." 2025. [arXiv:2509.18362](https://arxiv.org/abs/2509.18362)
