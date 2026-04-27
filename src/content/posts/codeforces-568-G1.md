---
title: Codeforces 568G1 First-Come-First-Served
published: 2019-06-24
description: ""
image: "/gallery/thumbnails/0_Kaero, Anton Fadeev_01.jpg"
tags: ["动态规划"]
category: "动态规划"
draft: false
---

# 题目

[hpuoj-74](https://hpuoj.com/problem/74/)

[codeforces-568-G1](https://codeforces.com/contest/1185/problem/G1)



# 题解

两个题目都是状压DP，有一定的相似之处，放在一起写。

## 第一题

显然，对于每个宿舍楼内部的宿舍来说，当顺序固定了以后，可以简单的通过贪心得到最少抗议的人数。

那么，我们的主要问题就变成了，求解宿舍楼安装空调最合适的顺序。

定义$dp[sta]$表示状态为$sta$时的最少抗议人数，$cost[i][j]$表示第$i$幢寝室楼第$j$个空调的贪心值。

那么我们可以这样更新：

~~~pascal
for sta := 0 to (1<<n)-1 do
	cal = sta.count(1)
	for  nex := 0 to n-1 do
		if (sta>>nex)&1
			then continue
		else
			dp[sta|1<<nex] = min(dp[sta|1<<nex], dp[sta] + cost[nex][cal+1])
~~~

结果就是$dp[(1<<n)-1] $。

这样更新的理由是：

对于一个状态$sta$，用1表示宿舍楼已经被安排过位置了，0表示还没有安排，统计一下1的个数就能知道在这个状态下，下一个宿舍楼是第几个被装的，而且这个宿舍楼之前一定是没有装过。

例如：

$n = 4, sta = 1001$，下一个要装第三个宿舍楼，而二号、三号宿舍楼还没有装。

因此可以更新到$sta = 1101, 1011$这两个状态。

## 第二题

### 方法一

定义$dp[cap][sta][last]$表示当前总和为$cap$，状态为$sta$，最后一首歌的类型为$last$，然后直接维护更新就好了。

时间复杂度：O(T\*n\*2^n)

### 方法二

定义$dp[sta][last]$表示当前状态为$sta$，最后一首歌的类型为$last$，进行一下更新：

~~~pascal
for sta := 0 to (1<<n)-1 do
	for i := 1 to n do
		if (sta>>i)&1
			then continue
		for type := 1 to 3 do
			if type == last[i]
				then continue
			dp[sta|1<<(i-1)][last[i]] += dp[sta][type]
~~~

这样就能得到所有的情况，但是不一定每一种情况的$cap$都是$T$，所以我们在求和的时候进行判断：

~~~pascal
sum = 0
for sta := 0 to (1<<n)-1 do
	cap = 0
	for i := 1 to n do
		if (sta>>i)&1
			then	cap += t[i]
	if cap == T
		then
			for type := 1 to 3 do
				sum += dp[sta][type]
~~~

时间复杂度：O(n\*2^n)

# 代码

## 第一题

~~~c++
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int > pii;
inline ll qpow(ll a,ll b,ll mod){ll res=1;while(b){if(b&1)res = (res*a)%mod;a=(a*a)%mod;b>>=1;}return res;}
const int mod = 1e9 + 7;
const int MAXN = 2e5 + 7;

int dp[1<<23];
int f[23][2333];
int a[23][23];

int main(){
    #ifndef ONLINE_JUDGE         
        freopen("in.txt", "r", stdin);
        freopen("out.txt", "w", stdout);
    #endif 
    
    int n, m;
    cin >> n >> m;
    for(int i = 1; i <= n; ++i){
        for(int j = 1; j <= m; ++j){
            cin >> f[i][j];
        }
        sort(f[i]+1, f[i]+1+m);
    }
    for(int i = 1; i <= n; ++i){
        for(int j = 1; j <= n; ++j){
            int cur = (j-1)*m + 1, res = 0;
            for(int k = 1; k <= m; ++k){
                if(f[i][k] >= cur){
                    cur++;
                } else res++;
            }
            a[i][j] = res;
        }
    }
    memset(dp, 0x3f, sizeof dp);
    dp[0] = 0;
    function<int(int)> cal = [&](int x){
        int res = 0;
        while(x){
            res += x&1;
            x >>= 1;
        }
        return res;
    };
    for(int i = 0; i < (1<<n); ++i){
        int cur = cal(i) + 1;
        for(int j = 0; j < n; ++j){
            if((i>>j)&1)    continue;
            dp[i|1<<j] = min(dp[i|1<<j], dp[i] + a[j+1][cur]);
        }
    }
    cout << dp[(1<<n)-1] << endl;
    return 0;
}
~~~

## 第二题

### 方法一

~~~c++
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int > pii;
inline ll qpow(ll a,ll b,ll mod){ll res=1;while(b){if(b&1)res = (res*a)%mod;a=(a*a)%mod;b>>=1;}return res;}
const int mod = 1e9 + 7;
const int MAXN = 2e5 + 7;

int t[16], g[16];
int dp[226][1<<15][3];
int main(){
    #ifndef ONLINE_JUDGE         
        freopen("in.txt", "r", stdin);
        freopen("out.txt", "w", stdout);
    #endif 
    
    int n, m;
    cin >> n >> m;
    for(int i = 1; i <= n; ++i){
        cin >> t[i] >> g[i];
        g[i]--;
    }
    dp[0][0][0] = 1;
    dp[0][0][1] = 1;
    dp[0][0][2] = 1;
    for(int i = 0; i <= m; ++i){
        for(int j = 0; j < (1<<n); ++j){
            for(int k = 0; k < n; ++k){
                if((j>>k)&1)    continue;
                if(i+t[k+1] > m)    continue;
                for(int type = 0; type < 3; ++type){
                    if(type == g[k+1])    continue;
                    // cout << i+t[k+1] << ' ' << (j|1<<k) << ' ' << g[k+1] << endl;
                    dp[i+t[k+1]][j|1<<k][g[k+1]] += dp[i][j][type];
                    dp[i+t[k+1]][j|1<<k][g[k+1]] %= mod;
                }
            }
        }
    }
    ll res = 0;
    for(int i = 0; i < (1<<n); ++i){
        for(int j = 0; j < 3; ++j){
            res += dp[m][i][j];
            res %= mod;
        }
    }
    cout << res*qpow(2, mod-2, mod)%mod << endl;
    return 0;
}
~~~



### 方法二

~~~c++
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int, int > pii;
inline ll qpow(ll a,ll b,ll mod){ll res=1;while(b){if(b&1)res = (res*a)%mod;a=(a*a)%mod;b>>=1;}return res;}
const int mod = 1e9 + 7;
const int MAXN = 2e5 + 7;

int t[16], g[16];
int dp[1<<16][3];
int main(){
    #ifndef ONLINE_JUDGE         
        freopen("in.txt", "r", stdin);
        freopen("out.txt", "w", stdout);
    #endif 
    
    int n, m;
    cin >> n >> m;
    for(int i = 1; i <= n; ++i){
        cin >> t[i] >> g[i];
    }
    dp[0][1] = dp[0][2] = dp[0][3] = 1;
    for(int i = 0; i < (1<<n); ++i){
        for(int j = 0; j < n; ++j){
            if((i>>j)&1)    continue;
            for(int k = 1; k <= 3; ++k){
                if(k == g[j+1]) continue;
                dp[i|1<<j][g[j+1]] += dp[i][k];
                dp[i|1<<j][g[j+1]] %= mod;
            }
        }
    }
    ll res = 0;
    for(int i = 0; i < (1<<n); ++i){
        for(int j = 1; j <= 3; ++j){
            int tmp = 0;
            for(int k = 0; k < n; ++k){
                if((i>>k)&1){
                    tmp += t[k+1];
                }
            }
            if(tmp == m){
                res += dp[i][j];
                res %= mod;
            }
        }
    }
    cout << res*qpow(2, mod-2, mod)%mod << endl;
    return 0;
}
~~~

