---
title: 素性测试：A Survey
published: 2021-11-27
description: "素数素数（Prime number），又称质数，指在大于1的自然数中，除了1和该数自身之外，无法被其他自然数整除的数。大于1的自然数，若不是素质，则为合数。前十个素数分别是：2、3、5、7、11、13、17、19、23、29。 RSA加密是现在网络安全系统中非常常用的一种非对称加密方法，这种方法的安全性依赖于大数质因子分解非常困难。 任何一个大于1的自然数都可以表示成素数乘积的形式，并且如果将素数"
image: "/gallery/cover/primality-test.png"
tags: ["数论"]
category: "Mathematics"
draft: false
---

# 素数

素数（Prime number），又称质数，指在大于1的自然数中，除了1和该数自身之外，无法被其他自然数整除的数。大于1的自然数，若不是素质，则为合数。前十个素数分别是：2、3、5、7、11、13、17、19、23、29。

RSA加密是现在网络安全系统中非常常用的一种非对称加密方法，这种方法的安全性依赖于大数质因子分解非常困难。

任何一个大于1的自然数都可以表示成素数乘积的形式，并且如果将素数按顺序写出来，这个表示方法是唯一的，这被称为算数基本定理。比如，60=2*2*3*5。将自然数表示成素数乘积的过程叫做质因子分解，可以用来判断一个数是不是素数。另外，还有一些方法可以在不进行质因子分解就能知道一个数字是不是素数，这些方法可以分为两类，分别是随机的和确定的。随机方法不一定能保证通过测试的一定是素数，只能保证通过检验的数很大可能上是一个素数。而确定的则可以完全保证通过测试的数字是一个素数。

下面我们具体研究各种判断素数的方法。

# 试除法

试除法是可以得到质因子分解结果的验证素数的方法。

对于自然数n（大于1）根据素数的定义：只有1和n两个因数，那么我们可以枚举所有小于n的自然数（大于n的数字显然不可能是n的因子）然后判断能否整除，如果都不能整除，那么说明n只有1和本身两个因子，因此n就是素数。

```python
def isPrime(n):
    if n == 1: # 1 is not prime
        return False
    elif n == 2: # 2 is prime
        return True
    else: # all other numbers
        for i in range(2, n): # check all numbers from 2 to n-1
            if n % i == 0: # if n is divisible by i
                return False # n is not prime
        return True # n is prime
```

可以看出这个算法的时间复杂度是$O(n)$的，并不理想。

我们进一步的思考，考虑$d|n$，则有$dm=n$，不妨假设$d\leq m$，则$d^2\leq dm=n$，即$d\leq \sqrt n$。因此我们只需要枚举小于$\sqrt n$的自然数即可。

```python
def isPrime(n):
    if n == 1:
        return False
    i = 2
    while i*i <= n:
        if n % i == 0:
            return False
        i += 1
    return True
```

这个算法的复杂度是$O(\sqrt n)$

进一步思考，可以知道除了2以外所有的偶数都不是素数，并且所有3的倍数也都不是素数。所有的自然数都可以表示成$6k+i,\; k\geq 0,\; 0\leq i \leq 5$，但其中$6k+2, 6k+4$是2的倍数，$6k, 6k+3$是3的倍数。因此只有$6k+1,6k+5$可能是素数，这可以进一步提高试除法的效率。

```python
def isPrime(n):
    if n == 1:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5 # i = 5, 11, 17, 23, 29, 35, 41, 47, 53, 59, ...
    while i*i <= n:
        if n % i == 0: # n is divisible by i
            return False # n is not prime
        if n % (i+2) == 0: # n is divisible by i+2
            return False # n is not prime
        i += 6
    return True
```

这个算法的复杂度还是$O(\sqrt n)$，不过比上面的快了三倍，因为枚举的数字少了。

# 筛法

试除法一次只能找到一个素数，但有的时候我们可能需要快速的找到多个素数，虽然我们也可以多次使用试除法来得到，但我们有更快的方法：筛法。给出自然数n，这种方法可以快速求出所有小于等于n的素数。

## 埃拉托斯特尼筛法

埃拉托斯特尼筛法（Sieve of Eratosthenes）简称埃筛或埃式筛法，这个方法历史悠久，早在公元前2世纪就被埃拉托斯特尼提出了。

