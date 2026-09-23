---
title: "梯度下降与学习率"
description: "用局部信息逐步优化目标函数。"
slug: "gradient-descent"
kind: "note"
lang: "zh"
date: "2026-09-21"
course: "machine-learning"
order: 2
tags: ["optimization"]
translationKey: "gradient-descent"
demo: true
published: true
---

## 从斜率到梯度

一维函数的导数描述局部变化率。在高维空间中，梯度收集了各个方向的偏导数。

## 学习率的作用

对于 $f(w)=w^2$，更新公式为：

$$
w_{t+1}=(1-2\eta)w_t
$$

当 $0<\eta<1$ 时，这个简单例子会逐步趋近零。

## 实践检查

- 记录损失曲线，而不只观察最后一个数值。
- 确认特征与目标的尺度。
- 同时观察训练集与验证集表现。

## 总结

优化过程与泛化能力是相关但不同的问题。下一次实验时，为两者分别保留证据。
