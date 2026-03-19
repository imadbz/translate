# Experiments

Git-based workflow for testing different server strategies. Each experiment is a branch. Results are commits. Comparisons are diffs.

## How to run an experiment

### 1. Branch

```bash
git checkout -b exp/my-idea
```

### 2. Create a strategy

Copy and edit a strategy config:

```bash
cp experiments/strategies/baseline.json experiments/strategies/my-idea.json
```

Edit `my-idea.json` — change model, prompt, batching, etc. The strategy config is just metadata; the actual code changes live in the branch (e.g., modifying `llm-transform.ts`).

### 3. Run the eval

```bash
npm run eval -- my-idea
```

This runs every fixture file through the server and compares output against ground truth. Produces:
- `experiments/results/my-idea.json` — full data (per-file tokens, latency, extractions)
- `experiments/results/my-idea.md` — human-readable summary

### 4. Commit results

```bash
git add experiments/
git commit -m "exp: my-idea — results"
```

### 5. Compare against baseline

```bash
git diff main -- experiments/results/
```

Or compare two experiments:

```bash
git diff exp/batch-5..exp/sonnet-model -- experiments/results/
```

### 6. Merge winner

```bash
git checkout main
git merge exp/my-idea
```

## What the eval measures

| Metric | What it means |
|--------|---------------|
| Correct | Strings that should be extracted and were |
| Missed | Strings that should be extracted but weren't |
| False positives | Strings that should NOT be extracted but were (e.g., className values) |
| Accuracy | Correct / (Correct + Missed) |
| Latency | Wall clock time per file and total |
| Tokens | Total tokens used (input + output) |
| Cache hit | Anthropic prompt cache reuse (system prompt) |

## Ground truth

`experiments/ground-truth/simple-app.json` contains the expected extractions for each fixture file, manually curated. Each string has a reason:

```json
{
  "src/CheckoutPage.tsx": {
    "extract": {
      "Checkout": "Heading text",
      "Pay now": "Button label"
    },
    "skip": {
      "btn-primary": "className value",
      "submit": "type attribute value"
    },
    "maybe": {
      "Some string": "Debatable — reason why"
    }
  }
}
```

- **extract**: must be extracted — missing = accuracy penalty
- **skip**: must NOT be extracted — extracting = false positive
- **maybe**: gray area — extracting is noted but not penalized

## Adding fixtures

To test new scenarios:

1. Add a component to `tests/fixtures/simple-app/src/`
2. Add expected extractions to `experiments/ground-truth/simple-app.json`
3. Re-run eval: `npm run eval -- baseline`
4. Commit updated results

## Ideas to experiment with

- Different models (Sonnet vs Haiku, GPT-4o-mini vs Haiku)
- Batching multiple files per LLM call
- Shorter/longer system prompts
- Different output formats (JSON vs code blocks)
- Temperature settings
- Parallel vs sequential processing at different concurrency levels
