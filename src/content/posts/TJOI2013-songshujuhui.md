---
title: TJOI 2013 松鼠聚会
published: 2019-09-05
description: ""
image: "/gallery/thumbnails/johannes-roots-in-the-treetops-by-jkroots-d9t9p4y.jpg"
tags: ["几何"]
category: "数学"
draft: false
---

# 题目

[P3964 [TJOI2013]松鼠聚会](https://www.luogu.org/problem/P3964)

关于曼哈顿坐标系和切比雪夫坐标系之间的相互转换。



## 前置技能

- 曼哈顿坐标系是通过切比雪夫坐标系旋转$45 ^\circ $后，再缩小到原来的一半得到的。
- 将一个点 $(x, y)$ 的坐标变为 $(x+y, x-y)$ 后，原坐标系中的曼哈顿距离等于新坐标系中的切比雪夫距离
- 将一个点 $(x, y)$ 的坐标变为 $(\frac{x+y}{2}, \frac{x-y}{2})$ 后，原坐标系中的切比雪夫距离等于新坐标系中的曼哈顿距离

## 分析

首先，原题中定义的距离是切比雪夫距离，看着非常奇怪。

我们先考虑如果是曼哈顿距离怎么做。

考虑一些点： $$(x_1, y_1), (x_2, y_2), ... , (x_n, y_n)$$

只需求出： $$\min_{j=1}^{n}\sum_{i=1}^{n}|x_i-x_j|+|y_i-y_j|$$。

而： $$\sum_{i=1}^{n}|x_i-x_j|+|y_i-y_j| = \sum_{i=1}^{n}|x_i-x_j| + \sum_{i=1}^{n}|y_i-y_j|$$

发现这两个维度互不影响，可以分别求出 $x, y$ 轴的。

先对 $x$ 从小到大排序，设 $pre_i$ 前 $i-1$ 个点到点 $i$ 的 $x$ 轴距离前缀和，即： $$pre_i = \sum_{j=1}^{i-1}|x_i - x_j|$$

同理做后缀和： $$suf_i = \sum_{j=i+1}^{n}|x_i - x_j|$$

则： $$\sum_{i=1}^{n}|x_i-x_j| = pre_i + suf_i$$

$y$ 轴同理。

所以只需要先将原切比雪夫坐标系转化为曼哈顿左边系就行了。

注意转化的时候先不要除 $2$，最后在除 $2$，可以防止产生小数。

## 代码

~~~cpp
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
using namespace std;

typedef long long ll;
const int MAXN = 2e5 + 7;

ll suf[MAXN], pre[MAXN];

struct node{
    int x, y, id;
    ll ansx, ansy;
}s[MAXN];

int main() {
    int n, a, b;
    scanf("%d", &n);
    rep(i, 1, n){
        scanf("%d %d", &a, &b);
        s[i].x = a + b;
        s[i].y = a - b;
        s[i].id = i;
    }
    
    sort(s + 1, s + 1 + n, [](const node &a, const node &b){return a.x < b.x;});

    suf[1] = 0; pre[n] = 0;
    rep(i, 2, n)    suf[i] = suf[i-1] + 1ll * (i-1) * (s[i].x - s[i-1].x);
    per(i, n-1, 1)    pre[i] = pre[i+1] + 1ll * (n-i) * (s[i+1].x - s[i].x);
    rep(i, 1, n)    s[i].ansx = suf[i] + pre[i];
    
    sort(s + 1, s + 1 + n, [](const node &a, const node &b){return a.y < b.y;});
    
    suf[1] = 0; pre[n] = 0;
    rep(i, 2, n)    suf[i] = suf[i-1] + 1ll * (i-1) * (s[i].y - s[i-1].y);
    per(i, n-1, 1)    pre[i] = pre[i+1] + 1ll * (n-i) * (s[i+1].y - s[i].y);
    rep(i, 1, n)    s[i].ansy = suf[i] + pre[i];

    ll ans = 1ll<<60;
    rep(i, 1, n)    ans = min(ans, s[i].ansx + s[i].ansy);
    printf("%lld\n", ans/2);
    return 0;
}
~~~

