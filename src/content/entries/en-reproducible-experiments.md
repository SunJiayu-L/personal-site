---
title: "Making experiments reproducible"
description: "A practical starting point: configurations, seeds, and experiment records."
slug: "reproducible-experiments"
kind: "blog"
lang: "en"
date: "2026-09-16"
category: "technical"
order: 0
tags: ["python","engineering"]
translationKey: "reproducible-experiments"
demo: true
published: true
---

## Why reproducibility matters

A useful experiment lets us explain its outcome. This sample demonstrates code blocks and tables.

## Save the configuration

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

## A minimal experiment record

| Field | Purpose |
| --- | --- |
| commit | Source code version |
| config | Hyperparameters and environment |
| dataset | Version and split |
| metrics | Evaluation results |

## Document limitations

A random seed does not guarantee identical results on every device. Record library versions, the environment, and nondeterministic operations too.
