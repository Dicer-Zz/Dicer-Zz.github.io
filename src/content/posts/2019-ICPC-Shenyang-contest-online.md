---
title: 2019 ICPC 沈阳网络赛 D
published: 2019-09-28
description: ""
image: "/gallery/thumbnails/1_Rasha 2, Anton Fadeev_02.jpg"
tags: ["点分治", "图论"]
category: "竞赛"
draft: false
---

# 题目

[Fish eating fruit](https://nanti.jisuanke.com/t/41403)

点分治进阶题目，状态很多，统计起来有点复杂。



## 分析

首先肯定是点分治没得跑了，然后就是怎么计算的问题了。

我是先统计出来所有的 $mod $ 后的值，对于每一个节点的深度，可以计算出来这个点对 三个剩余 的贡献。

转移一下就好了。

因为去重的时候做了减法，所有答案可能是负值，要调整回来。

## 代码

~~~cpp
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
#define debug(x) cerr << #x << ' ' << x << endl;
#define size sizeeeeeeee
using namespace std;

typedef long long ll;
const int MOD = 1e9+7;
const int MAXN = 1e4 + 7;

ll ans1, ans2, ans3, cnt[4];
int n, root, size, tot = 0;
int son[MAXN], f[MAXN], head[MAXN];
int dep[MAXN]; bool vis[MAXN];
struct node{
    int u, w, nxt;
}; vector<node> E;
void add(int u, int v, int w) {
    E.push_back(node{v, w, head[u]});
    head[u] = tot++;
}
void get_rt(int x, int fa = 0) {
    son[x] = 1; f[x] = 0;
    for(int j = head[x]; ~j; j = E[j].nxt) {
        int u = E[j].u, w = E[j].w;
        if(vis[u] || u == fa)   continue;
        get_rt(u, x);
        son[x] += son[u];
        f[x] = max(f[x], son[u]);
    }
    f[x] = max(f[x], size - son[x]);
    if(f[x] < f[root]) root = x;
}
vector<int> v;
void get_dep(int x, int fa) {
    v.push_back(dep[x]); cnt[dep[x]%3]++;
    for(int j = head[x]; ~j; j = E[j].nxt) {
        int u = E[j].u, w = E[j].w;
        if(vis[u] || u == fa)   continue;
        dep[u] = dep[x] + w;
        get_dep(u, x);
    }
}
void calc(int x, int op) {
    memset(cnt, 0, sizeof cnt); v.clear();
    get_dep(x, 0);
    ll res0, res1, res2;
    res0 = res1 = res2 = 0;
    for(int p: v) {
        int offset = p%3;
        if(offset == 0) {
            res0 += op * (cnt[0] - 1) * p;
            res1 += op * cnt[1] * p;
            res2 += op * cnt[2] * p;
        } else if(offset == 1) {
            res0 += op * cnt[2] * p;
            res1 += op * cnt[0] * p;
            res2 += op * (cnt[1] - 1) * p;
        } else {
            res0 += op * cnt[1] * p;
            res1 += op * (cnt[2] - 1) * p;
            res2 += op * cnt[0] * p;
        }
        res0 %= MOD; res1 %= MOD; res2 %= MOD;
    }
    ans1 += res0; ans2 += res1; ans3 += res2;
    ans1 %= MOD; ans2 %= MOD; ans3 %= MOD;
}
void solve(int x) {
    dep[x] = 0; calc(x, 1); vis[x] = 1;
    for(int j = head[x]; ~j; j = E[j].nxt) {
        int u = E[j].u, w = E[j].w;
        if(vis[u])  continue;
        dep[u] = w; calc(u, -1);
        root = 0; size = son[u];
        get_rt(u);
        solve(root);
    }
}
int main(int argc, char const *argv[])
{
    while(~scanf("%d", &n)) {
        memset(head, -1, sizeof head);
        memset(vis, 0, sizeof vis);
        E.clear(); tot = 0;
        int u, v, w;
        rep(i, 1, n-1) {
            scanf("%d %d %d", &u, &v, &w);
            u++; v++;
            add(u, v, w); add(v, u, w);
        }
        root = 0; f[0] = size = n;
        get_rt(1, 0);
        ans1 = ans2 = ans3 = 0;
        solve(root);
        ans1 = ans1 * 2 % MOD;
        ans2 = ans2 * 2 % MOD;
        ans3 = ans3 * 2 % MOD;
        ans1 = (ans1 + MOD) % MOD;
        ans2 = (ans2 + MOD) % MOD;
        ans3 = (ans3 + MOD) % MOD;
        printf("%lld %lld %lld\n", ans1, ans2, ans3);
    }
    return 0;
}
~~~

