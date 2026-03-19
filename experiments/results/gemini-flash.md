# Eval: gemini-flash

**Model:** gemini-2.5-flash
**Date:** 2026-03-19T08:48:32.794Z

## Results

| Metric | Value |
|--------|-------|
| Files | 10 |
| Strings extracted | 19 |
| Correct | 19 |
| Missed | 7 |
| False positives | 0 |
| **Accuracy** | **73.1%** |
| Total latency | 68.0s |
| Avg per file | 6.8s |

## Per-file breakdown

| File | Correct | Missed | False+ | Latency |
|------|---------|--------|--------|---------|
| src/App.tsx | 2/2 | 0 | 0 | 10.7s |
| src/CheckoutPage.tsx | 3/3 | 0 | 0 | 4.0s |
| src/ConsoleLog.tsx | 1/1 | 0 | 0 | 5.8s |
| src/CssClasses.tsx | 2/2 | 0 | 0 | 6.3s |
| src/Nav.tsx | 4/4 | 0 | 0 | 7.0s |
| src/Plurals.tsx | 4/4 | 0 | 0 | 9.7s |
| src/Profile.tsx | 0/6 | 6 | 0 | 7.7s |
| src/TypedComponent.tsx | 0/1 | 1 | 0 | 8.3s |
| src/UrlsAndPaths.tsx | 3/3 | 0 | 0 | 4.3s |
| src/main.tsx | 0/0 | 0 | 0 | 4.1s |

## Missed strings
- **src/Profile.tsx**: Hello {name}, You have {itemCount} items in your cart, Search orders, Get help, Help, Your cart is empty
- **src/TypedComponent.tsx**: Card content

## False positives
None
