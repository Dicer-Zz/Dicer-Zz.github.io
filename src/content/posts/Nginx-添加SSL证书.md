---
title: Nginx 添加 SSL 证书
published: 2021-03-14
description: ""
image: "/gallery/thumbnails/SSL.png"
tags: ["SSL", "Nginx", "HTTPS"]
category: "网络"
draft: false
---

在使用Chrome浏览器时，访问没有SSL的网页时会提醒网页不安全，添加过SSL证书之后，会有一个小锁，很好看。

HTTP vs HTTPS: https://www.runoob.com/w3cnote/http-vs-https.html



# 申请SSL证书

阿里云和腾讯云都有免费的SSL证书可以申请，我用的是阿里云的云盾SSL证书，我用的服务器也是阿里云的，所以申请下来挺快的，大概几分钟。

然后将证书下载下来，证书包含两个部分：.pem文件和.key文件，都需要上传到服务器。

```bash
$ scp dicer.fun.pem /home/git/SSL/
# 输入服务器密码
$ scp dicer.fun.key/home/git/SSL/
# 输入服务器密码
```

# 修改nginx.conf

在ningx.conf中添加以下内容：

```bash
server {
     listen       443 ssl;
     listen       [::]:443 ssl;
     server_name  dicer.fun;
     root         /usr/share/nginx/html/blog;

     # ssl                 on;
     ssl_certificate     "/home/git/SSL/dicer.fun.pem";
     ssl_certificate_key "/home/git/SSL/dicer.fun.key";

     ssl_session_cache shared:SSL:1m;
     ssl_session_timeout  10m;
     ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
     ssl_ciphers HIGH:!aNULL:!MD5;
     ssl_prefer_server_ciphers on;

     # Load configuration files for the default server block.
     include /etc/nginx/default.d/*.conf;

     location / {
     }
     error_page 404 /404.html;
         location = /40x.html {
     }

     error_page 500 502 503 504 /50x.html;
         location = /50x.html {
     }

 }
```

其中 server_name, root, ssl_certificate, ssl_certificate_key 需要进行对应的修改。

# 验证nginx.conf 并重启服务

```bash
nginx -t
nginx -s reload
```

# 重定向HTTP到HTTPS

在80端口的解析中，添加重定向。

状态码301表示永久重定向。

```bash
server {
         listen       80 default_server;
         listen       [::]:80 default_server;
         server_name  dicer.fun;
         root         /usr/share/nginx/html/blog;
 
         return 301 https://$server_name$request_uri; # 重定向

         # Load configuration files for the default server block.
         include /etc/nginx/default.d/*.conf;
 
         location / {
         }
 
         error_page 404 /404.html;
             location = /40x.html {
         }
 
         error_page 500 502 503 504 /50x.html;
             location = /50x.html {
         }
     }
```

修改文件后，需要重启nginx服务。

# REFERENCES

https://segmentfault.com/a/1190000009363890

https://www.cnblogs.com/kevingrace/p/6187072.html