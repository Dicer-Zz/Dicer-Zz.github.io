---
title: 2019 ICPC 徐州网赛
published: 2019-09-09
description: ""
image: "/gallery/thumbnails/hei.jpg"
tags: ["中国剩余定理", "二维偏序", "单调队列", "树形动规"]
category: "竞赛"
draft: false
---

# 题目

[2019-icpc-徐州网赛](https://www.jisuanke.com/contest/3005)

手速场，都是一些很经典的题目。

重新思考了一下二维偏序究竟是什么。

<!---more-->

## A. Who is better?

生硬的套了两个知识点，扩展中国剩余定理和Fibonacci博弈。

套个板子就完事了。

~~~c++
def egcd(a, b):
    """扩展欧几里得"""
    if 0 == b:
        return 1, 0, a
    x, y, q = egcd(b, a % b)
    x, y = y, (x - a // b * y)
    return x, y, q
 
n = int(input())
flag = False
 
a1, r1 = map(int, input().split())
 
for _ in range(n-1):
    a2, r2 = map(int, input().split())
    R = r2-r1
    x, y, d = egcd(a1, a2)
    tmp = a2//d
    if R%d != 0:
        flag = True
    r1=((x*R//d)%tmp+tmp)%tmp*a1+r1
    a1=a1*(a2//d)
 
lcm = a1
ans = (r1%lcm+lcm)%lcm

if flag:
    print("Tankernb!")
    exit(0)

fac = [1, 2]
cur = 2
while True:
    tmp = fac[cur-1] + fac[cur-2]
    if tmp > ans:
        break
    fac.append(tmp)
    cur += 1

flag = False
for v in fac:
    if v == ans:
        flag = True
        break

if flag:
    print("Lbnb!")
else:
    print("Zgxnb!")
~~~

## E. XKC's basketball team

一个比较有趣的题目。

考虑从后往前维护一个单调递增的队列，之所以这样维护是因为：

当 $i < j$ 且 $a[i] < a[j]$ 时 $a[i]$ 是没有任何用处的，因为它又小又靠前，在它前面的那些值如果比 $a[i]$ 小那么肯定也比 $a[j]$ 小，而且 $i < j$ 所以肯定会选择 $j$ 而不是 $i$ 。

然后我们二分单调队列就能得到最先进入队列的满足的那个值的位置，最先进入队列的当然是原序列中最靠后的满足要求的值。

时间复杂度：$O(n \cdot \log n)$

~~~c++
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
using namespace std;

typedef long long ll;
const int mod = 1e9+7;
const int MAXN = 5e5 + 7;

int a[MAXN], ans[MAXN];
int main(int argc, char const *argv[])
{
	int n, m;
	scanf("%d %d", &n, &m);
	rep(i, 1, n)	scanf("%d", &a[i]);
	vector<int> v, vp;
	v.push_back(a[n]); vp.push_back(n);
	ans[n] = -1;
	per(i, n-1, 1){
		auto it = lower_bound(v.begin(), v.end(), a[i]+m);
		if(it == v.end()){
			ans[i] = -1;
		} else {
			int pos = it - v.begin();
			pos = vp[pos];
			ans[i] = pos - i - 1;
		}
		if(a[i] > v.back()){
			v.push_back(a[i]);
			vp.push_back(i);
		}
	}
	rep(i, 1, n)	printf("%d%c", ans[i], i == n?'\n':' ');
	return 0;
}
~~~



## I. query

又是一道二维偏序的问题。

偏序关系是全序关系的子集。

全序关系是指对于一个集合，其中的所有对 $<i, j>$ 都会有这种关系，也就是两两可以比较，比如整数域上的大小关系。

偏序关系是指对于一个集合，其中存在一些（注意：不是所有）对 $<i, j>$ 有这种关系，也就是不需要两两可以比较，比如整数域上的整除关系。

偏序关系有严格偏序和非严格偏序两种，各有自己的三条基本性质。

回到这个问题，$min(p_i, p_j) = \gcd (p_i, p_j)$ 相当于 $p_i, p_j$存在整除关系。显然 $n$ 个数的全排列中满足整除关系的对数小于 $n\cdot \log n$对。

我们先将所有的满足条件的对数直接暴力筛出来，然后就抽象成了这样一个问题：

给出一些点，查询在区间 $[l, r]$ 内点的数量。

这就是一个经典的二位偏序问题了，直接对一维排序，二维用树状数组维护一下就好了。

时间复杂度：$O(n\cdot \log n)$  

~~~c++
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
#define debug(x)	cerr << #x << ' ' << x << endl;
using namespace std;

typedef long long ll;
const int mod = 1e9+7;
const int MAXN = 2e5 + 7;

int a[MAXN], id[MAXN];
struct node{
	int l, r, val, id;
	friend bool operator <(const node &a, const node &b){
		if(a.r == b.r)	return a.l < b.l;
		return a.r < b.r;
	}
}s[MAXN];
struct BIT{
	int e[MAXN], n;
	int lowbit(int x){return x&-x;}
	void add(int x, int v){
		while(x <= n){
			e[x] += v;
			x += lowbit(x);
		}
	}
	int get(int x){
		int res = 0;
		while(x){
			res += e[x];
			x -= lowbit(x);
		}
		return res;
	}
}bit;

vector<int> v[MAXN];
int main(int argc, char const *argv[])
{
	int n, m;
	scanf("%d %d", &n, &m);
	rep(i, 1, n){
		scanf("%d", &a[i]);
		id[a[i]] = i;
	}
	rep(i, 1, n){
		for(int j = 2*a[i]; j <= n; j += a[i]){
			if(id[j] < i)	v[i].push_back(id[j]);
			else v[id[j]].push_back(i);
		}
	}
	rep(i, 1, m){
		scanf("%d %d", &s[i].l, &s[i].r);
		s[i].id = i;
	}
	sort(s + 1, s + 1 + m);

	bit.n = n;
	int cur = 1;
	rep(i, 1, n){
		rep(j, 0, (int)v[i].size()-1){
			bit.add(v[i][j], 1);
		}
		while(cur <= m && s[cur].r == i){
			s[cur].val = bit.get(i) - bit.get(s[cur].l-1);
			cur++;
		}
	}
	sort(s + 1, s + 1 + m, [](const node &a, const node &b){return a.id < b.id;});

	rep(i, 1, m)	printf("%d\n", s[i].val);
	return 0;
}
~~~

### J. Random Access Iterator

感觉这个题目属于很简单的树上递推的题目。

题目的意思就是从树的根结点出发，每次在节点的儿子中随机选择一个，递归，重复子节点个数次。

我们先一次 $DFS$ 更新出来子树的高度和节点的子节点树，$h[x]$ 和 $son[x]$。

首先当一个子节点子树的高度加一小于当前节点的高度的时候这个子节点是没用的，因为它更新不到最大值。

而如果可以的话就加上这个子树的递归求出最大值的概率。叶子节点概率为一。

形式化来说就是：

~~~c++
function DFS(x)
    k <- the number of sons of x
    if  k is 0 do
        return 1
    p <- 0
    for son of x do
        if h[x] equal to h[son] + 1 do 
          p += DFS(son)
    p <- p divided by k
    res <- 1 - pow(1-p, k)
    return res
~~~

后半段的处理是基于这样一个原因：

假设节点取到最大值的概率为p，那么对于一个节点 $x$ 有：

$$p[x] = 1 - (1 - \frac{\sum_{son \in sons[x]}p[son]}{|sons[x]|})^{|sons[x]|} $$

就是这样一个公式。

~~~c++
#include <bits/stdc++.h>
#define rep(i, a, b) for(ll i = (a); i <= (b); ++i)
#define per(i, a, b) for(ll i = (a); i >= (b); --i)
#define debug(x) cerr << #x << ' ' << x << endl;
using namespace std;

typedef long long ll;
const ll MAXN = 1e6 + 7;
const ll mod = 1e9 + 7;
ll qpow(ll a, ll b){
    ll res = 1;
    while(b){
        if(b&1) res = 1ll * res * a % mod;
        a = 1ll * a * a % mod;
        b >>= 1;
    }
    res = res%mod + mod;
    return res%mod;
}

ll inv(ll x){return qpow(x, mod-2);}
vector<ll> G[MAXN];

ll cor[MAXN], son[MAXN];

void dfs(ll x, ll fa = 0){
    ll res = 0;
    for(ll p: G[x]){
        if(p == fa) continue;
        dfs(p, x);
        res = max(res, cor[p]);
        son[x]++;
    }
    cor[x] = res + 1;
}
ll dfs2(ll x, ll fa = 0){
    if(son[x] == 0) return 1;
    ll p = 0;
    for(ll pp: G[x]){
        if(pp == fa)    continue;
        if(cor[x] == cor[pp] + 1){
            p += dfs2(pp, x);
        }
    }
    p = p * inv(son[x]) % mod;
    return (1 - qpow(1-p+mod, son[x]) + mod) % mod;
}
int main() {
    ll n;
    scanf("%lld", &n);
    ll u, v;
    rep(i, 1, n-1){
        scanf("%lld %lld", &u, &v);
        G[u].push_back(v);
        G[v].push_back(u);
    }
    dfs(1);
    printf("%lld\n", dfs2(1));
    return 0;
}
~~~

