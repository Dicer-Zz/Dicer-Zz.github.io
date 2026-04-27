---
title: Codeforces 1207F
published: 2019-08-29
description: ""
image: "/gallery/thumbnails/girl-pick.jpg"
tags: ["数据结构"]
category: ""
draft: false
---

## 题目

[题目链接](https://codeforces.com/contest/1207/problem/F)



## 分析

以前从来没有做过这种问法的题目，觉得很有意思。

本来想的是可不可以把操作转化一下改到线段树上去，结果没有想到，好像也真的不行。

然后就灵光一闪发现当询问的 $x$ ，比较大的时候暴力查询也是跑的飞快，于是就开始想大数据暴力查询。

小数据可以发现直接维护一个二维数组 $sum[x][y]$ 表示答案。

然后大小的分隔本来以为就是 $sqrt(5 \cdot 10^5)$ ，但其实并不是，因为这道题目并不是传统意义上的**分块**。

而是一种用空间换时间的方法，当 $x$ 比较大的时候我们很难去更新 $sum[x][y]$，也开不了那么大的空间。

思考一下，假如分割点是 $p$，那么对于更新操作来说，因为我们需要更新所有的 $sum[x][y]$ 以便查询小数据。

所以更新的复杂度就是：$O(p)$。

对于查询操作来说：如果查询的 $x \leq p$ ，那么我们可以直接输出答案也就是 $O(1)$。

如果查询的 $ x > p$，那么我们可以暴力查询，复杂度是：$O(\frac{5\cdot 10^5}{x})$。具体复杂度是：$\Omega(\frac{5\cdot 10^5}{p}) - O(1)$。

分析一下 $p$ 取 300~1000 都是可以的。

## 代码

~~~c++
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
using namespace std;

typedef long long ll;
const int mod = 1e9+7;
const int MAXN = 5e5 + 7;

int a[MAXN];
int sum[1001][1001];
int main(int argc, char const *argv[])
{
	int q;
	scanf("%d", &q);
	int op, x, y;
	while(q--){
		scanf("%d %d %d", &op, &x, &y);
		if(op == 1){
			a[x] += y;
			for(int i = 1; i <= 1000; ++i){
				sum[i][x%i] += y;
			}
		} else {
			if(x <= 1000){
				printf("%d\n", sum[x][y]);
			} else {
				int res = 0;
				while(y <= 500000){
					res += a[y];
					y += x;
				}
				printf("%d\n", res);
			}
		}
	}
	return 0;
}
~~~

