---
title: 拉格朗日乘数法
published: 2019-07-19
description: ""
image: "/gallery/others/LagrangeMultipliers2D.svg"
tags: ["拉格朗日乘数法", "数论"]
category: ""
draft: false
---

简单来说，拉格朗日乘子法可以解决$f(\hat x)$在一些限制条件$g_k(\hat x) = c_k$下的极值。



## Mushroom Scientists

[Link](https://codeforces.com/contest/186/problem/D)

### Prove

本题题意就是给了一个函数$f(x,y,z) = x^a + y^b + z^c$，求这个函数在约束条件$g(x,y,z) = x + y + z - S$下的最大值。

首先，设拉格朗日函数：

$$L(x,y,z,\lambda) = f - \lambda \cdot g$$

然后对各个变量求偏导数：

$$\frac{\partial L}{\partial x} = y^b\cdot z^c \cdot ax^{a-1} - \lambda$$

$$\frac{\partial L}{\partial y} = x^a\cdot z^c \cdot by^{b-1} - \lambda$$

$$\frac{\partial L}{\partial z} = x^a\cdot y^b \cdot cz^{c-1} - \lambda$$

$$\frac{\partial L}{\partial \lambda} = x + y + z - S$$

可以解出：

$$\frac{x}{a} = \frac{y}{b} = \frac{z}{c}$$

所以：

$$x = \frac{S\cdot a}{a+b+c}, y = \frac{S\cdot b}{a+b+c}, z = \frac{S\cdot c}{a+b+c}$$

### 代码

~~~c++
#include<iostream>
#include<cstdio>
#include<vector>
#include<iomanip>
using namespace std;
 
const int MAXN = 1e5 + 7;
const int mod = 1e9 + 7;
typedef long long ll;
 
int main(){
    cout << fixed;
    int s;
    int a, b, c;
    cin >> s >> a >> b >> c;
    if(a + b + c == 0){
        cout << 0 << ' ' << 0 << ' ' << 0 << endl;
    } else {
        cout << setprecision(12) << (1.0*s*a/(a+b+c)) << ' ' << (1.0*s*b/(a+b+c)) << ' ' << (1.0*s*c/(a+b+c)) << endl;
    }
    return 0;
}
~~~

## Samantha and Portfolio Management
[Link](https://www.hackerrank.com/contests/morgan-stanley-2016/challenges/samantha-and-portfolio-management)

### Prove

约束条件下的极值问题，可以用拉格朗日乘子法解决。

约束条件：
$$g(\boldsymbol w) = \sum_{i=1}^{n}{w_i} - 1$$

极值方程：

$$f(\boldsymbol w) = \sum_{i=1}^{n}{(w_i^2 \cdot \sigma_i^2)} = \sum_{i=1}^{n}(w_i^2 \cdot \frac{1}{i})$$


拉格朗日方程：

$$L(\boldsymbol w, \lambda) = f(\boldsymbol w) - \lambda \cdot g(\boldsymbol w)$$

分别对 $\boldsymbol w , \lambda$ 求导：

$$\frac{\partial(L)}{\partial(w_i)} = 2 \frac{w_i}{i} - \lambda$$

$$\frac{\partial(L)}{\partial(\lambda)} = g(\boldsymbol{w}) = 1 - \sum_{i=1}^{n}{w_i}$$

则有：

$$w_i = \frac{\lambda \cdot i}{2}$$

移项：

$$\sum_{i=1}^{n}{w_i} = \frac{\lambda \cdot \sum_{i=1}^{n}(i)}{2} = \frac
{\lambda \cdot n(n+1)}{4} = 1$$

则：
$$\lambda = \frac{4}{n(n+1)}$$

$$w_i = \frac{\lambda \cdot i}{2} = \frac{2\cdot i}{n(n+1)}$$

所以：

$$V = \sum_{i=1}^{n}{w_i^2\times \sigma_i^2 } = \sum_{i=1}^{n}{\frac{4\cdot i}{n^2(n+1)^2}} = \frac{1}{n(n+1)}$$

$$E = \sum_{i=1}^{n}{w_i \times \bar r_i} = \sum_{i=1}^{n}\frac{(2\cdot i \cdot \bar r_i)}{n(n+1)}$$

然后就可以愉快的$O(n)$解决了。

### 代码
~~~c++
#include<bits/stdc++.h>
using namespace std;

const int MAXN = 1e5 + 7;
int r[MAXN];

void print(long long a, long long b) {
    long long g = __gcd(a, b);
    a /= g; b /= g;
    printf("%d %d\n", a, b);
}
int main(){
    int n;
    scanf("%d", &n);
    long long sum = 0;
    for(int i = 1; i <= n; ++i) {
        scanf("%d", r+i);
        sum += 1LL * i * r[i];
    }
    print(2 * sum, 1LL * n * (n+1));
    print(2LL, n * (n+1));
    return 0;
}
~~~

# 参考

1.[Wikipedia-Lagrange-Multiplier](https://en.wikipedia.org/wiki/Lagrange_multiplier)
2.http://jermmy.xyz/2017/07/27/2017-7-27-understand-lagrange-multiplier/