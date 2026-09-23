---
title: "线性回归：从直觉到最小二乘"
description: "理解预测函数、平方损失与梯度更新。"
slug: "linear-regression"
kind: "note"
lang: "zh"
date: "2026-09-22"
course: "machine-learning"
order: 1
tags: ["machine-learning","linear-models"]
translationKey: "linear-regression"
demo: true
published: true
---

## 本节要回答的问题

给定输入和观测结果，我们如何寻找一个简单的预测规律？线性回归用特征的线性组合近似目标值，是理解监督学习的起点。

> 课程笔记示例。本节用于展示公式、代码和章节导航，不代表已完成的真实课程。

## 模型与目标函数

设样本为 $(x_i,y_i)$，预测函数写为：

$$
\hat y_i = w^\top x_i + b
$$

最小二乘通过最小化平均平方误差来寻找参数：

$$
\mathcal L(w,b) = \frac{1}{n}\sum_{i=1}^{n}(w^\top x_i+b-y_i)^2
$$

### 几何直觉

每个预测值与观测值之间的差是残差。优化目标要求整体残差足够小，但不意味着每个样本都能被完全拟合。

## 梯度下降

沿损失函数梯度的反方向更新参数：

$$
w_{t+1}=w_t-\eta\nabla_w\mathcal L(w_t,b_t)
$$

其中 $\eta$ 为学习率。学习率过大可能导致发散，过小则可能收敛缓慢。

### 最小实现

```python
import numpy as np

def train_step(X, y, w, b, lr=0.01):
    error = X @ w + b - y
    dw = 2 * X.T @ error / len(y)
    db = 2 * error.mean()
    return w - lr * dw, b - lr * db
```

## 检查自己的理解

1. 为什么对残差取平方？
2. 特征尺度会怎样影响梯度下降？
3. 训练误差很小，是否意味着模型能够泛化？

## 参考与下一步

下一节记录梯度下降中的学习率、特征标准化和收敛判断。课程来源将在添加真实资料后填写。