其算法的主要思想是：如果一个数字$p$是素数，那么它的倍数就都不是素数。我们从2枚举到n，2是素数，因此划掉所有2的倍数。如果一个数字在被枚举到时，还没有被划掉，那么就说明这个数是素数。下面这张图很好的展示了这个过程。

![https://upload.wikimedia.org/wikipedia/commons/b/b9/Sieve_of_Eratosthenes_animation.gif](https://upload.wikimedia.org/wikipedia/commons/b/b9/Sieve_of_Eratosthenes_animation.gif)

### 埃筛的代码

```python
def sieveOfEratosthenes(n):
    prime = [True for _ in range(n+1)]
    p = 2
    while (p * p <= n):
        if (prime[p] == True): # if p is prime
            for i in range(p * 2, n+1, p): # mark all multiples of p as not prime
                prime[i] = False
        p += 1
    prime[0] = False
    prime[1] = False
    return prime
```

### 埃筛的复杂度证明

可以看出埃筛的总删除次数为：$\frac{n}{2}+\frac{n}{3}+\cdots+\frac{n}{p}=n\sum_{p\leq n}\frac{1}{p}$。根据 Mertens’ theorems ，$\lim_{n\to\infty}\left(\sum_{p\leq n}\frac{1}{p}-\ln \ln n -M\right)=0$，其中$M \approx 0.261497$。

因此埃筛的时间复杂度为$O(n\ln\ln n)$

## 欧拉筛

埃式筛法还是有进步的空间，因为埃筛在划掉数字的时候可能会发生很多重复。比如对于数字6，它即是2的倍数，又是3的倍数。如果能避免这种重复，那么每个数字就只需要划掉一遍就可以了，这样我们能得到一个线性复杂度的筛法。这个方法最早被莱昂哈德·欧拉发现，所以被称为欧拉筛。

```python
def sieveOfEuler(n):
    isPrime = [True for _ in range(n+1)]
    Prime = []
    for i in range(2, n+1):
        if isPrime[i]:
            Prime.append(i)
        for pri in Prime:
            if i * pri > n:
                break
            isPrime[i * pri] = False
            if i % pri == 0:
                break
    return Prime
```

# 素性测试

本小结的主要内容是一些快速进行素数检测的方法，分为概率型和确定型两种。概率型素性检测并能保证通过测试的数字一定是素数，因此被称为伪素数。确定型素性检测则可以保证通过检测的一定是素数。

## 费马素性测试

费马素性测试是一种概率素性测试，它主要使用的数学原理是费马小定理。

费马小定理说：如果一个数字p是素数，那么对于任意不能被p整除的自然数a来说，满足下式：

$$a^{p-1}\equiv 1\mod p$$

那么我们如果发现一个这样的a，不满足上面的式子，那么我们就可以肯定p一定不是一个素数，而是一个合数。而如果p通过了一次或多次这样的测试，我们称之为 **费马伪素数**，之所以叫做伪素数是因为费马测试不能保证通过测试的数字一定是素数。

考虑到以下两个情况：1、如果$a\equiv 1 \mod p$，那么费马小定理一定成立。2、如果$a\equiv -1 \mod p$，那么如果p是奇数，费马小定理一定成立，而素数中只有2一个偶数。因此，我们在挑选a时，不需要考虑这两种情况。

一般来说，选择范围是$1\lt a\lt p-1$。如果我们选择的a满足$gcd(a, p)=d>1$，那么显然此时p不是一个素数（p有因子$d=gcd(a, p)$）也可以证明此时费马小定理不成立，证明如下：

> 从区间$[2, p-1)$选出一个自然数a，并且$gcd(a, p)=d>1$。假设a、p满足费马小定理，即$a^{p-1}\equiv 1\mod p$，存在整数k满足$a^{p-1}-pk=1$，因为$a|d, p|d$，所以$0\equiv 1 \mod d$，而此式仅当d=1时成立，由反证法可知a、p不满足费马小定理。

但如果我们仅选择满足$gcd(a, p)=1$的数字a，即使对于所有这样的a，p都能通过费马测试，也不能保证p就一定是素数，这类数字被称为 **卡迈克尔数**（Carmichael number），定义为：

> 在数论上，卡迈克尔数是合数n，对于任意与n互质的数字a，满足$a^{n-1}\equiv 1\mod n$

最小的卡迈克尔数是$561=3\times 11\times17$。但其实不用很担心，因为卡迈克尔数非常的稀疏，$10^{16}$之内只有246683个，相对于这个范围来说是非常少的。不过为了保证算法的正确性，我们还是不能仅仅判断$gcd(a, p)=1$的情况。

那么我们进一步思考，是否有对于区间$[2, p-1)$中的所有的a，对满足费马小定理的伪素数n呢？

其实这是不可能的，因为如果n不是素数，那么区间$[2, p-1)$一定有其因数d，当a取得d时，根据上面的证明，费马小定理一定不成立。因此，我们可以保证，枚举所有的a，一定能验证一个数字是否为素数。

但是枚举所有的a，这个算法的时间复杂度为$O(n\log n)$，甚至超过了试除法的$O(\sqrt n)$，这显然不是我们想要的结果。如果我们能够知道一个数字通过费马测试的可能性有多高，那么我们就可以多次选择不同的a来进行费马测试，一定有一次没能通过费马测试，那么就说明这个数字a不是一个素数。

其实有如下结论：

> 如果n至少有一个与其互质的a能证明它不是伪素数，也就是说如果n不是卡迈克尔数，那么在与其互质的a中，至少有一半能证明n不是一个伪素数，也就是说n是一个合数。

那么一次费马测试的通过率就是50%，如果我们多次进行测试就可以把概率降低至我们能接受的范围。如果测试k次，这个算法的时间复杂度就是$O(k\log n)$

```python
def fermatPrimailtyTest(n, k):
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for _ in range(k):
        a = random.randint(2, n - 1)
        if pow(a, n - 1, n) != 1:   # Fermat's little theorem
            return False
    return True
```

## 米勒-拉宾素性测试

费马测试在数字较小的时候准确性尚可，但是当数字大到一定程度（$2^{64}$）或遇到卡迈克尔数时，准确性就不尽人意了。

米勒-拉宾素性测试方法由米勒（[Gary L. Miller](https://en.wikipedia.org/wiki/Gary_Miller_(professor))）在1976年提出，但原始的算法是确定型检测方法，并且正确性依赖于未被证明的扩展黎曼猜想（[extended Riemann hypothesis](https://en.wikipedia.org/wiki/Extended_Riemann_hypothesis)）拉宾（[Michael O. Rabin](https://en.wikipedia.org/wiki/Michael_O._Rabin)）在1980年将其修改为无条件的概率型检测方法。

在将米勒-拉宾测试的原理之前，我们需要先介绍几个引理。

### 二次剩余

> 如果存在整数X，使得$X^2\equiv a \mod p$，则称a是模p的二次剩余。
> 如果不存在这样的X，则称a是模p的二次非剩余。

### 二次探测定理

对于一个素数p，满足$X^2\equiv 1 \mod p$的解为$X_1 = 1, X_2 = p-1$。

证明：

$$X^2\equiv 1\bmod p \implies (X-1)(X+1)\equiv 0\bmod p$$

由于p是素数，$(X-1)(X+1)$是p的倍数

所以要么$X-1 \equiv 0\bmod p$，要么$X+1 \equiv 0\bmod p$

即，$X=1$ 或 $X=p-1$

### 米勒-拉宾测试

与费马测试一样，米勒-拉宾测试是通过检测一个数字是否满足那些素数一定满足的性质来判断这个数字是否是素数的。

先说方法，对于一个整数n>2，可以表示为$n = 2^rd+1$（r是一个整数，d是一个奇数）考虑一个整数a（$0\lt a\lt n$），作为基数，如果n、a满足：

$$
\begin{aligned}
a^d&\equiv 1 \bmod n \\\\
a^{2^rd}&\equiv -1 \bmod n\text{ for some }0\leq r\lt s
\end{aligned}
$$

则称n是基a下的**强可能素数** ，也就是说通过一次测试的数字也不一定就真的是素数。幸运的是，不存在能够通过所有基数a的强可能素数，如果我们枚举遍所有的基数，我们就可以得到一个缓慢的确定型素数测试方法。

这个结论基于奇素数满足以下两个定理：

1. 费马小定理
2. 二次探测定理

现尝试证明为何满足上述两个定理就能满足（1）（2）式：

对于$n = 2^sd+1$，根据费马小定理：

$$a^{n-1}\equiv a^{2^sd}\equiv 1\mod n$$

对于序列$a^{2^{s}d},a^{2^{s-1}d},\cdots,a^{2d},a^{d}$，每一项都是前一项的平方根，因为第一项与1同余，所有后面每一项都是模n意义下1的平方根，根据二次探测定理，应该与1或-1同余。如果它与-1同余，那么就满足（2）式，如果都与1同余，那么我们能得到最后一项也与1同余，即（1）式。

这样我们就可以随机选择一些基数a，通过计算其是否满足（1）（2）式来确实其是否是一个素数。通过多次迭代，我们可以把假阳性的概率降低到我们能接受的范围内。

有证明说明，对于和数n，最多能通过1/4的基数a的检测，也就是说，如果检测k次，米勒-拉宾检测方法的失效概率至多是$\frac{1}{4^k}$。

另外，还有一些基数的集合可以保证，当n小于一定的值时，所有能通过集合中所有基数的n一定是素数，这为我们提供了一定范围内的快速素数检测。

| small than | base set |
| --- | --- |
| 2,047 | 2 |
| 1,373,653 | 2, 3 |
| 9,080,191 | 31, 73 |
| 3,215,031,751 | 2, 3, 5, 7 |
| … | … |
| 3,825,123,056,546,413,051 | 2, 3, 5, 7, 11, 13, 17, 19, 23 |
| 18,446,744,073,709,551,616 | 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37 |

这基本上就能满足一些普通的需求了。

```python
def MillerRabinPrimalityTest(n, k):
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    r, s = 0, n - 1
    while s % 2 == 0:
        r += 1
        s //= 2
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, s, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True
```

该代码的时间复杂度为$O(k\log^2 n)$

米勒的原始版本证明了，如果枚举所有$a\in [2, min(n-2,\lfloor2\ln^2n\rfloor)]$都不能证明n是一个合数，那么n就是一个素数。但是这个证明基于拓展的黎曼猜想为真的假设。

## 确定素性测试

确定型素性测试不是本篇内容的重点，比较出名的一个确定型测试是AKS素性检测，由[Manindra Agrawal](https://en.wikipedia.org/wiki/Manindra_Agrawal), [Neeraj Kayal](https://en.wikipedia.org/wiki/Neeraj_Kayal), and [Nitin Saxena](https://en.wikipedia.org/wiki/Nitin_Saxena)在2002年提出，如果有兴趣大家可以自己研究一下。

# 工业素数生成

有了快速的素性检测方法，那么我们就可以轻松的得到一些高可能性的大素数，这些素数被称为工业级素数，可以用于一些密码学中的加密方法，比如RSA加密。

如果需要一个二进制下1024位的素数，我们可以从$[2^{1023}, 2^{1024})$这个区间里随机选择一个数字，然后使用素性检测判断其是否是一个素数，如果通过测试，那么我们就得到了一个工业级素数。

```python
def largePrimeGenerator(n):
    '''
    Generates a large prime number.
    '''
    # Generate a random number
    randomNumber = random.randint(2**(n-1), 2**n)
    # Check if the number is prime
    if millerRabin(randomNumber):
        return randomNumber
    else:
        return largePrimeGenerator(n)
```

# Reference

[https://zhuanlan.zhihu.com/p/121395816](https://zhuanlan.zhihu.com/p/121395816)

[https://zh.wikipedia.org/wiki/质数](https://zh.wikipedia.org/wiki/%E8%B4%A8%E6%95%B0)

[https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes](https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)

[https://en.wikipedia.org/wiki/Mertens’_theorems](https://en.wikipedia.org/wiki/Mertens%27_theorems)

[https://mathcrypto.wordpress.com/2014/11/11/the-fermat-primality-test/](https://mathcrypto.wordpress.com/2014/11/11/the-fermat-primality-test/)

[https://en.wikipedia.org/wiki/Euler’s_criterion](https://en.wikipedia.org/wiki/Euler%27s_criterion)
