---
title: 如何在 M 系芯片的 MacBook 上玩原神
published: 2022-07-28
description: "在用上M系芯片之后苹果开始在自家的Mac系列电脑上使用新的M系芯片（也就是所谓的Apple Silicon Chip）之后，iPhone、iPad、Mac的芯片就被统一成了ARM架构，使用同一套RISC指令集。这意味着，我们甚至可能在iPhone运行MacOs。当然，我觉得刀法精准的厨子不会这么做。"
tags: ["Genshin Impact", "PlayCover"]
category: "Gaming"
draft: false
---

## 在用上M系芯片之后

苹果开始在自家的Mac系列电脑上使用新的M系芯片（也就是所谓的Apple Silicon Chip）之后，iPhone、iPad、Mac的芯片就被统一成了ARM架构，使用同一套RISC指令集。这意味着，我们甚至可能在iPhone运行MacOs。当然，我觉得刀法精准的厨子不会这么做。

此外，在用上M系芯片之后，只要开发者愿意，理论是可以直接将自己为iPhone或者iPad开发的软件移植到MacoOS上，开发者几乎什么都不需要做。现在有许多软件可以直接在Mac上下载安装iPad版本，虽然界面拉伸适配多少有一些问题，但是基本使用是可以的，比如抖音、Bilibili、微信读书。当然，这些软件也通常有更好用的网页版。

而对于手游厂商来说，通常会直接关闭这项功能，导致我们无法直接在Mac上玩iPhone上的游戏，比如王者荣耀、原神等。

但天无绝人之路，通过越狱等方式破解IPA文件之后，使用侧载的方法就可以将其安装在Mac上。IPA文件本质上就是iOS以及iPadOS使用的应用程序安装包的后缀，是zip压缩格式的扩展协议。

## PlayCover

[PlayCover官网](https://playcover.io/)

PlayCover是一个非常傻瓜式的IPA侧载软件，只需要从破解IPA的网站下载下来你需要的软件，然后使用Playcover加载以后就可以使用了。如果是第一次使用，可能需要安装`xcode`。具体的安装操作可以参考PlayCover的[官方文档](https://docs.playcover.io)

破解IPA（或称砸壳）需要一部越狱的iPhone，也有一定的学习成本，因此推荐使用第三方的破解网站下载IPA。PlayCover文档中给出了两个推荐的网站，一个是[decrypt](https://decrypt.day)，这个是我比较经常用的，更新比较及时，下载速度也很快。另一个是[armconverter](https://armconverter.com/decryptedappstore)，这个我没用过，大家可以自行尝试。

需要注意的是，这种非官方的破解软件，可能会存在一定的风险，一定要仔细甄别。

## 原神

在MacOS 11.3之前，是能直接在Mac上下载iPad版的原神的，但是由于原神的更新，现在已经无法直接下载了。因此，我们需要使用PlayCover来安装。

首先，从[decrypt](https://decrypt.day)下载原神的破解IPA文件，然后使用PlayCover加载。如果安装了`xcode`应该就能够直接打开，然后进入游戏之后有一个10G+的资源更新，静静等待之后就可以进入游戏了。

此外，原神大版本更新比较频繁，而且不更新是没发进入游戏的，因此需要定期更新破解IPA文件。通常在版本更新后的半天内，decrypt就会更新破解文件。安装新版本的时候切记不要删除之前的版本（否则需要重新下载10G+的资源包），只需要将新版本的破解文件拖入PlayCover即可，会自动覆盖之前的版本。
