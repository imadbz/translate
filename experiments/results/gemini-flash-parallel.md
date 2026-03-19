# Eval: gemini-flash-parallel

**Model:** gemini-2.5-flash
**Date:** 2026-03-19T09:06:55.624Z

## Results

| Metric | Value |
|--------|-------|
| Files | 10 |
| Strings extracted | 19 |
| Correct | 19 |
| Missed | 7 |
| False positives | 0 |
| **Accuracy** | **73.1%** |
| Total latency | 152.5s |
| Avg per file | 15.2s |

## Per-file breakdown

| File | Correct | Missed | False+ | Latency |
|------|---------|--------|--------|---------|
| src/App.tsx | 2/2 | 0 | 0 | 9.1s |
| src/CheckoutPage.tsx | 3/3 | 0 | 0 | 4.8s |
| src/ConsoleLog.tsx | 1/1 | 0 | 0 | 3.1s |
| src/CssClasses.tsx | 0/2 | 2 | 0 | 30.0s |
| src/Nav.tsx | 4/4 | 0 | 0 | 23.8s |
| src/Plurals.tsx | 0/4 | 4 | 0 | 30.0s |
| src/Profile.tsx | 6/6 | 0 | 0 | 9.0s |
| src/TypedComponent.tsx | 0/1 | 1 | 0 | 30.0s |
| src/UrlsAndPaths.tsx | 3/3 | 0 | 0 | 9.6s |
| src/main.tsx | 0/0 | 0 | 0 | 2.9s |

## Missed strings
- **src/CssClasses.tsx**: Dashboard, Save changes
- **src/Plurals.tsx**: 1 item, {count} items, You have {count} new messages, No items found
- **src/TypedComponent.tsx**: Card content

## False positives
None
