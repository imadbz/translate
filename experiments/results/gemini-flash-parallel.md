# Eval: gemini-flash-parallel

**Model:** gemini-2.5-flash
**Date:** 2026-03-19T09:34:45.176Z

## Results

| Metric | Value |
|--------|-------|
| Files | 10 |
| Strings extracted | 27 |
| Correct | 23 |
| Missed | 3 |
| False positives | 0 |
| **Accuracy** | **88.5%** |
| Total latency | 59.3s |
| Avg per file | 5.9s |

## Per-file breakdown

| File | Correct | Missed | False+ | Latency |
|------|---------|--------|--------|---------|
| src/App.tsx | 2/2 | 0 | 0 | 5.9s |
| src/CheckoutPage.tsx | 3/3 | 0 | 0 | 3.7s |
| src/ConsoleLog.tsx | 1/1 | 0 | 0 | 3.7s |
| src/CssClasses.tsx | 2/2 | 0 | 0 | 7.1s |
| src/Nav.tsx | 4/4 | 0 | 0 | 3.7s |
| src/Plurals.tsx | 1/4 | 3 | 0 | 10.7s |
| src/Profile.tsx | 6/6 | 0 | 0 | 5.4s |
| src/TypedComponent.tsx | 1/1 | 0 | 0 | 10.0s |
| src/UrlsAndPaths.tsx | 3/3 | 0 | 0 | 5.2s |
| src/main.tsx | 0/0 | 0 | 0 | 3.8s |

## Missed strings
- **src/Plurals.tsx**: 1 item, {count} items, You have {count} new messages

## False positives
None
