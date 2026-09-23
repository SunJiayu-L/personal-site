---
title: "Gradient descent and learning rates"
description: "Optimizing an objective with local information."
slug: "gradient-descent"
kind: "note"
lang: "en"
date: "2026-09-21"
course: "machine-learning"
order: 2
tags: ["optimization"]
translationKey: "gradient-descent"
demo: true
published: true
---

## From slope to gradient

A derivative describes local change in one dimension. A gradient collects partial derivatives across dimensions.

## The role of learning rate

For $f(w)=w^2$:

$$
w_{t+1}=(1-2\eta)w_t
$$

For $0<\eta<1$, this simple iteration approaches zero.

## Practical checks

- Record the loss curve rather than only its final value.
- Check feature and target scales.
- Observe both training and validation performance.

## Summary

Optimization and generalization are related but distinct questions. Keep evidence for both.
