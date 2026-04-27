---
title: 使用 HTTP 协议实现内网文件传输
published: 2019-06-25
description: ""
image: "/gallery/thumbnails/http.png"
tags: ["HTTP"]
category: "网络"
draft: false
---

# 需求

虽然说现在各种网盘、QQ，已经可以满足我们日常基本的小文件传输的需要了，但是当文件比较大的时候还是很慢，因此我们需要一种更快的，更简洁的传输方式来做**局域网**内的文件传输。



# 解决方案

考虑使用本地的一台主机做服务器，为其他同局域网内的设备（如：手机、平板电脑）提供文件传输服务，使用`http`协议。

## 工具

MobaXterm、python3。

[下载MobaXterm（Windows）](/download/MobaXterm.exe)

## 步骤

### 使用MobaXterm

1. 打开Xterm的Servers，选择http。
2. 设置端口号、文件所在地址和开启时间。
3. 开启服务。

![Step1](/gallery/others/mobaxterm-http1.png)

![Step2](/gallery/others/mobaxterm-http2.png)

### 使用Python

1. 打开cmd

2. 输入

   > $ python -m http.server	# python3
   >
   > $ python -m SimpleHTTPServers	# python2

![python2](/gallery/others/python2-http.png)

![python3](/gallery/others/python3-http.png)

如果想要选择端口号的话，可以直接在后面添加。

#### Tip

python方法对中文路径很不友好，不建议使用中文文件名，可能会访问不了。MobaXterm没有问题，中文文件也可以正常访问。

## 浏览器访问

经过上述步骤，你已经可以在其他设备上访问你服务器上的文件了。

在浏览器输入你服务器的本地IP即可（如果不是80端口，则需要自己手动输入）。

经测试，网页直接下载速度约为30Mb/s。

另外，意想不到的一点是，视频文件（MP4）可以直接播放，而且丝毫没有卡顿，因此，我们还可以把它当作视频服务器，下载到电脑上的视频可以在手机📱、平板上看啦。