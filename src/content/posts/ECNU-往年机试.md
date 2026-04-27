---
title: ECNU 往年机试
published: 2021-03-08
description: ""
image: "/gallery/thumbnails/kite.png"
tags: ["考研"]
category: "ECNU"
draft: false
---

# 两场EOJ上公开的机试

EOJ上好多机试题都关闭了，只剩下这两场了。

我和那一场区域赛难度的机试似乎无缘相见了。

题目简单，不想写题解。



# 2018 研究生面试机考 (软件工程)

Link: https://acm.ecnu.edu.cn/contest/61/

## A

```cpp
#include<bits/stdc++.h>
using namespace std;

int main() {
	int n, m;
	cin >> n >> m;
	int sum = 0;
	for(int i = 1; i <= n; i++) {
		int tmp = 0, x;
		for(int j = 1; j <= m; j++) {
			cin >> x;
			tmp = max(tmp, x);
		}
		sum += tmp;
	}
	cout << sum << endl;
	return 0;
}
```

## B

```cpp
#include<bits/stdc++.h>
using namespace std;

int arr[21][21];

int main() {
	int n;
	cin >> n;
	for(int i = 1; i <= n; i++) {
		for(int j = 1; j <= i; j++) {
			if(j == 1 || j == i)	arr[i][j] = 1;
			else arr[i][j] = arr[i-1][j-1] + arr[i-1][j];
		}
		for(int j = 1; j <= i; j++) {
			printf("%d%c", arr[i][j], (i == j)?'\\n':' ');
		}
	}
	return 0;
}
```

## C

```cpp
#include<bits/stdc++.h>
using namespace std;

string s[21];

int main() {
	int n;
	cin >> n;
	for(int i = 1; i <= n; i++)	cin >> s[i];
	sort(s+1, s+1+n, [](string s1, string s2) -> bool {
		int n = min(s1.size(), s2.size());
		for(int i = 0; i < n; i++) {
			if(s1[i] > s2[i])	return 1;
			else if(s1[i] < s2[i])	return 0;
			else	continue;
		}
		return 1;
	});
	for(int i = 1; i <= n; i++)	cout << s[i];
	return 0;
}
```

## D

```cpp
#include<bits/stdc++.h>
using namespace std;

int main() {
	int n, k;
	cin >> n >> k;
	map<int, bool> disable;
	for(int i = 1; i <= k; i++) {
		int x; cin >> x;
		disable[x] = 1;
	}

	vector<int> dp(n+1, 0);
	dp[0] = 1;
	for(int i = 1; i <= n; i++) {
		int sum = 0;
		if(i - 1 >= 0 && disable[i-1] == 0)	sum += dp[i-1];
		if(i - 2 >= 0 && disable[i-2] == 0)	sum += dp[i-2];
		if(i - 3 >= 0 && disable[i-3] == 0)	sum += dp[i-3];
		if(disable[i] == 0)	dp[i] = sum;
		else	dp[i] = 0;
	}
	cout << dp[n] << endl;
	return 0;
}
```

## E

```cpp
#include<bits/stdc++.h>
using namespace std;

int main() {
	map<int, bool> one;
	one[1] = 1;
	int x = 1, p = 1;
	while(x <= 1e9) {
		one[x+p] = 1;
		x += p;
		p++;
	}
	int n;
	cin >> n;
	while(n--) {
		cin >> x;
		cout << one[x] << endl;
	}
	return 0;
}

/*
1 2 4 7 11
*/
```

## F

```cpp
#include<bits/stdc++.h>
using namespace std;

int main() {
	int n, m, k;
	cin >> n >> m >> k;
	int i = 0, j = 0;
	while(k--) {
		cout << i + 1 << ' ' << j + 1 << endl;
		i++; i %= n;
		j++; j %= m;
	}
	return 0;
}
```

# 2018 研究生机试 (计算机系第二批)

Link: https://acm.ecnu.edu.cn/contest/66/

## A

```python
a = [int(x) for x in input().split()]
print(max(a[1:]))
```

## B

```cpp
#include<bits/stdc++.h>
using namespace std;

int main() {
	int n;
	cin >> n;
	for(int i = 7; i >= 0; i--)	cout << ((n>>i)&1);
	return 0;
}
```

## C

```python
s = input()
count = 0
for i in range(len(s)):
	count += ('0' <=s[i] <= '9')
print(count)
```

## D

```python
arr = [int(x) for x in input().split()][1:]
arr = sorted(arr)
# print(arr)
ans = 0x7f7f7f7f
for i in range(1, len(arr)):
	ans = min(ans, arr[i] - arr[i-1])
print(ans)
```

## E

```python
arr = [int(x) for x in input().split()][1:]
arr.sort()
arr = arr[::-1]
arr.sort(key = lambda x: abs(x))
arr = arr[::-1]
print(','.join([str(x) for x in arr]))
```

## F

```python
import struct
f = float(input())
m = struct.pack('d', f).hex()
m = str(m).upper()
m = [m[i*2:i*2+2] for i in range(0, 8)][::-1]
m = '-'.join(m)
print(m)
```