---
title: Python 连接 MySQL
published: 2021-03-10
description: ""
image: "/gallery/thumbnails/Mariadb.png"
tags: ["MySQL", "Python"]
category: ""
draft: false
---

# 前言

毕设需要保存大量数据，于是想在服务器上运行一个数据库。

Cent OS 默认的 MySQL是Mariadb版本的，据说这个版本是在MySQL被Oracle并购之后，一些MySQL的老员工考虑到MySQL可能被商用而发行的一个免费开源版本。

```bash
$ screenfetch
									 ..                    root@Dicer
                 .PLTJ.                  OS: CentOS 
                <><><><>                 Kernel: x86_64 Linux 3.10.0-957.21.3.el7.x86_64
       KKSSV' 4KKK LJ KKKL.'VSSKK        Uptime: 596d 20h 16m
       KKV' 4KKKKK LJ KKKKAL 'VKK        Packages: 569
       V' ' 'VKKKK LJ KKKKV' ' 'V        Shell: zsh 5.0.2
       .4MA.' 'VKK LJ KKV' '.4Mb.        Disk: 12G / 41G (30%)
     . KKKKKA.' 'V LJ V' '.4KKKKK .      CPU: Intel Xeon E5-2682 v4 @ 2.494GHz
   .4D KKKKKKKA.'' LJ ''.4KKKKKKK FA.    GPU: Cirrus Logic GD 5446
  <QDD ++++++++++++  ++++++++++++ GFD>   RAM: 488MiB / 1838MiB
   'VD KKKKKKKK'.. LJ ..'KKKKKKKK FV    
     ' VKKKKK'. .4 LJ K. .'KKKKKV '     
        'VK'. .4KK LJ KKA. .'KV'        
       A. . .4KKKK LJ KKKKA. . .4       
       KKA. 'KKKKK LJ KKKKK' .4KK       
       KKSSA. VKKK LJ KKKV .4SSKK       
                <><><><>                
                 'MKKM'                 
                   ''
```



# Mariadb

### 查看是否安装过Mariadb

```bash
$ rpm -qs | grep mariadb
```

### 安装并启动Mariadb

```bash
$ yum install mariadb mariadb-server

$ systemctl enable mariadb
$ systemctl start mariadb
```

### 安全设置

```bash
$ mysql_secure_installation
```

### 远程访问

```bash
$ mysql -u root -h localhost -p "mypassword"
Mariadb root@localhost:mysql> UPDATE user SET host='%' WHERE user='root';
Mariadb root@localhost:mysql> GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'mypassword' WITH GRANT OPTION;
Mariadb root@localhost:mysql> FLUSH PRIVILEGES;
```

### 关闭防火墙

如果以上步骤都完成了以后，远程连接超时的话一般都是防火墙的问题，可以将防火墙关闭：

```bash
$ systemctl stop firewalld.service
```

### 卸载Mariadb

```bash
$ yum remove mariadb mariadb-server mariadb-libs
$ rm -rf /var/lib/mysql
$ rm /etc/my.cnf
$ yum install mariadb mariadb-server
```

# Python 连接 Mariadb

```bash
import mysql.connector as conn

db = conn.connect(
    host = 'myIP',
    port = 'myPort',
    user = 'root',
    password = 'myPassword',
    database = 'myDB'
)

cursor = db.cursor()
```

## REFERENCE

https://www.linode.com/docs/guides/how-to-install-mariadb-on-centos-7/