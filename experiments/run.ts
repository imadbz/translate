import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { llmTransformFile, clearTransformCache } from '../packages/server/src/transform/llm-transform.js';
import { translateStrings } from '../packages/server/src/translate/llm.js';
import { clearCache as clearTranslationCache } from '../packages/server/src/translate/cache.js';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

interface GroundTruth {
  _meta: { description: string };
  expected: Record<string, {
    extract: Record<string, string>;
    skip: Record<string, string>;
    maybe?: Record<string, string>;
  }>;
}

interface FileResult {
  file: string;
  latencyMs: number;
  totalTokens: number;
  cacheCreated: number;
  cacheRead: number;
  extracted: Record<string, string>;
  correct: string[];
  missed: string[];
  falsePositives: string[];
  maybeCorrect: string[];
}

interface EvalReport {
  strategy: string;
  model: string;
  timestamp: string;
  files: FileResult[];
  translation?: {
    locale: string;
    latencyMs: number;
    totalTokens: number;
    keyCount: number;
  }[];
  totals: {
    files: number;
    latencyMs: number;
    totalTokens: number;
    extractedCount: number;
    correctCount: number;
    missedCount: number;
    falsePositiveCount: number;
    accuracy: number;
    estimatedCostUsd: number;
  };
}

const PRICING = {
  'claude-haiku-4-5-20251001': { input: 1.0, cacheWrite: 1.25, cacheRead: 0.1, output: 5.0 },
} as Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }>;

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number,
): number {
  const pricing = PRICING[model] ?? PRICING['claude-haiku-4-5-20251001'];
  const uncachedInput = inputTokens - cacheWriteTokens - cacheReadTokens;
  return (
    (uncachedInput * pricing.input +
      cacheWriteTokens * pricing.cacheWrite +
      cacheReadTokens * pricing.cacheRead +
      outputTokens * pricing.output) / 1_000_000
  );
}

