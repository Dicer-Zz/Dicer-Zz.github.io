---
title: "Utilize Apple Silicon's GPU by PyTorch Nightly"
published: 2022-07-27
description: "Pytorch nightly 已经支持了 Apple Silicon 的 GPU，可以通过以下方式来使用它： 首先，你的 Macbook 应该是使用 Apple Silicon (M系列芯片) 新款笔记本，而不是使用 Intel 的笔记本。另外，需要 Mac OS 是 12.3 或更高版本。"
image: "/gallery/cover/pytorch-apple-silicon.png"
tags: ["Apple Silicon"]
category: "技术"
draft: false
---

Pytorch nightly 已经支持了 Apple Silicon 的 GPU，可以通过以下方式来使用它：

首先，你的 Macbook 应该是使用 Apple Silicon (M系列芯片) 新款笔记本，而不是使用 Intel 的笔记本。另外，需要 Mac OS 是 12.3 或更高版本。

然后建议使用 conda 来安装 pytorch-nightly：

```bash
# MPS acceleration is available on MacOS 12.3+
conda install pytorch torchvision torchaudio -c pytorch-nightly
```

安装成功之后可以通过以下方式确实是否可以使用：

```python
import torch

print(torch.backends.mps.is_available())    # True
print(torch.backends.mps.is_built())    # True
```

如果两者都是 True 的话就没有问题，Sebastian Raschka 在他的 [Blog](https://sebastianraschka.com/blog/2022/pytorch-m1-gpu.html) 中提供了一些[基准测试脚本](https://github.com/rasbt/machine-learning-notes/tree/main/benchmark/pytorch-m1-gpu)，感兴趣的话可以自己跑一下。

我在自己的 M1acbook Pro 上测试了 ResNet 和 MLP 在 mnist 上的训练速度，GPU 大概比 CPU 快个一倍左右，这个速度只能说聊胜于无。
