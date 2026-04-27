---
title: 洛谷 P3806
published: 2019-09-28
description: ""
image: "/gallery/thumbnails/1_Construction of the Monolith, Anton Fadeev_02.jpg"
tags: ["点分治", "动态规划", "图论"]
category: "竞赛"
draft: false
---

# 题目

[洛谷P3806](https://www.luogu.org/problem/P3806)

点分治模板题。

求边权树上距离为 $k$ 的点对。



## 分析

第一眼没看到边带权，以为直接判断树的直径是否大于等于 $k$ 就行了。233333。

一道经典的点分治的题目，点分治是一种高效的求树上路径满足一定条件的路径个数，当然一条路径，对应两个端点，说成点对数也可以。

这道题目本来写成了在线，有一个点 $1.02s$ 过不去，本来想着卡卡就能过去了，可是去看了看别人的代码，发现总共只需要 $200+ms$ 就够了。想着是自己写搓了，然后翻开了题解，发现可以同时对所有的询问进行查询，没有必要一个一个查。改了改，就过了。

点分治还是比较考验对 $dfs$ 的理解的，因为这道题就有三个 $dfs$ ，甚至还有一个换根 $DP$ 求重心。

然后就是比较考验细节，今天两道模板题都是因为几个变量名弄混了，调了几个小时的 $BUG$ 。

讲一下思路吧。点分治最重要的两点，一是找重心，这样可以降低复杂度，二是统计和去重。

找重心每道题目都是一样的，就不说了。

这道题的统计就是，对于每一个重心树，先统计所有节点到根节点的距离，因为距离范围不超过 $1e7$ 可以用数组保存，剩下一个 $map$ 的 $log$ ，比较重要的是统计数组不能直接清空，我们考虑将所有距离先存起来，统计一下，然后再删除就好了。去重的话，就是很常规的去重。

我统计的直接就是距离为 $k$ 的点对数。

时间复杂度： $O(n\cdot m \log n)$

## 代码

~~~c++
#include<bits/stdc++.h>
#define rep(i, a, b)    for(int i = (a); i <= (b); ++i)
#define per(i, a, b)    for(int i = (a); i >= (b); --i)
#define debug(x)    cerr << #x << ' ' << x << endl
#define size sizeeeeeee
using namespace std;

typedef long long ll;
const int MAXN = 1e4 + 7;
const int MAXM = 1e7 + 7;
const int MOD = 1e9 + 7;

vector<pair<int, int> > G[MAXN];
int son[MAXN], dep[MAXN], f[MAXN], q[MAXN], ans[MAXN], k;
int root, size; int cnt[MAXM], n, m;
bool vis[MAXN];

void get_rt(int x, int fa) {
    son[x] = 1; f[x] = 0;
    for(auto p: G[x]) {
        int u = p.first;
        if(u == fa || vis[u])   continue;
        get_rt(u, x);
        son[x] += son[u];
        f[x] = max(f[x], son[u]);
    }
    f[x] = max(f[x], size - son[x]);
    if(f[x] < f[root])  root = x;
}
vector<int> v;
void get_dep(int x, int fa) {
    v.push_back(dep[x]);
    for(auto p: G[x]) {
        int u = p.first, w = p.second;
        if(u == fa || vis[u])   continue;
        dep[u] = dep[x] + w;
        get_dep(u, x);
    }
}
void calc(int x, int w, int op) {
    v.clear(); dep[x] = w; get_dep(x, 0);
    for(int p: v) {
        rep(i, 1, m) if(p <= q[i]) ans[i] += op * cnt[q[i] - p];
        cnt[p]++;
    }
    for(int p: v) cnt[p]--;
}
void solve(int x) {
    calc(x, 0, 1); vis[x] = 1;
    for(auto p: G[x]) {
        int u = p.first, w = p.second;
        if(vis[u])  continue;
        calc(u, w, -1);
        root = 0; size = son[u];
        get_rt(u, 0);
        solve(root);
    }
}
int main() {
    scanf("%d %d", &n, &m);
    int u, v, w;
    rep(i, 1, n-1) {
        scanf("%d %d %d", &u, &v, &w);
        G[u].push_back({v, w});
        G[v].push_back({u, w});
    }
    rep(i, 1, m) scanf("%d", &q[i]);
    f[0] = INT_MAX; size = n; root = 0;
    get_rt(1, 0); solve(root);
    rep(i, 1, m) {
        if(ans[i])  printf("AYE\n");
        else printf("NAY\n");
    }
    return 0;
}
~~~

