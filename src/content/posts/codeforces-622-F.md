---
title: Codeforces 622F
published: 2019-06-18
description: ""
image: "/gallery/thumbnails/Lagrange_polynomial.svg"
tags: ["拉格朗日插值法", "数论"]
category: ""
draft: false
---

# 题目

[F. The Sum of the k-th Powers](https://codeforces.com/contest/622/problem/F)



# 题解

设$F(n) =  \sum _{i=1}^n{i^k} $，当k很小的时候，可以找到一些通项公式，比如：当$k= 1 $时，$F(n) = \frac{(n \cdot (n+1))}{2} $，当$k=2 $时，$F(n)= \frac{n \cdot \ (2 \cdot n + 1) \cdot (n+1)}{6} $。

可以发现，$F(n)$实际上是一个$k+1 $次多项式函数。

因此，我们就可以使用拉格朗日插值法来推导了。

确定一个k+1次多项式需要k+2个点，我们很容易通过打表得到$F(1)  \sim F(k+2)$的值。

然后代入插值公式：

$$F(n) = \sum_{i=1}^{k+2}F(i) \times P(i) $$

$$P(i) = \prod_{j=1, j \neq i}^{k+2}\frac{n-j}{i-j}$$

所以

$$\begin{aligned}F(n) &= \sum_{i=1}^{k+2}F(i) \times \prod_{j=1, j \neq i}^{k+2}\frac{n-j}{i-j} \\ &= \sum_{i=1}^{k+2}F(i) \times \frac{\prod_{j=1, j \neq i}^{k+2}n-j}{\prod_{j=1, j \neq i}^{k+2}{i-j}}\end{aligned}$$

但是这个公式的复杂度时$O(k^2)$的，我们再优化一下。

设$T = \prod_{j=1}^{k+2}{n-j}$，则

$$\prod_{j=1, j \neq i}^{k+2}n-j = \frac{T}{n-i}$$

对于$\prod_{j=1, j \neq i}^{k+2}{i-j}$，我们将它分成$i\lt j$和$i\gt j$两部分来考虑，

$$\prod_{j=1, j \neq i}^{k+2}{i-j} = (i-1)!\times(k+2-i)!\times (-1)^{k+2-i}$$

带入原式，得：

$$F(n) = \sum_{i=1}^{k+2}(F(i)\times\frac{T}{n-i}\times\frac{1}{(i-1)!\times(k+2-i)!\times (-1)^{k+2-i}})$$

至此，我们可以通过打表的方式，在$O(k)$时间内得到$F(n)$了。

## 注意

当$n \leq k+2$时，该公式时不适用的，因为$T$会为$0$。

但是我们可以直接通过$F(n) =  \sum _{i=1}^n{i^k} $计算。

# 代码

~~~c++
/*---------------------------------

 @Author:   Dicer
 @DateTime: 2019-06-18 10:16:23

---------------------------------*/

#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int> pii;
inline ll qpow(ll a,ll b,ll mod){ll res=1;while(b){if(b&1)res = (res*a)%mod;a=(a*a)%mod;b>>=1;}return res;}
const double eps = 1e-8;
const int INF = 0x3f3f3f3f;
const int mod = 1e9+7;
const int MAXN = 1e6 + 7;

ll F[MAXN], fac[MAXN], T;
int n, k;

ll inv(ll x){
	return qpow(x, mod-2, mod);
}
void init(){
	F[1] = 1;
	for(int i = 2; i <= k+2; ++i){
		F[i] = F[i-1] + qpow(i, k, mod);
		F[i] %= mod;
	}
	fac[0] = 1;
	for(int i = 1; i <= k+2; ++i){
		fac[i] = fac[i-1] * i;
		fac[i] %= mod;
	}
	T = 1;
	for(int i = 1; i <= k+2; ++i){
		T *= n - i;
		T %= mod;
	}
}
void solve(){
	if(n <= k+2){
		ll res = 0;
		for(int i = 1; i <= n; ++i){
			res += qpow(i, k, mod);
			res %= mod;
		}
		cout << res << endl;
		return;
	}
	ll res = 0;
	for(int i = 1; i <= k+2; ++i){
		res += F[i] * T % mod * inv(n-i) % mod * inv(fac[i-1]) %mod * inv(fac[k+2-i]) %mod * ((k-i)%2 == 0?1:-1) %mod;
		res += mod;
		res %= mod;
	}
	cout << res << endl;
}
int main(int argc, char const *argv[])
{
	cin >> n >> k;
	init();
	solve();
	return 0;
}
~~~

### Reference

1. 本文题图由User:Glosser.ca - Self-made, based on Image:Lagrangepolys.png，CC BY-SA 3.0，https://commons.wikimedia.org/w/index.php?curid=5538041
2. [参考文章](http://blog.lightning34.cn/?p=115)
3. [LaTex](http://www.mohu.org/info/symbols/symbols.htm)