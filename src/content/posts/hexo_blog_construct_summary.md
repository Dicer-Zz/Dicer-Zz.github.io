---
title: Hexo 博客搭建总结
published: 2019-04-11
description: ""
image: "/gallery/thumbnails/0_Crystal Caverns , Anton Fadeev_01.jpg"
tags: ["Hexo"]
category: "工具"
draft: false
---

## 序言
之前使用jekyll在github上搭建了一个博客。
但是，原博客不支持归档和搜索功能，主题也不是特别喜欢，于是决定重新搭建自己的博客站点。
这次放弃了jekyll，使用hexo搭建。主要原因是hexo支持很多插件，且性能强悍。(~~相中了一个特别好看的主题~~)。



## 背景

本文代码均基于阿里云`Centos7`服务器，`Manjaro Linux`客户端，与`hexo`引擎。

## 选择主题

在搭建博客之前当然要选择一个自己喜欢的主题了。

可以在hexo的主题官方上挑选一个。[戳我](<https://hexo.io/themes/>)

注意挑选的时候不仅要看`颜值`，还要看一下自己需要的功能这个主题是否支持，当然如果你自己会添加插件，那就挑你最喜欢的就好了。

## 客户机配置

### 安装Git

1. 下载Git.

2. 修改用户名和邮箱。

   ```
   # 将此处的"yourname"替换成自己的用户名
   git config --global user.name "yourname"
   
   # 将此处的"youremail"替换成自己的邮箱
   git config --global user.email "youremail"
   ```

### 创建SSH钥匙对

1. 检查是否存在钥匙对。

   > $ cd ~/.ssh

2. 若没有钥匙对，则创建钥匙对。

   > $ ssh-keygen -t rsa -C "youremail"

### 安装Nodejs

1. 使用命令行下载Nodejs。

2. 检查是否下载完成。

   > $ node -v
   >
   > $ npm -v

### 安装Hexo框架

1. 使用`npm`下载`hexo`

   > $ npm install -g hexo-cli

   因为一下原因，`npm`的下载速度十分感人，建议更换

2. 选择一个你想要存放文件的文件夹，初始化blog。

   > $ hexo init blog

3. 初始化完毕之后，打开博客根目录的package.json文件，在dependencies的配置中，追加一项：`"hexo-deployer-git": "^0.3.1"`

4. 运行`hexo`

   > $ hexo s

   然后在浏览器输入：｀localhost:4000｀，如果出现hexo的界面就说明已经搭建成功了。

   如果有包缺失，根据提示下载相应的包，再次尝试即可。

## 服务端配置

首先，进行服务端的系统更新。

> $ yum update -y  

更新完系统后，输入一下代码查看系统版本。

> $ cat /etc/centos-release

### 安装Nginx

安装Nginx分为以下几步。第一，配置Nginx官方源。第二，安装Nginx。第三，配置Nginx配置文件。
1、配置Nginx官方源
输入以下代码，新建一个文件以配置Nginx源

```
$ vi /etc/yum.repos.d/nginx.repo
```

在打开的文件中输入以下代码，输入完毕之后，按 “esc” 键退出编辑模式， 输入 “:wq” 保存退出。

```
[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/mainline/centos/7/$basearch/
gpgcheck=0
enabled=1
```

2、安装Nginx
输入以下代码进行安装。

```
$ yum install nginx -y
```

3、启动Nginx并设置开机自启
输入以下代码:

```
$ systemctl start nginx
$ systemctl enable nginx
```

进行到这里，你已经可以把服务器ip复制到浏览器就可以看到Nginx的欢迎界面了。

4、配置Nginx
接下来，需要修改一下nginx的相关配置，包括设置网站根目录以及配置域名。输入以下代码，打开Nginx的配置文件。(注：此处假定读者已完成了域名备案以及域名解析。)

```
$ vi /etc/nginx/conf.d/default.conf
```

依照下图进行修改，将“/usr/share/nginx/html”改为“/usr/share/nginx/html/blog”。
![nginx配置](https://segmentfault.com/img/remote/1460000012907517?w=698&h=768)

至此，Nginx的配置就基本完成了。

## 安装Nodejs

输入以下代码进行Nodejs的安装。

```
$ yum install nodejs
```

可输入`node -v`以及`npm -v`查看node的版本。
至此，Nodejs的安装就完成了。

## 安装Git以及进行相关配置

1、输入以下代码，进行Git的安装

```
$ yum install git
```

2、创建git用户以及设置密码
输入以下代码：

```
# 创建用户,用户名为git
$ adduser git
# 设置密码
$ passwd git
```

3、把git用户添加到sudo用户组中
输入以下代码`sudo vi /etc/sudoers`，打开sudoers文件，输入`:/root`进行搜索，搜索到代码行`root ALL=(ALL) ALL`,然后在这一行下添加以下代码`git ALL=(ALL) ALL`。输入完毕之后，按`wq!`强制保存退出vi。

4、切换到git用户，添加SSH Key文件并且设置相应的读写与执行权限。
输入以下代码：

```
# 切换用户
$ su git
# 创建目录
$ mkdir ~/.ssh
# 新建文件
$ vim ~/.ssh/authorized_keys
```

然后把之前在客户端设置的SSH Key,复制到authorized_keys文件中，保存后退出。

接下来设置文件权限，把authorized_keys文件设置成只有属主有读写权限，把ssh目录设置为只有属主有读、写、执行权限。代码如下：

```
$ chmod 600 ~/.ssh/authorized_keys
$ chmod 700 ~/.ssh
```

设置完后，返回客户端，打开Git Bash，输入以下代码，测试是否能连接上服务器：

```
# ServerIP为你自己服务器的ip
$ ssh -v git@ServerIP
```

**注意**

SSH使用非对称加密，服务端不需要生成密钥对，而只需要一个`authorized_keys`文件，里面存放的是你客户端的**公钥**。客户端应该有密钥对`id_rsa`和`id_rsa.pub`文件，客户端的`authorized_keys`文件应该和`id_rsa.pub`文件内容一致。如果SSH免密码登录失败，请反复确认上述两点。

5、重新回到服务器，在网站根目录新建一个blog文件夹，用于客户端上传文件，并且把该文件授权给git用户。代码如下：

```
# 使用sudo指令，需要输入git用户的密码
$ sudo mkdir -p /usr/share/nginx/html/blog
$ sudo chown -R git:git /usr/share/nginx/html/blog
```

6、在服务器上初始化一个git裸库
切换到git用户，然后切换到git用户目录，接着初始化裸库，代码如下：

```
$ su git
$ cd ~
$ git init --bare blog.git
```

接着新建一个post-receive文件

```
$ vim ~/blog.git/hooks/post-receive
```

然后在该文件中输入以下内容：

```
#！/bin/sh
git --work-tree=/usr/share/nginx/html/blog --git-dir=/home/git/blog.git checkout -f
```

保存退出之后，再输入以下代码，赋予该文件可执行权限。

```
$ chmod +x ~/blog.git/hooks/post-receive
```

7、返回客户端，设置博客根目录下的_config.yml文件。

```
deploy:
    type: git
    repo: git@SERVER:/home/git/blog.git       #此处的SERVER需改为你自己服务器的ip
    branch: master                            #这里填写分支
    message:                                  #提交的信息
```

保存后，在博客根目录打开Git Bash，输入以下命令：

```
$ hexo clean
$ hexo g
$ hexo d
```

部署完毕之后，即可在浏览器输入你的服务器ip进行访问你的博客了。

## 引用

[fogcrane-基于CentOS搭建Hexo博客](<https://segmentfault.com/a/1190000012907499>)