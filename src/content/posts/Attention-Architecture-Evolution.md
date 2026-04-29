---
title: "Attention 架构演进：从 MHA 到 MLA，一场关于 KV Cache 的战争"
published: 2026-04-29
description: "2017 年 Vaswani 提出 Multi-Head Attention，开启了 Transformer 时代。七年间，MQA、GQA、MLA、Differential Attention、Native Sparse Attention 相继登场，每一步都在回答同一个问题：如何在不损失质量的前提下，让注意力机制更快、更省？本文从数学公式出发，梳理这场架构演进的完整脉络。"
image: "/gallery/cover/attention-evolution.png"
tags: ["LLM", "Attention", "Transformer", "AI"]
category: "技术"
draft: false
---

## 引言：一切始于那个平方

2017 年，Vaswani 等人在 *"Attention Is All You Need"* 中提出了 Transformer 架构，其核心是 **Multi-Head Attention (MHA)**。这个机制简洁而强大——它让序列中的每个 token 都能「看到」所有其他 token，通过学习 Query、Key、Value 三组投影来计算注意力权重。

但 MHA 有一个与生俱来的代价：**KV Cache**。

在自回归推理中，每生成一个新 token，模型需要缓存所有已生成 token 的 Key 和 Value 向量。对于一个 32 层、32 头、head 维度 128 的模型，每个 token 的 KV Cache 占用 512 KB（FP16）。一个 4096 token 的上下文就需要 2 GB 的纯 KV Cache——这还只是一条请求。当你要同时服务成千上万的用户时，KV Cache 就成了 GPU 显存中最大的「房间里的大象」。

过去七年，Attention 架构的演进本质上就是一场围绕 KV Cache 的战争：**如何在保持注意力质量的前提下，尽可能压缩 KV Cache 的大小？** 从 MQA 的「共享一切」到 GQA 的「分组折中」，再到 MLA 的「低秩压缩」，每一步都是对这个问题的不同回答。

## 一、MHA：万物起源

### 1.1 数学公式

给定输入隐藏状态 $\mathbf{X} \in \mathbb{R}^{n \times d_{\text{model}}}$（$n$ 为序列长度），MHA 为每个头 $i$（共 $n_h$ 个头）独立计算 Q、K、V：

$$\mathbf{Q}_i = \mathbf{X} \mathbf{W}_i^Q, \quad \mathbf{K}_i = \mathbf{X} \mathbf{W}_i^K, \quad \mathbf{V}_i = \mathbf{X} \mathbf{W}_i^V$$

其中 $\mathbf{W}_i^Q, \mathbf{W}_i^K \in \mathbb{R}^{d_{\text{model}} \times d_h}$，$d_h = d_{\text{model}} / n_h$ 是每个头的维度。

每个头的注意力计算为：

$$\text{head}_i = \text{softmax}\left(\frac{\mathbf{Q}_i \mathbf{K}_i^\top}{\sqrt{d_h}}\right) \mathbf{V}_i$$

最终拼接所有头的输出，经过一个输出投影：

$$\text{MHA}(\mathbf{X}) = \text{Concat}(\text{head}_1, \ldots, \text{head}_{n_h}) \mathbf{W}^O$$

### 1.2 参数量与 KV Cache

**参数量**（每层）：Q、K、V 各 $d_{\text{model}}^2$ 个参数，加上输出投影 $d_{\text{model}}^2$，共 $4 d_{\text{model}}^2$。

**KV Cache**（每 token 每层）：需要缓存 $n_h$ 个头的 K 和 V，共 $2 \times n_h \times d_h$ 个元素。

以 GPT-3（$d_{\text{model}}=12288$，$n_h=96$，$d_h=128$）为例：每 token 每层缓存 $2 \times 96 \times 128 = 24576$ 个元素，96 层合计约 **4.5 MB/token**（FP16）。一个 2048 token 的上下文就要 **9 GB** 的 KV Cache。

### 1.3 谁在用

