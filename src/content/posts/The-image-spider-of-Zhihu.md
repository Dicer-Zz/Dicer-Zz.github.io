---
title: 知乎回答图片爬虫
published: 2021-09-30
description: "有一些知乎问题下的回答中包含了很多精美的图片，比如一些壁纸、风景图。 如果想保存的话，手动一张一张的保存有太慢了。 我自己用Python爬虫实现了一个并发的知乎回答图片爬虫，只需要将知乎问题ID输入即可，还能支持多问题同时爬取。速度非常快。只需要python环境和一些很基础的网络工具包就可以了，快来试试吧！ 项目地址：ZhihuPicCrawler"
image: "/gallery/cover/zhihu-spider.png"
tags: ["爬虫", "知乎"]
category: "项目"
draft: false
---

有一些知乎问题下的回答中包含了很多精美的图片，比如一些壁纸、风景图。

如果想保存的话，手动一张一张的保存有太慢了。

我自己用Python爬虫实现了一个并发的知乎回答图片爬虫，只需要将知乎问题ID输入即可，还能支持多问题同时爬取。速度非常快。只需要python环境和一些很基础的网络工具包就可以了，快来试试吧！

项目地址：[ZhihuPicCrawler](https://github.com/Dicer-Zz/ZhihuPicCrawler)

# 项目优势

1. 不需要登陆。
2. 图片并发下载，速度更快。
3. 可以限制图片的数量和大小。
4. 支持一次同时爬取多个问题。

# 效果展示

我们选择这个问题：[有哪些你不舍得换的手机壁纸？](https://www.zhihu.com/question/41895584/answer/556880042)

可以看到问题ID是41895584，在命令行执行：

```shell
$ python Spider.py -q 41895584 --num_pic 1000
已获取前 10 个回答，当前链接总数为 1795
图片链接爬取完毕
50 images saved (21 MB).
100 images saved (45 MB).
150 images saved (67 MB).
200 images saved (92 MB).
250 images saved (114 MB).
300 images saved (140 MB).
350 images saved (166 MB).
400 images saved (189 MB).
450 images saved (213 MB).
500 images saved (236 MB).
550 images saved (257 MB).
600 images saved (281 MB).
650 images saved (302 MB).
700 images saved (328 MB).
750 images saved (352 MB).
800 images saved (375 MB).
850 images saved (398 MB).
900 images saved (422 MB).
950 images saved (444 MB).
1000 images saved (471 MB).
1011 images downloaded. Image size: 476 MB.
Time cost: 147.884s. 3.219 MB/s.
(base) 
```

可以看到速度还是很快的！并且过程结果很清晰！

爬取下来的结果：

![](/gallery/others/imgSpider01.png)

# 使用方法

项目通过命令行进行参数解析，因此不需要显式的修改代码。

参数的具体用途及用法如下：

```shell
$ python Spider.py -h                        
usage: Spider.py [-h] -q QIDS [QIDS ...] [--num_pic The number of pictures Default: 2000)] [--max_size The maximum size(KB) limitation of pictures (Default: 10000)] [--min_size The minimum size(KB) limitation of pictures (Default: 200)] [--num_workers The number of workers (Default: 20]

This is a script that can download images from Zhihu.

optional arguments:
  -h, --help            show this help message and exit
  -q QIDS [QIDS ...], --qIDs QIDS [QIDS ...]
  --num_pic The number of pictures (Default: 2000)
  --max_size The maximum size(KB) limitation of pictures (Default: 10000)
  --min_size The minimum size(KB) limitation of pictures (Default: 200)
  --num_workers The number of workers (Default: 20)
```
