---
title: 洛谷 P1131
published: 2019-09-18
description: ""
image: "/gallery/thumbnails/hei3.jpg"
tags: ["搜索"]
category: ""
draft: false
---

# 题目

[时态同步](https://www.luogu.org/problem/P1131)

一道双 $dfs$ 的题目。



## 分析

题意就是给出一棵树，可以增加任意一条边的权值，问最少增加多少可以让所有叶子节点到跟节点的距离相等。

先跑一边 $dfs$ 求出所有节点到根节点的距离，再统计出以每个节点为根的子树上的所有点到根节点的距离的最大值。

然后再做一次 $dfs$ ，当一棵子树中离根节点最远的那个节点到根节点的距离都小于所有树中的距离最大的那个的话就可以考虑增加当前子树的根节点与它父亲节点之间的距离了，因为子树中所有节点的距离都需要增大，增大这条边一定是消耗最少的，因为这条边被所有子树上的节点复用了。然后递归下去。

说起来有点复杂，举个例子吧：

比如对于：

> 5 1
>
> 1 2 1
>
> 1 3 5
>
> 2 4 2
>
> 2 5 3

先把图画出来，有三个叶子节点，3 4 5，你会发现 1 到 3 的距离是最远的，因此 4 5 到根节点需要增加，而它们到根节点的路径在 1 2 这条边上重合了，因此我们可以优先在这条边上加，加到子树上有些叶子节点已经达到的最大值。然后向下递归。

## 代码

~~~cpp
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
#define debug(x) cerr << #x << ' ' << x << endl;
using namespace std;

typedef long long ll;
const int mod = 1e9+7;
const int MAXN = 5e5 + 7;

vector<pair<int, int> > G[MAXN];
ll dis[MAXN], msd[MAXN], maxdis, ans;
void dfs(int x, int fa) {
    for(auto p: G[x]) {
        int v = p.first, w = p.second;
        if(v == fa) continue;
        dis[v] = dis[x] + w;
        dfs(v, x);
        msd[x] = max(msd[x], msd[v] + w);
    }
}

void dfs2(int x, int fa) {
    for (auto p: G[x]) {
        int v = p.first, w = p.second;
        if(v == fa) continue;
        ans += msd[x] - msd[v] - w;
        dfs2(v, x);
    }
}
int main(int argc, char const *argv[])
{
    int n, rt;
    scanf("%d %d", &n, &rt);
    int u, v, w;
    rep(i, 1, n-1){
        scanf("%d %d %d", &u, &v, &w);
        G[u].push_back({v, w});
        G[v].push_back({u, w});
    }
    dfs(rt, 0);

    dfs2(rt, 0);
    printf("%lld\n", ans);
    return 0;
}
~~~