GPT-1/2/3（OpenAI）、BERT（Google）、原始 Transformer——所有 2017-2022 年的主流模型都使用标准 MHA。它是黄金标准，但也是最昂贵的。

## 二、MQA：一个极端的想法

### 2.1 核心思想

2019 年，Google 的 Noam Shazeer 在 *"Fast Transformer Decoding: One Write-Head is All You Need"* 中提出了一个激进的想法：**所有头共享同一组 K 和 V**。

直觉上这似乎不可思议——如果所有头看到的 Key 和 Value 完全一样，注意力的「多头多视角」优势不就丧失了吗？但 Shazeer 发现，不同头之间的 K、V 本身就高度相关，共享它们造成的质量损失远小于预期。

### 2.2 数学公式

$$\mathbf{Q}_i = \mathbf{X} \mathbf{W}_i^Q \quad (\text{每个头独立})$$

$$\mathbf{K} = \mathbf{X} \mathbf{W}^K, \quad \mathbf{V} = \mathbf{X} \mathbf{W}^V \quad (\textbf{所有头共享})$$

$$\text{head}_i = \text{softmax}\left(\frac{\mathbf{Q}_i \mathbf{K}^\top}{\sqrt{d_h}}\right) \mathbf{V}$$

唯一的区别在于 K 和 V 的投影矩阵只有一份，而不是 $n_h$ 份。

### 2.3 KV Cache 压缩

每 token 每层的 KV Cache 从 $2 \times n_h \times d_h$ 降到 $2 \times d_h$，**压缩了 $n_h$ 倍**。对于 32 头模型，这是 32 倍的压缩。

但代价是：质量确实会下降。单一的 K、V 必须编码足以满足所有 Query 头需求的信息，这是一个过于苛刻的约束。在需要多样化注意力模式的任务上，MQA 的劣势尤为明显。

### 2.4 谁在用

PaLM（Google，2022）、Falcon-40B/180B（TII，2023）、StarCoder（BigCode，2023）、ChatGLM2（智谱）。MQA 在大规模推理场景中很有吸引力，但因质量损失问题，未能成为主流标准。

## 三、GQA：优雅的折中

### 3.1 核心思想

2023 年，Google Research 的 Ainslie 等人提出了 **Grouped-Query Attention (GQA)**。核心思想极为简洁：将 $n_h$ 个 Query 头分成 $n_g$ 个组，每组内共享一套 K、V。

$$\text{GQA} = \begin{cases} \text{MHA} & \text{当 } n_g = n_h \\ \text{MQA} & \text{当 } n_g = 1 \\ \text{折中} & \text{当 } 1 < n_g < n_h \end{cases}$$

GQA 不是一个新想法，而是一个**光谱上的正确位置**。它用一个参数 $n_g$ 连续地在 MHA 和 MQA 之间插值。

### 3.2 数学公式

设 $n_h$ 个 Query 头被分成 $n_g$ 组，每组 $n_h / n_g$ 个头。对于第 $i$ 个 Query 头，其所属的组为 $g(i) = \lceil i \cdot n_g / n_h \rceil$：

$$\mathbf{Q}_i = \mathbf{X} \mathbf{W}_i^Q \quad (\text{每个头独立})$$

$$\mathbf{K}_j = \mathbf{X} \mathbf{W}_j^K, \quad \mathbf{V}_j = \mathbf{X} \mathbf{W}_j^V \quad (j = 1, \ldots, n_g)$$

$$\text{head}_i = \text{softmax}\left(\frac{\mathbf{Q}_i \mathbf{K}_{g(i)}^\top}{\sqrt{d_h}}\right) \mathbf{V}_{g(i)}$$

### 3.3 KV Cache 压缩

每 token 每层的 KV Cache 为 $2 \times n_g \times d_h$，相比 MHA 压缩了 $n_h / n_g$ 倍。

典型配置 $n_h = 32, n_g = 8$（LLaMA 2/3、Mistral）：压缩 4 倍。这个比例在实践中被证明是质量和效率的最佳平衡点——质量几乎无损，KV Cache 减少到 1/4。

