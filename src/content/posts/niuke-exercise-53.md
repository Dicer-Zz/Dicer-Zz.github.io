---
title: 牛客练习赛 53B
published: 2019-10-12
description: ""
image: "/gallery/thumbnails/post-bg-red-moon.jpg"
tags: ["数论"]
category: "竞赛"
draft: false
---

## 题目

[题目链接](https://ac.nowcoder.com/acm/contest/1114#question)



### 题意

求和式： $$\sum_{i=1}^{n}{\sum_{j=1}^{i}{i \lfloor {\frac{i}{j}} \rfloor ^j}}$$

### 分析

更换一下枚举顺序：

$$\sum_{j=1}^{n}\sum_{i=j}^{n}{i \lfloor \frac{i}{j} \rfloor ^ j}$$

可以发现 $i$ 在 区间 $[k\cdot j, (k+1)\cdot j-1]$ 内 $\lfloor \frac{i}{j} \rfloor = k$ ，因此可以对每个 $j$ 做分段处理，另外 $\lfloor \frac{i}{j} \rfloor ^ j$ 可以从上一个状态转移过来。

时间复杂度： $O(n \log n)$

### 代码

~~~cpp
#include <bits/stdc++.h>
  
using namespace std;
  
typedef long long ll;
const int MAXN = 3e6 + 7;
const int MOD = 1e9 + 7;
ll p[MAXN];
  
int main () {
    for (int i = 1; i <= 3000000; ++i) p[i] = 1;
    ll n; cin >> n;
    ll ans = 0;
    for(ll j = 1; j <= n; ++j) {
        ll lim = n/j, l = j, r = min(2 * j - 1, n);
        for (ll i = 1; i <= lim; ++i) {
            p[i] = p[i] * i % MOD;
            ans += (l+r)*(r-l+1)/2%MOD*p[i]%MOD;
            ans %= MOD;
            l += j; r = min(r + j, n);
        }
    }
    cout << ans << endl;
    return 0;
}
~~~

