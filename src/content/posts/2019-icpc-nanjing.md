---
title: 2019 ICPC 南京网络赛
published: 2019-09-05
description: ""
image: "/gallery/thumbnails/sylvain-sarrailh-wandering.jpg"
tags: ["树状数组", "欧拉定理", "欧拉函数", "数据结构", "数论"]
category: "竞赛"
draft: false
---

# 题目

[计蒜客](https://www.jisuanke.com/contest/3004?view=challenges)



## A. The beautiful values of the palace

知识点：坐标映射，离散化，树状数组，离线查询

### 坐标映射

找一下规律。（虽然我不太会找这个规律

```cpp
ll get_int(int n, int x, int y){
    x = x - n/2 - 1;
    y = y - n/2 - 1;
    ll t = max(abs(x), abs(y));
    if(x >= y)  return 1ll * n * n - 4 * t * t - 2 * t - x - y;
    else return 1ll * n * n - 4 * t * t + 2 * t + x + y;
}
```

### 离散化和离线查询

只离散化一维就行了，当然两个维度都离散化也是没有问题的。

假设只离散化`x`轴，那么我们对建点和查询操作进行`x`优先排序，扫描`x`轴，当操作的`x`与当前枚举的`x`相同时进行操作，优先建点，然后查询。这样是为了保证顺序。

查询的时候，相当于查询一个一维前缀和，用树状数组维护就可以了。

~~~c++
#include<bits/stdc++.h>
#define rep(i, a, b)    for(int i = (a); i <= (int)(b); ++i)
#define per(i, a, b)    for(int i = (a); i >= (int)(b); --i)
#define debug(x)    cerr << #x << ' ' << x << endl;
using namespace std;

typedef long long ll;
const int MAXN = 1e5 + 7;
const int MOD = 998244353;

struct node{
    int x, y, id;
    ll val;
    friend bool operator <(const node &a, const node &b){
        return a.x < b.x;
    }
}s[MAXN], need[MAXN * 4];

struct ask{
    int a, b, c, d;
}op[MAXN];

ll get_int(int n, int x, int y){
    x = x - n/2 - 1;
    y = y - n/2 - 1;
    ll t = max(abs(x), abs(y));
    if(x >= y)  return 1ll * n * n - 4 * t * t - 2 * t - x - y;
    else return 1ll * n * n - 4 * t * t + 2 * t + x + y;
}

int get_val(ll val){
    int ans = 0;
    while(val){
        ans += val%10;
        val /= 10;
    }
    return ans;
}
struct BIT {
    int e[MAXN], n;
    void clear(){rep(i, 0, n)    e[i] = 0;}
    int lowbit(int x){return x & (-x);}
    void add(int x, int v){
        while(x <= n){
            e[x] += v;
            x += lowbit(x);
        }
    }
    int get(int x){
        int ans = 0;
        while(x){
            ans += e[x];
            x -= lowbit(x);
        }
        return ans;
    }
}bit;

int hx[MAXN * 10], hy[MAXN * 10];

int main() {
    int T;
    scanf("%d", &T);
    while(T--){
        int n, m, p;
        scanf("%d %d %d", &n, &m, &p);
        vector<int> vx, vy;
        rep(i, 1, m){
            scanf("%d %d", &s[i].x, &s[i].y);
            s[i].val = get_val(get_int(n, s[i].x, s[i].y));
            vx.push_back(s[i].x);
            vy.push_back(s[i].y);
        }
        int x1, y1, x2, y2;
        rep(i, 0, p-1){
            scanf("%d %d %d %d", &x1, &y1, &x2, &y2);
            vx.push_back(x1-1);
            vx.push_back(x2);
            vy.push_back(y1-1);
            vy.push_back(y2);
            need[i * 4 + 1] = node{x1-1, y1-1, i * 4 + 1};
            need[i * 4 + 2] = node{x1-1, y2, i * 4 + 2};
            need[i * 4 + 3] = node{x2, y1-1, i * 4 + 3};
            need[i * 4 + 4] = node{x2, y2, i * 4 + 4};
            op[i] = ask{i*4 + 1, i*4 + 2, i*4 + 3, i*4 + 4};
        }
        sort(vx.begin(), vx.end());
        vx.erase(unique(vx.begin(), vx.end()), vx.end());
        sort(vy.begin(), vy.end());
        vy.erase(unique(vy.begin(), vy.end()), vy.end());
        rep(i, 0, vx.size()-1){hx[vx[i]] = i + 1;}
        rep(i, 0, vy.size()-1){hy[vy[i]] = i + 1;}
        rep(i, 1, m){
            s[i].x = hx[s[i].x];
            s[i].y = hy[s[i].y];
        }
        rep(i, 0, p-1){
            need[i * 4 + 1].x = hx[need[i * 4 + 1].x]; need[i * 4 + 1].y = hy[need[i * 4 + 1].y];
            need[i * 4 + 2].x = hx[need[i * 4 + 2].x]; need[i * 4 + 2].y = hy[need[i * 4 + 2].y];
            need[i * 4 + 3].x = hx[need[i * 4 + 3].x]; need[i * 4 + 3].y = hy[need[i * 4 + 3].y];
            need[i * 4 + 4].x = hx[need[i * 4 + 4].x]; need[i * 4 + 4].y = hy[need[i * 4 + 4].y];
        }
        sort(s + 1, s + 1 + m);
        sort(need + 1, need + 1 + 4 * p);
        bit.n = vy.size();
        bit.clear();
        int cur = 1, curs = 1;
        rep(i, 0, vx.size()){
            while(curs <= m && s[curs].x == i){
                bit.add(s[curs].y, s[curs].val);
                curs++;
            }
            while(cur <= 4 * p && need[cur].x == i){
                need[cur].val = bit.get(need[cur].y);
                cur++;
            }
        }
        sort(need + 1, need + 1 + 4 * p, [](const node &a, const node &b){return a.id < b.id;});
        rep(i, 0, p-1){
            printf("%lld\n", need[op[i].a].val + need[op[i].d].val - need[op[i].b].val - need[op[i].c].val);
        }
    }
    return 0;
}
~~~



## B. super_log

知识点：递归，欧拉函数，欧拉定理

### 扩展欧拉定理

$$a^b \equiv \begin{cases} a^b & b < \varphi(m) \\ a^{b \bmod \varphi(m) + \varphi(m)} & b \ge \varphi(m) \end{cases}\bmod m$$

### 快速幂

也不知道为什么，快速幂写成这样就可以直接递归求解了。

这其中一定隐藏了什么不为人知的数论之谜。

```cpp
int up(ll a, int mod){
    return a < mod ? a : a % mod + mod;
}
int qpow(int a, int b, int mod){
    int res = 1;
    while(b){
        if(b&1) res = up(1ll * res * a, mod);
        a = up(1ll * a * a, mod);
        b >>= 1;
    }
    return res;
}
```

### 代码

~~~c++
#include <bits/stdc++.h>
#define rep(i, a, b) for(int i = (a); i <= (b); ++i)
#define per(i, a, b) for(int i = (a); i >= (b); --i)
using namespace std;

typedef long long ll;
const int MAXN = 1e6 + 7;

int pri[MAXN], tot;
int phi[MAXN];
bool mark[MAXN];
void init(){
    tot = 0;
    phi[1] = 1;
    for(int i = 2; i <= 1000000; ++i){
        if(!mark[i]){
            phi[i] = i - 1; 
            pri[++tot] = i;
        }
        for(int j = 1; j <= tot; ++j){
            int x = pri[j];
            if(i * x > 1000000)    break;
            mark[i * x] = 1;
            if(i%x == 0){
                phi[i*x] = phi[i] * x;
                break;
            } else {
                phi[i*x] = phi[i] * phi[x];
            }
        }
    }
}

int up(ll a, int mod){
	return a < mod ? a : a % mod + mod;
}
int qpow(int a, int b, int mod){
	int res = 1;
	while(b){
		if(b&1)	res = up(1ll * res * a, mod);
		a = up(1ll * a * a, mod);
		b >>= 1;
	}
	return res;
}

int solve(int a, int b, int m){
	//calculate a^a^...^a mod m
	//			|<- b ->|
	if(!b || m == 1)	return 1;
	return qpow(a, solve(a, b-1, phi[m]), m);
}

int main()
{
	init();
	int T, a, b, m;
	scanf("%d", &T);
	while(T--){
		scanf("%d %d %d", &a, &b, &m);
		printf("%d\n", solve(a, b, m) % m);
	}
	return 0;
}
~~~