### 3.4 从 MHA 到 GQA 的「上训练」

GQA 论文的另一个关键贡献是：**现有的 MHA 模型可以转换为 GQA 模型**。方法是将同一组内的 K、V 投影矩阵取均值池化，然后只需约 5% 的原始预训练量进行继续训练。这避免了从头训练的巨大开销。

### 3.5 谁在用

GQA 是当前的事实标准。LLaMA 2/3/3.1/3.2/3.3（Meta）、Mistral 7B 及 Mixtral（Mistral AI）、Qwen2/2.5/3（阿里巴巴）、Gemma/Gemma 2（Google）、Yi（零一万物）、StarCoder2、Command R（Cohere）——几乎所有 2023 年后的主流开源模型都采用了 GQA。

## 四、MLA：降维打击

### 4.1 一个不同的思路

2024 年 5 月，DeepSeek 在 V2 技术报告中提出了 **Multi-head Latent Attention (MLA)**。与 MQA/GQA 通过减少 KV 头数来压缩 Cache 不同，MLA 走了一条全新的路：**通过低秩联合压缩，将 KV 投影到一个低维的潜在空间。**

这是一个思维范式的转换。MQA/GQA 是在问「哪些头可以共享 KV？」，而 MLA 是在问「KV 中真正有用的信息有多少维？」

### 4.2 数学公式

**第一步：KV 联合压缩**

对于位置 $t$ 的隐藏状态 $\mathbf{h}_t$，将 KV 投影到一个 $d_c$ 维的潜在向量：

$$\mathbf{c}_t^{KV} = \mathbf{W}^{DKV} \mathbf{h}_t, \quad \mathbf{W}^{DKV} \in \mathbb{R}^{d_c \times d_{\text{model}}}$$

其中 $d_c \ll n_h \times d_h$。**推理时只需缓存这个 $d_c$ 维的潜在向量**，而不是完整的 K 和 V。

需要时，通过上投影矩阵恢复出完整的 K 和 V：

$$\mathbf{K}_C = \mathbf{W}^{UK} \mathbf{c}_t^{KV}, \quad \mathbf{V} = \mathbf{W}^{UV} \mathbf{c}_t^{KV}$$

**第二步：解耦的 RoPE**

RoPE（旋转位置编码）是逐元素应用的，与低秩压缩不兼容——如果直接在压缩后的表示上应用 RoPE，推理时的矩阵吸收技巧就无法使用。DeepSeek 的解决方案是**将位置信息解耦**出来：

$$\mathbf{K}_t = [\mathbf{K}_{C,t} \;;\; \mathbf{K}_{R,t}]$$

其中 $\mathbf{K}_{C,t}$ 是从潜在向量恢复的内容键（不含位置编码），$\mathbf{K}_{R,t} = \text{RoPE}(\mathbf{W}^{KR} \mathbf{h}_t)$ 是独立的位置键，维度仅为 $d_{\text{rope}}$（例如 64）。

**第三步：Query 同样做低秩压缩**

$$\mathbf{c}_t^Q = \mathbf{W}^{DQ} \mathbf{h}_t, \quad \mathbf{Q}_{C,t} = \mathbf{W}^{UQ} \mathbf{c}_t^Q$$

$$\mathbf{Q}_{R,t} = \text{RoPE}(\mathbf{W}^{QR} \mathbf{c}_t^Q), \quad \mathbf{Q}_t = [\mathbf{Q}_{C,t} \;;\; \mathbf{Q}_{R,t}]$$

**第四步：注意力分数的分解**

$$\mathbf{Q}_t \cdot \mathbf{K}_s^\top = \mathbf{Q}_{C,t} \cdot \mathbf{K}_{C,s}^\top + \mathbf{Q}_{R,t} \cdot \mathbf{K}_{R,s}^\top$$

注意力分数自然分解为**内容相关性**和**位置相关性**两个独立的分量——这不仅数学上优雅，也有直觉上的合理性。

