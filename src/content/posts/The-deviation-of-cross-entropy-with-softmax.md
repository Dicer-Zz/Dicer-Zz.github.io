---
title: The Deviation of Cross Entropy with Softmax
published: 2021-06-28
description: ""
image: "/gallery/cover/softmax.png"
tags: ["Machine Learning", "Math"]
category: "机器学习"
draft: false
---

# Softmax function

Softmax function is used to regularize all number of a vector to [0, 1]. It is usual appeared in classification problems. By softmax, a vector with huge number can be projected to a small number range -- from 0 to 1. That is useful to avoid gradient explosion & vanishing.



The formula of softmax as follows:
$$
z = [z_1, z_2, \cdots, z_n] \\\\
a = \text{softmax}(z) = [\frac{e^{z_1}}{\sum{e^{z_k}}}, \frac{e^{z_2}}{\sum{e^{z_k}}}, \cdots, \frac{e^{z_n}}{\sum{e^{z_k}}}]
$$
By the way, softmax function is considered as a high-dimension generalization of sigmoid function and sigmoid function is also cansidered as a 2-dim version of softmax function. The formula of sigmoid as follows:
$$
\sigma(x) = \frac{1}{1+e^{-x}}
$$
![sigmoid function from -5 to 5](/gallery/others/sigmoid.png)

# Cross entropy

The cross-entropy of two probability distribution $p$ and $q$ is defined as follows:
$$
H(p, q) = -\sum p_i\log q_i
$$
In classification problems, $p$ is usual a one-hot vector, which have only one position is 1, and others are 0. So, the defintion of cross-entropy is simplified as follows:
$$
H(p, q)=-p_k\log q_k = -\log q_k
$$
We also use cross-entropy as loss function. It is very intuitive because, with the increase or decrease of $q_k$, the loss will change conversely.

# Calculate the derivative of loss function

The simplest classification network as follows:

![cross_entropy](/gallery/others/corss_entropy.png)

Here $z$ is the output of the former neural network, $a$ is the result of softmax $z$, $\hat y$ is the correct answer and $loss$ is the cross entropy of $a$ and $\hat y$.

The formulas as follows:
$$
\begin{equation}
\begin{split}
loss 
& = \text{cross entropy}(a, \hat y)\\
& = \text{cross entropy}(\text{softmax}(z), \hat y)
\end{split}
\end{equation}
$$
In order to make backpropagation, we need to calculate the deviation of $loss$:
$$
\begin{equation}
\begin{split}
\frac{\partial l}{\partial \mathbf z}
& = \frac{\partial l}{\partial \mathbf a}\frac{\partial \mathbf a}{\partial \mathbf z}
\end{split}
\end{equation}
$$
Here $l$ is a scalar, $a$ and $z$ are vectors.

First, we need to know how to calculate the derivative of a scalar $y$ by a vector $x$:
$$
\frac{\partial y}{\partial \mathbf x} = [\frac{\partial y}{\partial x_1},\frac{\partial y}{\partial x_2},\cdots, \frac{\partial y}{\partial x_n}]
$$
Second, how to calculate the derivative of a vector $y$ by a scalar $x$:
$$
\frac{\partial \mathbf y}{\partial x} =\begin{bmatrix}\frac{\partial y_1}{\partial x} \\\\ \frac{\partial y_2}{\partial x}\\\\ \vdots \\\\ \frac{\partial y_n}{\partial x}\end{bmatrix}
$$


And, how to calculate the derivative of a vector $y$ by a vector $x$:
$$
\frac{\partial \mathbf y}{\partial \mathbf x} =
\begin{bmatrix}
\frac{\partial y_1}{\partial x_1} & \frac{\partial y_1}{\partial x_2} & \cdots & \frac{\partial y_1}{\partial x_n}\\\\
\frac{\partial y_2}{\partial x_1} & \frac{\partial y_2}{\partial x_2} & \cdots & \frac{\partial y_2}{\partial x_n} \\\\
\vdots & \vdots & \ddots & \vdots \\\\
\frac{\partial y_n}{\partial x_1} & \frac{\partial y_n}{\partial x_2} & \cdots & \frac{\partial y_n}{\partial x_n}\end{bmatrix}
$$
We can infer the former two by the last one.

According to the above formula, we have this result as follows:
$$
\begin{split}
\frac{\partial l}{\partial \mathbf a}
& = [\frac{\partial l}{\partial a_1},\frac{\partial l}{\partial a_2},\cdots, \frac{\partial l}{\partial a_k}, \cdots, \frac{\partial l}{\partial a_n}] \\\\
& = [0, 0, \cdots, -\frac{1}{a_k}, \cdots, 0]
\end{split}
$$

$$
\frac{\partial \mathbf a}{\partial \mathbf z} =
\begin{bmatrix}
\frac{\partial a_1}{\partial z_1} & \frac{\partial a_1}{\partial z_2} & \cdots & \frac{\partial a_1}{\partial z_n}\\\\
\frac{\partial a_2}{\partial z_1} & \frac{\partial a_2}{\partial z_2} & \cdots & \frac{\partial a_2}{\partial z_n} \\\\
\vdots & \vdots & \ddots & \vdots \\\\
\frac{\partial a_n}{\partial z_1} & \frac{\partial a_n}{\partial z_2} & \cdots & \frac{\partial a_n}{\partial z_n}\end{bmatrix}
$$

Furthermore, when $i = j$,
$$
\begin{split}
\frac{\partial a_i}{\partial z_j}
& = \frac{\partial \frac{e^{z_i}}{\sum{e^{z_k}}}}{\partial z_j} \\\\
& = \frac{e^{z_i}\sum e^{z_k} - e^{z_i}e^{z_i}}{(\sum e^{z_k})^2} \\\\
& = a_i - a_i^2 \\\\
& = a_i(1-a_i)
\end{split}
$$
When $i \neq j$,
$$
\begin{split}
\frac{\partial a_i}{\partial z_j}
& = \frac{\partial \frac{e^{z_i}}{\sum{e^{z_k}}}}{\partial z_j} \\\\
& = \frac{0-e^{z_i}e^{z_j}}{(\sum{e^{z_k}})^2} \\\\
& = -a_ia_j
\end{split}
$$
So,
$$
\frac{\partial \mathbf a}{\partial \mathbf z} =
\begin{bmatrix}
a_1(1-a_1) & -a_1a_2 & \cdots & -a_1a_n\\\\
-a_2a_1 & a_2(1-a_2) & \cdots & -a_2a_n \\\\
\vdots & \vdots & \ddots & \vdots \\\\
-a_na_1 & a_na_2 & \cdots & a_n(1-a_n) \\\\
\end{bmatrix}
$$
But actually, due to only $\frac{\partial l}{\partial a_k} = -\frac{1}{a_k}$, and others are 0, we just need to calculate $\frac{\partial a_k}{\partial \mathbf z}$.

Finally, the derivative of $l$ as follows:
$$
\begin{equation}
\begin{split}
\frac{\partial l}{\partial \mathbf z}
& = \frac{\partial l}{\partial \mathbf a}\frac{\partial \mathbf a}{\partial \mathbf z} \\\\
& = [a_1, a_2, \cdots, a_k-1, \cdots, a_n] \\\\
& = \mathbf a - \mathbf y
\end{split}
\end{equation}
$$
What a beautiful answer!

End.
