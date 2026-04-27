---
title: CODEVS 2370 小机房的树
published: 2019-08-06
description: ""
image: "/gallery/thumbnails/0_Obsidian woods_2, Anton Fadeev_01.jpg"
tags: ["LCA", "图论"]
category: ""
draft: false
---

# 题目

[CODEVS-2370-小机房的树](codevs.cn/problem/2370/)

一道经典的LCA问题。



## 题解

题目就是求$u,v$两点之间的最短距离，利用$lca$的性质可以在$O(log(n))$的时间内求出答案。

也就是$dis[u] + dis[v] - 2 * dis[lca(u, v)]$，其中 $dis[u]$ 数组表示从根节点到点 $u$ 的距离。

~~~c++
#include<bits/stdc++.h>
#define rep(i, a, b)    for(int i = (a); i <= (int)(b); ++i)
#define per(i, a, b)    for(int i = (a); i >= (int)(b); --i)
#define debug(x)    cerr << #x << ' ' << x << endl;
using namespace std;

typedef long long ll;
typedef pair<int, int> pii;
const int MAXN = 2e5 + 7;

int dep[MAXN], dis[MAXN], f[MAXN][20];
vector<pii> G[MAXN];

void dfs(int x, int last = 0, int fa = -1) {
    f[x][0] = fa;
    dep[x] = dep[fa] + 1;
    dis[x] = dis[fa] + last;
    for(int i = 1; (1<<i) <= dep[x]; ++i){
        f[x][i] = f[f[x][i-1]][i-1];
    }
    rep(i, 0, G[x].size()-1){
        pii p = G[x][i];
        if(p.first == fa)   continue;
        dfs(p.first, p.second, x);
    }
}

int lca(int u, int v) {
    if(dep[u] < dep[v]) swap(u, v);
    int dif = dep[u] - dep[v];
    per(i, 20, 0){
        if((1<<i) <= dif){
            dif -= (1<<i);
            u = f[u][i];
        }
    }
    if(u == v)  return u;
    per(i, 20, 0){
        if(dep[u] >= (1<<i) && f[u][i] != f[v][i]){
            u = f[u][i];
            v = f[v][i];
        }
    }
    return f[u][0];
}
int main() {
    int n;
    scanf("%d", &n);
    int u, v, c;
    rep(i, 1, n-1){
        scanf("%d %d %d", &u, &v, &c);
        G[u].push_back(make_pair(v, c));
        G[v].push_back(make_pair(u, c));
    }
    dfs(0);
    int T;
    scanf("%d", &T);
    while(T--){
        scanf("%d %d", &u, &v);
        printf("%d\n", dis[u] + dis[v] - 2 * dis[lca(u, v)]);
    }
    return 0;
}
~~~