### 4.3 推理时的矩阵吸收技巧

MLA 的另一个精妙之处在于推理优化。内容注意力的计算可以展开为：

$$\mathbf{Q}_{C} \cdot \mathbf{K}_{C}^\top = (\mathbf{W}^{UQ} \mathbf{c}^Q) \cdot (\mathbf{W}^{UK} \mathbf{c}^{KV})^\top = \mathbf{c}^Q \cdot (\mathbf{W}^{UQ})^\top \mathbf{W}^{UK} \cdot \mathbf{c}^{KV}$$

矩阵 $(\mathbf{W}^{UQ})^\top \mathbf{W}^{UK}$ 可以预计算并融合，这意味着推理时**直接用低维潜在向量计算注意力**，无需恢复出完整的 K 矩阵。V 的上投影同理可以被吸收到输出投影中。

### 4.4 KV Cache 的惊人压缩

以 DeepSeek-V2 为例（$n_h = 128$，$d_h = 128$，$d_c = 512$，$d_{\text{rope}} = 64$）：

| 方法 | 每 token 每层缓存元素数 | 相对 MHA 压缩比 |
|------|----------------------|---------------|
| MHA | $2 \times 128 \times 128 = 32768$ | 1x |
| GQA (8 组) | $2 \times 8 \times 128 = 2048$ | 16x |
| MQA | $2 \times 128 = 256$ | 128x |
| **MLA** | $512 + 64 = 576$ | **57x** |

MLA 的压缩率介于 GQA 和 MQA 之间，但关键区别是：**MLA 的质量不仅不降，甚至优于同等配置的 MHA**。因为低秩压缩相当于一个正则化器，迫使模型在潜在空间中学习更紧凑、更有效的表示。

### 4.5 谁在用

DeepSeek-V2/V2.5/V3/R1 全线采用 MLA。目前 MLA 仍是 DeepSeek 的独家技术，但 2025 年已有 TransMLA 等研究探索将现有 GQA 模型转换为 MLA 架构。

## 五、其他重要的注意力变体

### 5.1 滑动窗口注意力（SWA）

Mistral 7B（2023）将此机制推向主流：每个 token 只关注最近 $W$ 个 token（例如 $W = 4096$），而非整个上下文。

$$\text{SWA}(\mathbf{Q}_t) = \text{softmax}\left(\frac{\mathbf{Q}_t \mathbf{K}_{[t-W:t]}^\top}{\sqrt{d_h}}\right) \mathbf{V}_{[t-W:t]}$$

单层的感受野是 $W$，但通过层层堆叠，$L$ 层后的理论感受野达到 $L \times W$。Mistral 7B（32 层，$W=4096$）的感受野为 131072 个 token。SWA 的 KV Cache 是固定大小的循环缓冲区，不随序列长度增长。

Gemma 2 采用了一种混合策略：交替使用全注意力层和 SWA 层。

### 5.2 Differential Attention

2024 年 10 月，微软研究院提出 **Differential Transformer**，将每个头的 Q 和 K 各分成两半，计算两个 softmax 注意力图的**差值**：

$$\text{DiffAttn}(\mathbf{X}) = \left[\text{softmax}\left(\frac{\mathbf{Q}_1 \mathbf{K}_1^\top}{\sqrt{d}}\right) - \lambda \cdot \text{softmax}\left(\frac{\mathbf{Q}_2 \mathbf{K}_2^\top}{\sqrt{d}}\right)\right] \mathbf{V}$$

其中 $\lambda$ 是可学习的标量。这种「噪声消除」机制有效减少了注意力中的噪声分量（不相关 token 获得的虚假注意力权重），在长上下文任务和减少幻觉方面效果显著。论文报告：以约 65% 的模型规模就能匹配标准 Transformer 的性能。

### 5.3 Native Sparse Attention（NSA）

DeepSeek 在 2025 年 2 月提出的 NSA 获得了 **ACL 2025 最佳论文**。它将注意力分解为三条并行路径：