async function main() {
  const strategyName = process.argv[2] ?? 'baseline';
  const strategyPath = path.resolve('experiments/strategies', `${strategyName}.json`);
  const strategy = JSON.parse(fs.readFileSync(strategyPath, 'utf-8'));

  const groundTruthPath = path.resolve('experiments/ground-truth/simple-app.json');
  const groundTruth: GroundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));

  const fixtureDir = path.resolve('tests/fixtures/simple-app/src');
  const providers: Record<string, (id: string) => any> = { anthropic, google };
  const createModel = providers[strategy.provider];
  if (!createModel) throw new Error(`Unknown provider: ${strategy.provider}`);
  const model = createModel(strategy.model);

  // Clear all caches for clean measurement
  clearTransformCache();
  clearTranslationCache();

  console.log(`\n🔬 Running eval: ${strategy.name}`);
  console.log(`   Model: ${strategy.model}`);
  console.log(`   Mode: ${strategy.mode}\n`);

  const allExtracted: Record<string, string> = {};
  let totalCost = 0;

  const fixtureFiles = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.tsx')).sort();
  const isParallel = strategy.mode?.includes('parallel');

  // Process files — parallel or sequential based on strategy
  const processFile = async (fileName: string) => {
    const filePath = `src/${fileName}`;
    const code = fs.readFileSync(path.join(fixtureDir, fileName), 'utf-8');
    const expected = groundTruth.expected[filePath];

    const start = Date.now();
    const result = await llmTransformFile(code, filePath, { model });
    const latencyMs = Date.now() - start;

    const extractedValues = new Set(Object.values(result.strings));
    Object.assign(allExtracted, result.strings);

    const expectedExtract = expected?.extract ?? {};
    const expectedSkip = expected?.skip ?? {};
    const expectedMaybe = expected?.maybe ?? {};

    const correct: string[] = [];
    const missed: string[] = [];
    const falsePositives: string[] = [];
    const maybeCorrect: string[] = [];

    for (const value of Object.keys(expectedExtract)) {
      if (extractedValues.has(value)) {
        correct.push(value);
      } else {
        missed.push(value);
      }
    }

    for (const value of extractedValues) {
      if (!expectedExtract[value] && !expectedMaybe?.[value]) {
        if (expectedSkip[value]) {
          falsePositives.push(value);
        }
      }
      if (expectedMaybe?.[value]) {
        maybeCorrect.push(value);
      }
    }

    const inputTokens = 4263 + 200;
    const outputTokens = JSON.stringify(result).length / 4;

    const fr: FileResult = {
      file: filePath,
      latencyMs,
      totalTokens: inputTokens + outputTokens,
      cacheCreated: 0,
      cacheRead: 0,
      extracted: result.strings,
      correct,
      missed,
      falsePositives,
      maybeCorrect,
    };

    const status = missed.length === 0 && falsePositives.length === 0 ? '✅' : '⚠️';
    console.log(`${status} ${filePath} — ${correct.length}/${Object.keys(expectedExtract).length} correct, ${missed.length} missed, ${falsePositives.length} false+, ${latencyMs}ms`);
    if (missed.length > 0) console.log(`   MISSED: ${missed.join(', ')}`);
    if (falsePositives.length > 0) console.log(`   FALSE+: ${falsePositives.join(', ')}`);
    if (maybeCorrect.length > 0) console.log(`   MAYBE: ${maybeCorrect.join(', ')}`);

    return fr;
  };

  let fileResults: FileResult[];
  const extractionStart = Date.now();

  if (isParallel) {
    console.log(`⚡ Running ${fixtureFiles.length} files in parallel\n`);
    fileResults = await Promise.all(fixtureFiles.map(processFile));
  } else {
    fileResults = [];
    for (const fileName of fixtureFiles) {
      fileResults.push(await processFile(fileName));
    }
  }

  const extractionMs = Date.now() - extractionStart;
  console.log(`\n⏱️  Extraction wall time: ${(extractionMs / 1000).toFixed(1)}s`);

  // Run translation for one locale to measure
  console.log('\n--- Translation ---');
  const translationResults: EvalReport['translation'] = [];
  for (const locale of ['fr']) {
    const start = Date.now();
    await translateStrings({
      model,
      sourceStrings: allExtracted,
      targetLocale: locale,
    });
    const latencyMs = Date.now() - start;
    translationResults.push({ locale, latencyMs, totalTokens: 0, keyCount: Object.keys(allExtracted).length });
    console.log(`🌐 ${locale} — ${Object.keys(allExtracted).length} keys, ${latencyMs}ms`);
  }

  // Totals
  const totalLatency = fileResults.reduce((s, r) => s + r.latencyMs, 0);
  const totalTokens = fileResults.reduce((s, r) => s + r.totalTokens, 0);
  const totalCorrect = fileResults.reduce((s, r) => s + r.correct.length, 0);
  const totalMissed = fileResults.reduce((s, r) => s + r.missed.length, 0);
  const totalFalsePositives = fileResults.reduce((s, r) => s + r.falsePositives.length, 0);
  const totalExtracted = fileResults.reduce((s, r) => s + Object.keys(r.extracted).length, 0);
  const totalExpected = totalCorrect + totalMissed;
  const accuracy = totalExpected > 0 ? totalCorrect / totalExpected : 1;

  const report: EvalReport = {
    strategy: strategy.name,
    model: strategy.model,
    timestamp: new Date().toISOString(),
    files: fileResults,
    translation: translationResults,
    totals: {
      files: fileResults.length,
      latencyMs: totalLatency,
      totalTokens,
      extractedCount: totalExtracted,
      correctCount: totalCorrect,
      missedCount: totalMissed,
      falsePositiveCount: totalFalsePositives,
      accuracy: Math.round(accuracy * 1000) / 10,
      estimatedCostUsd: 0, // TODO: calculate from actual token breakdown
    },
  };

  // Write report
  const reportDir = path.resolve('experiments/results');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${strategy.name}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

  // Write summary markdown
  const summaryPath = path.join(reportDir, `${strategy.name}.md`);
  const summary = `# Eval: ${strategy.name}

**Model:** ${strategy.model}
**Date:** ${report.timestamp}

## Results

| Metric | Value |
|--------|-------|
| Files | ${report.totals.files} |
| Strings extracted | ${report.totals.extractedCount} |
| Correct | ${report.totals.correctCount} |
| Missed | ${report.totals.missedCount} |
| False positives | ${report.totals.falsePositiveCount} |
| **Accuracy** | **${report.totals.accuracy}%** |
| Total latency | ${(report.totals.latencyMs / 1000).toFixed(1)}s |
| Avg per file | ${(report.totals.latencyMs / report.totals.files / 1000).toFixed(1)}s |

## Per-file breakdown

| File | Correct | Missed | False+ | Latency |
|------|---------|--------|--------|---------|
${fileResults.map(r => {
  const expected = Object.keys(groundTruth.expected[r.file]?.extract ?? {}).length;
  return `| ${r.file} | ${r.correct.length}/${expected} | ${r.missed.length} | ${r.falsePositives.length} | ${(r.latencyMs / 1000).toFixed(1)}s |`;
}).join('\n')}

## Missed strings
${fileResults.filter(r => r.missed.length > 0).map(r => `- **${r.file}**: ${r.missed.join(', ')}`).join('\n') || 'None'}

## False positives
${fileResults.filter(r => r.falsePositives.length > 0).map(r => `- **${r.file}**: ${r.falsePositives.join(', ')}`).join('\n') || 'None'}
`;
  fs.writeFileSync(summaryPath, summary);

  console.log(`\n📊 Summary: ${totalCorrect}/${totalExpected} correct (${report.totals.accuracy}%), ${totalFalsePositives} false positives, ${(totalLatency / 1000).toFixed(1)}s total`);
  console.log(`📄 Report: ${reportPath}`);
  console.log(`📄 Summary: ${summaryPath}`);
}

main();
