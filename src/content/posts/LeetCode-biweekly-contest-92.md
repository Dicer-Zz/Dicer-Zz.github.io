---
title: LeetCode Biweekly Contest 92
published: 2022-11-29
description: "Problem 1: 找规律可以发现，n为奇数时，由于不对称，无法进行过圆心的切分，所以只能切n刀；n为偶数时，可以通过切n/2刀。特殊的是n=1时不需要切分。"
tags: ["LeetCode", "Biweekly Contest"]
category: "LeetCode"
draft: false
---

## Problem 1

[Problem 1](https://leetcode.cn/problems/minimum-cuts-to-divide-a-circle/description/)

找规律可以发现，n为奇数时，由于不对称，无法进行过圆心的切分，所以只能切n刀；n为偶数时，可以通过切n/2刀。特殊的是n=1时不需要切分。

```py
class Solution:
    def numberOfCuts(self, n: int) -> int:
        if n == 1:
            return 0
        if n % 2 == 0:
            return n // 2
        return n
```

时间复杂度：$O(1)$

空间复杂度：$O(1)$

## Problem 2

[Problem 2](https://leetcode.cn/problems/difference-between-ones-and-zeros-in-row-and-column/)

计数问题：计算每行每列的一的个数，剩下的位置就是零。对于每一个位置计算题中的公式即可。

```py
class Solution:
    def onesMinusZeros(self, grid: List[List[int]]) -> List[List[int]]:
        n = len(grid)
        m = len(grid[0])
        r = [sum(grid[i]) for i in range(n)]
        c = [0 for _ in range(m)]
        for j in range(m):
            tmp = 0
            for i in range(n):
                tmp += grid[i][j]
            c[j] = tmp
        ans = [[0 for i in range(m)] for j in range(n)]
        for i in range(n):
            for j in range(m):
                ans[i][j] = r[i] + c[j] - (n + m - r[i] - c[j])
        return ans
```

时间复杂度：$O(nm)$

空间复杂度：$O(nm)$

## Problem 3

[Problem 3](https://leetcode.cn/problems/minimum-penalty-for-a-shop/)

理解一下题意就是：如果选择在第x小时关门，则答案=1-x中的N的个数 + x-n中Y的个数，枚举x求出最小值即可。

```py
class Solution:
    def bestClosingTime(self, customers: str) -> int:
        y = customers.count('Y')
        n = customers.count('N')
        ans, cost = -1, y
        tmp = 0
        cy, cn = 0, 0
        for i in range(len(customers)):
            if customers[i] == 'Y':
                cy += 1
            else:
                cn += 1
            if cost > cn + y - cy:
                cost = cn + y - cy
                ans = i
        return ans + 1
```

时间复杂度：$O(n)$

空间复杂度：$O(1)$

## Problem 4

[Problem 4](https://leetcode.cn/problems/count-palindromic-subsequences/)

如果问题中的子序列换成子数组还是非常简单的，直接枚举所有连续的长度为5的子串即可。

对于题目中的子序列，我们可以通过贡献的角度来考虑问题，首先回文串中间的字符是无所谓的，只需要前两个字符和后两个字符对称即可，因此我们可以枚举中间字符的位置pos，计算pos之前有多少个双字符`ab`和pos之后有多少个双字符`ba`，其中 $0 \leq a, b \leq 9$

灵神给出了一个优化空间复杂度的方法：[Link](https://leetcode.cn/problems/count-palindromic-subsequences/solutions/1993115/qian-hou-zhui-fen-jie-o100-chang-shu-kon-51cv/)

```py
class Solution:
    def countPalindromes(self, s: str) -> int:
        suf = [0] * 10
        suf2 = [0] * 100
        for d in map(int, s[::-1]):
            for j, c in enumerate(suf):
                suf2[d * 10 + j] += c
            suf[d] += 1

        ans = 0
        prf = [0] * 10
        prf2 = [0] * 100
        for d in map(int, s):
            suf[d] -= 1
            for j, c in enumerate(suf):
                suf2[d * 10 + j] -= c
            ans += sum([c1 * c2 for c1, c2 in zip(prf2, suf2)])
            for j, c in enumerate(prf):
                prf2[d * 10 + j] += c
            prf[d] +=  1
        return ans % (10 ** 9 + 7)
```

时间复杂度：$O(n|\Sigma|^2)$，$\Sigma$表示字符集的大小，这里是10。

空间复杂度：$O(|\Sigma|^2)$
