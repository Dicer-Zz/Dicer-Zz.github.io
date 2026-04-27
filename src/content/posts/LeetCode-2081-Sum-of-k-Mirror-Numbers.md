---
title: LeetCode 2081. Sum of k-Mirror Numbers
published: 2021-11-25
description: "昨天闲来无事做了一个LeetCode的周赛，看到大佬不到二十分钟就AK了，真是Orz 本篇记录一下第四题的答案。 比赛链接"
tags: ["LeetCode-Hard"]
category: "LeetCode"
draft: false
---

昨天闲来无事做了一个LeetCode的周赛，看到大佬不到二十分钟就AK了，真是Orz

本篇记录一下第四题的答案。

[比赛链接](https://leetcode-cn.com/contest/weekly-contest-268/)

# k 镜像数字的和

[题目链接](https://leetcode-cn.com/problems/sum-of-k-mirror-numbers/)

可以考虑快速找到所有十进制下的回文数，然后判断在k进制下是否是回文数。

快速查找回文数的方法，可以用构造法：

考虑数字 99，它的下一个回文数应该是 101。

考虑数字 1234，它的下一个回文数应该是 1331。

考虑数字 999，它的下一个回文数应该是 1001。

考虑数字 191，它的下一个回文数应该是 202。

将数字的前一半（如果是奇数位，包括中间位）定义为left，然后将left+1，如果产生进位，那么我们需要直接找100…001格式的下一个数字。否则，我们只需要将left对称就可以得到下一个回文数的后半部分了（需要考虑数字的位数）

| Number | Left | Left+1 | Right | NextParlindrome |
| --- | --- | --- | --- | --- |
| 99 | 9 | 10 | 1 | 101 |
| 999 | 99 | 100 | 1 | 1001 |
| 1234 | 12 | 13 | 31 | 1331 |
| 191 | 19 | 20 | 2 | 202 |

实现上述逻辑：

```python
def nextParlindrome(s):
        left = s[:(len(s)+1)//2]
        carry = len(str(int(left) + 1)) != len(left)
        odd = int(len(s) % 2 == 1)
        left = str(int(left) + 1)
        if carry:	# 特判 99..99 格式的数字
            return "1" + "0"*(len(s)-1) + "1"
        else:
            return left + (left[:-1][::-1] if odd else left[::-1])
```

可以看出，这个复杂度是只与数字的长度相关的，因此复杂度为 $O(len(s))$