**Token 压缩分支**：将 token 块压缩为摘要表示，提供粗粒度的全局上下文。

**Token 选择分支**：基于压缩分支的注意力分数，选出 top-k 个最相关的 token，提供细粒度的关键上下文。

**滑动窗口分支**：关注最近 $W$ 个 token，提供局部上下文。

三条路径通过学习到的门控权重融合：

$$\text{Output} = g_{\text{cmp}} \cdot \mathbf{A}_{\text{cmp}} + g_{\text{sel}} \cdot \mathbf{A}_{\text{sel}} + g_{\text{win}} \cdot \mathbf{A}_{\text{win}}$$

关键创新在于所有分支都是可微的（包括 token 选择，通过 straight-through 估计器），因此模型可以端到端地用稀疏注意力训练——不存在训练-推理不一致的问题。

### 5.4 FlashAttention：不改架构改实现

FlashAttention（Tri Dao 等人，2022-2024）不是一个新的注意力架构，而是一种 **IO 感知的精确注意力实现**。它通过分块计算和在线 softmax 技巧，避免将完整的 $n \times n$ 注意力矩阵写入 GPU HBM：

标准实现的 HBM 读写量：$O(n^2 d)$

FlashAttention 的 HBM 读写量：$O(n^2 d^2 / M)$（$M$ 为 SRAM 大小）

显存从 $O(n^2)$ 降到 $O(n)$，速度提升 2-4 倍。FlashAttention 已经是事实上的通用基础设施——LLaMA、Mistral、GPT-4、Claude、Gemini、DeepSeek、Qwen 等所有主流模型的训练和推理都在使用它。

### 5.5 混合架构的趋势

Qwen3-Next（阿里巴巴，2025 年）标志着一个重要趋势：**混合注意力架构**。它以 3:1 的比例混合了 Gated DeltaNet（一种线性注意力变体，推理时 $O(1)$ 复杂度、恒定内存）和 Gated Attention（标准 softmax 注意力 + 门控机制）。这种设计大幅减少了推理时的 KV Cache 增长，同时保持了质量。

RetNet（微软，2023）提出的多尺度保持机制（Multi-Scale Retention）也属于这个方向：通过指数衰减因子 $\gamma$ 替代 softmax，实现了训练时并行、推理时递归的双模式计算。

## 六、全景对比与演进脉络

### 6.1 KV Cache 压缩的定量对比

以 $n_h = 32$，$d_h = 128$，FP16 为例，每 token 每层的 KV Cache 大小：

| 机制 | 缓存大小 (bytes) | 相对 MHA | 质量影响 | 年份 |
|------|----------------|---------|---------|------|
| MHA | 16,384 | 1x | 基线 | 2017 |
| MQA | 512 | 32x 压缩 | 轻微下降 | 2019 |
| GQA ($n_g=8$) | 4,096 | 4x 压缩 | 几乎无损 | 2023 |
| MLA | ~1,152 | ~14x 压缩 | 持平或更优 | 2024 |

### 6.2 演进的五个阶段

**2017-2020：MHA 时代**。原始注意力机制，简洁强大但昂贵。GPT 系列和 BERT 奠定了 Transformer 的统治地位，KV Cache 的问题尚未成为瓶颈（模型规模和上下文长度都较小）。

**2019-2022：MQA 萌芽**。Shazeer 的洞察——K、V 共享是可行的——为后续所有工作奠定了基础。PaLM 是第一个在超大规模上验证 MQA 的模型，但质量损失限制了其广泛采用。

**2023：GQA 成为标准**。Ainslie 的 GQA 找到了 KV 压缩光谱上的最优位置。从 MHA checkpoint 上训练转换的能力是其被广泛采用的关键因素。LLaMA 2 的发布使 GQA 成为事实标准，此后几乎所有主流模型都跟进。

**2024：MLA 革命**。DeepSeek 的 MLA 证明了 KV 压缩问题可以从一个全新的角度——低秩投影——来攻克。它不是在「选择共享哪些头」，而是在问「KV 的本征维度是多少」。这种方法实现了更大的压缩率和更好（或不降的）质量。

