---
title: "让实验可以被重复：一份实践笔记"
description: "从配置、随机种子和运行记录开始，建立可回溯的实验流程。"
slug: "reproducible-experiments"
kind: "blog"
lang: "zh"
date: "2026-09-16"
category: "technical"
order: 0
tags: ["python","engineering"]
translationKey: "reproducible-experiments"
demo: true
published: true
---

## 为什么需要可重复性

一次实验的价值，不仅在于它是否成功，也在于我们能否解释它为什么成功。这篇示例笔记展示技术文章的代码与表格排版。

## 将配置保存下来

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Experiment:
    seed: int = 42
    learning_rate: float = 0.001
    batch_size: int = 32

config = Experiment()
print(config)
```

## 最小运行记录

| 字段 | 作用 |
| --- | --- |
| commit | 对应的代码版本 |
| config | 超参数与环境配置 |
| dataset | 数据版本与划分 |
| metrics | 评估指标和结果 |

## 在结论之外记录限制

随机种子不能保证所有硬件上的完全一致。还需要记录库版本、运行环境，以及可能使用非确定性计算的算子。
