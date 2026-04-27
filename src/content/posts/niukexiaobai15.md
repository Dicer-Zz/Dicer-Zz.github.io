---
title: 牛客小白赛 15
published: 2019-06-16
description: ""
image: "/gallery/thumbnails/2_Sea Landscapes, Anton Fadeev_03.jpg"
tags: ["数据结构", "线段树"]
category: ""
draft: false
---

# 题目

[牛客小白赛15](https://ac.nowcoder.com/acm/contest/917#question)



# 题解

## E. 希望

*希望是什么，希望是我们这个时代最珍贵的东西。*

直接用一颗线段树维护区间最小值就可以了。

然后在做一个背包。

## H.数据结构题

一个很神奇的思路。

我们将每一个出现x的位置，放进G[x]中，然后查找第一个比r大的位置，和第一个大于定于l的位置，然后这两个位置做差就可以得到x在这段区间中的出现次数了。

# 代码

## E. 希望

~~~c++
/*---------------------------------

 @Author:   Dicer
 @DateTime: 2019-06-16 11:54:32

---------------------------------*/

#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int> pii;
inline ll qpow(ll a,ll b,ll mod){ll res=1;while(b){if(b&1)res = (res*a)%mod;a=(a*a)%mod;b>>=1;}return res;}
const double eps = 1e-8;
const int INF = 0x3f3f3f3f;
const int mod = 1e9+7;
const int MAXN = 2e5 + 7;

struct node{
    int l, r;
    int mid(){return (l+r)>>1;}
    int val;
}s[MAXN<<1];
ll a[MAXN], b[MAXN], dp[MAXN];
void build(int l, int r, int x){
    s[x].l = l; s[x].r = r; s[x].val = 500;
    int mid = (l+r)>>1;
    if(l == r)  return;
    build(l, mid, x<<1);
    build(mid+1, r, x<<1|1);
}
inline void upd(int l, int r, int x, int v){
    // cout << l << ' ' << r << ' ' << s[x].l << ' ' << s[x].r << ' ' << v << endl;
    if(s[x].l >= l && s[x].r <= r){
        s[x].val = min(s[x].val, v);
        return;
    }
    int mid = s[x].mid();
    if(r > mid) upd(l, r, x<<1|1, v);
    if(l <= mid) upd(l, r, x<<1, v);
}
inline void pushdown(int x){
    if(s[x].l == s[x].r){
        a[s[x].l] = s[x].val;
        return;
    }
    s[x<<1].val = min(s[x<<1].val, s[x].val);
    s[x<<1|1].val = min(s[x<<1|1].val, s[x].val);
    pushdown(x<<1);
    pushdown(x<<1|1);
}
int main(int argc, char const *argv[])
{
    #ifndef ONLINE_JUDGE
        freopen("in.txt", "r", stdin);
        freopen("out.txt", "w", stdout);
    #endif
    
    int n, k, m;
    cin >> n >> k >> m;
    for(int i = 1; i <= n; ++i) cin >> b[i];
    build(1, n, 1);
    int l, r; ll c;
    for(int i = 1; i <= m; ++i){
        cin >> l >> r >> c;
        upd(l, r, 1, c);
    }
    pushdown(1);
    // for(int i = 1; i <= n; ++i) cout << a[i] << ' ';
    // cout << endl;
    //dp
	ll sum = 0;
    for(int i = 1; i <= n; ++i){
    	sum += b[i];
    	if(b[i] >= 0)	continue;
    	for(int j = k; j >= a[i]; --j){
    		dp[j] = max(dp[j], dp[j-a[i]] - b[i]);
    	}
    }
    cout << sum+dp[k] << endl;
    return 0;
}
~~~

## H.数据结构题

~~~c++
/*---------------------------------

 @Author:   Dicer
 @DateTime: 2019-06-16 01:55:25

---------------------------------*/

#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int> pii;
inline ll qpow(ll a,ll b,ll mod){ll res=1;while(b){if(b&1)res = (res*a)%mod;a=(a*a)%mod;b>>=1;}return res;}
const double eps = 1e-8;
const int INF = 0x3f3f3f3f;
const int mod = 20180623;
const int MAXN = 2e5 + 7;

int a[MAXN];
vector<int> G[MAXN];
int main(int argc, char const *argv[])
{
    #ifndef ONLINE_JUDGE
        freopen("in.txt", "r", stdin);
        freopen("out.txt", "w", stdout);
    #endif
    
    int n, m;
    cin >> n >> m;
    for(int i = 1; i <= n; ++i){
        cin >> a[i];
        G[a[i]].push_back(i);
    }
    ll x, a, b, l1, l2, r1, r2;
    for(int i = 1; i <= m; ++i){
        cin >> l1 >> r1 >> l2 >> r2 >> x;
        if(l1 > r1) swap(l1, r1);
        if(l2 > r2) swap(l2, r2);
        a = upper_bound(G[x].begin(), G[x].end(), r1) - lower_bound(G[x].begin(), G[x].end(), l1);
        b = upper_bound(G[x].begin(), G[x].end(), r2) - lower_bound(G[x].begin(), G[x].end(), l2);
        cout << a << endl;
        cout << b << endl;
        cout << (a%mod)*(b%mod)%mod << endl;
    }
    return 0;
}
~~~