**2025：多元融合**。前沿正在走向混合架构——Qwen3-Next 混合线性注意力与 softmax 注意力，NSA 将压缩、选择和局部注意力融为一体，Differential Attention 用减法消除噪声。越来越清楚的是，**没有单一的注意力机制能在所有场景下最优**，未来属于在同一模型中灵活组合多种注意力类型的架构。

## 七、反思：为什么 KV Cache 如此重要？

回头看这段历史，一个有趣的观察是：**训练时的计算量和推理时的 KV Cache 是两个几乎独立的瓶颈**。

训练时，FLOPs 是主要约束，序列长度带来 $O(n^2)$ 的计算开销。FlashAttention 和稀疏注意力主要在解决这个问题。

推理时，**内存带宽**才是真正的瓶颈。自回归解码的每一步都需要从 HBM 加载完整的 KV Cache，而现代 GPU 的计算能力远超其内存带宽。MQA/GQA/MLA 都在解决这个问题——减少 KV Cache 大小直接减少了 HBM 读取量，从而提高了解码吞吐。

这也解释了为什么 MLA 尽管数学上更复杂（需要额外的投影矩阵），但推理速度反而更快——因为投影的计算量远小于 KV Cache 读取节省的带宽。在内存受限的推理场景下，**少读一些数据比少算一些乘法重要得多**。

## 结语

从 MHA 到 MLA，Attention 架构的演进遵循了一条清晰的数学逻辑：

$$\text{MHA} \xrightarrow[\text{共享全部 KV}]{n_h \to 1} \text{MQA} \xrightarrow[\text{分组共享 KV}]{1 \to n_g} \text{GQA} \xrightarrow[\text{低秩压缩 KV}]{\text{降维}} \text{MLA}$$

每一步都在回答同一个问题：KV Cache 中有多少冗余信息可以被安全移除？MQA 说「不同头之间的 KV 高度冗余」；GQA 说「适度共享可以在质量和效率间取得更好的平衡」；MLA 说「KV 的本征维度远低于其表面维度，可以通过低秩投影来压缩」。

但故事远未结束。2025 年的 NSA、Differential Attention 和混合架构表明，下一步可能不是继续压缩 KV Cache，而是从根本上重新思考「每个 token 真的需要关注所有其他 token 吗？」。当注意力变得稀疏、选择性、甚至线性时，KV Cache 的概念本身可能会被重新定义。

这场战争的下一章，或许将不再围绕 KV Cache 展开，而是关于**注意力本身的边界**。

## 参考文献

1. Vaswani, A., et al. "Attention Is All You Need." NeurIPS 2017. [arXiv:1706.03762](https://arxiv.org/abs/1706.03762)
2. Shazeer, N. "Fast Transformer Decoding: One Write-Head is All You Need." 2019. [arXiv:1911.02150](https://arxiv.org/abs/1911.02150)
3. Ainslie, J., et al. "GQA: Training Generalized Multi-Query Attention from Multi-Head Checkpoints." EMNLP 2023. [arXiv:2305.13245](https://arxiv.org/abs/2305.13245)
4. DeepSeek-AI. "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model." 2024. [arXiv:2405.04434](https://arxiv.org/abs/2405.04434)
5. Ye, Z., et al. "Differential Transformer." 2024. [arXiv:2410.05258](https://arxiv.org/abs/2410.05258)
6. DeepSeek & PKU. "NSA: Hardware-Aligned and Natively Trainable Sparse Attention." ACL 2025 Best Paper. [arXiv:2502.11089](https://arxiv.org/abs/2502.11089)
7. Dao, T., et al. "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness." NeurIPS 2022. [arXiv:2205.14135](https://arxiv.org/abs/2205.14135)
8. Sun, Y., et al. "Retentive Network: A Successor to Transformer for Large Language Models." 2023. [arXiv:2307.08621](https://arxiv.org/abs/2307.08621)
