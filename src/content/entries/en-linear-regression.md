---
title: "Linear regression: intuition to least squares"
description: "Understanding predictions, squared loss, and gradient updates."
slug: "linear-regression"
kind: "note"
lang: "en"
date: "2026-09-22"
course: "machine-learning"
order: 1
tags: ["machine-learning","linear-models"]
translationKey: "linear-regression"
demo: true
published: true
---

## The question

How can we find a simple predictive pattern from observed inputs and outputs? Linear regression approximates a target with a linear combination of features.

> Sample course note for previewing equations, code, and chapter navigation.

## Model and objective

For samples $(x_i,y_i)$, write the prediction as:

$$
\hat y_i=w^\top x_i+b
$$

Minimize the mean squared error:

$$
\mathcal L(w,b)=\frac{1}{n}\sum_{i=1}^{n}(w^\top x_i+b-y_i)^2
$$

### Geometric intuition

The difference between a prediction and an observation is its residual. Minimizing total squared residuals does not imply a perfect fit for every sample.

## Gradient descent

$$
w_{t+1}=w_t-\eta\nabla_w\mathcal L(w_t,b_t)
$$

The learning rate $\eta$ controls step size. Large steps may diverge; small steps may converge slowly.

### Minimal implementation

```python
import numpy as np

def train_step(X, y, w, b, lr=0.01):
    error = X @ w + b - y
    dw = 2 * X.T @ error / len(y)
    db = 2 * error.mean()
    return w - lr * dw, b - lr * db
```

## Check your understanding

1. Why square the residuals?
2. How does feature scaling affect gradient descent?
3. Does low training error guarantee generalization?

## Next steps

The next note covers learning rates, feature scaling, and convergence checks.
