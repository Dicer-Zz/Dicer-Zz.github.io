---
title: LeetCode Weekly Contest 321
published: 2022-11-28
description: "Problem 1: 普通做法：遍历每个数，判断左边和右边的和是否相等，时间复杂度$O(n^2)$，用等比数列求和公式可以将复杂度降到$O(n)$。从 1 到 n 枚举 x 即可。"
image: "/gallery/cover/leetcode-weekly.png"
tags: ["LeetCode", "Weekly Contest"]
category: "算法题解"
draft: false
---

## Problem 1

[Problem 1](https://leetcode.cn/problems/find-the-pivot-integer/)

普通做法：遍历每个数，判断左边和右边的和是否相等，时间复杂度$O(n^2)$，用等比数列求和公式可以将复杂度降到$O(n)$。
从 1 到 n 枚举 x 即可。

```py
class Solution:
    def pivotInteger(self, n: int) -> int:
        for i in range(1, n+1):
            a = (1 + i) * i // 2
            b = (1 + n) * n // 2 - a + i
            if a == b:
                return i
        return -1
```

时间复杂度：$O(n)$

空间复杂度：$O(1)$

数学做法：1 到 x 的元素和为 $x(x+1)/2$，x 到 n 的元素和为$\frac{n(n+1) - x(x-1)}{2}$，两者相等则：$x = \sqrt{\frac{n(n+1)}{2}}$，如果x不是整数则返回-1。

```py
class Solution:
    def pivotInteger(self, n: int) -> int:
        m = n * (n + 1) // 2
        x = int(m ** 0.5)
        return x if x * x == m else -1
```

时间复杂度：$O(1)$

空间复杂度：$O(1)$

## Problem 2

[Problem 2](https://leetcode.cn/problems/append-characters-to-string-to-make-subsequence/)

双指针：从头开始遍历s和t，如果相同则同时后移，不同则近移动s，当s遍历完时，t仍没有遍历的字符就是需要添加的字符。

```py
class Solution:
    def appendCharacters(self, s: str, t: str) -> int:
        i, j = 0, 0
        n = len(s)
        m = len(t)
        while i < n and j < m:
            if s[i] == t[j]:
                i += 1
                j += 1
            else:
                i += 1
        return m - j
```

时间复杂度：$O(n+m)$

空间复杂度：$O(1)$

## Problem 3

[Problem 3](https://leetcode.cn/problems/remove-nodes-from-linked-list/description/)

递归做法：如果只有一个节点则直接返回；不然对后续节点调用递归函数，后续节点的头节点值一定是最大的，因此比较当前节点和后续节点的头节点值，如果当前节点值小雨后续节点的头节点值则返回后续节点的头节点（删除当前节点），否则返回当前节点（保留当前节点）。

```py
class Solution:
    def removeNodes(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if head.next is None:
            return head
        head.next = self.removeNodes(head.next)
        if head.val < head.next.val:
            head = head.next
        return head
```

时间复杂度：$O(n)$

空间复杂度：$O(n)$，需要$O(n)$的栈空间。

## Problem 4

[Problem 4](https://leetcode.cn/problems/count-subarrays-with-median-k/description/)

计数问题：对于一段区间来说，如果它的中位数是k，那么假设小于k的有p个，大于k的有q个，则一定有p == q或者p + 1 == p；如果k的位置为pos，那么从pos向左枚举，统计c1 = q - p的个数，然后从pos枚举，如果当前位置q-p=c2，那么考虑pos左边的c1，应该满足c1 + c2 = 0或者c1 + c2 = 1，则ans应该增加 -c1的个数以及1-c1的个数。

```py
class Solution:
    def countSubarrays(self, nums: List[int], k: int) -> int:
        pos = nums.index(k)
        nums = [0 if num == k else (-1 if num < k else 1) for num in nums]
        c = defaultdict(int)
        tmp = 0
        for i in range(pos, -1, -1):
            tmp += nums[i]
            c[tmp] += 1
        tmp = 0
        ans = 0
        for i in range(pos, len(nums)):
            tmp += nums[i]
            ans += c[-tmp] + c[1-tmp]
        return ans
```

时间复杂度：$O(n)$

空间复杂度：$O(n)$
