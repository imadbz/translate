import 'dotenv/config';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

async function main() {
  const model = anthropic('claude-haiku-4-5-20251001');

  // Use our actual system prompt
  const { SYSTEM_PROMPT } = await import('../packages/server/src/transform/llm-transform.js');

  console.log('=== CALL 1 (should create cache) ===');
  const r1 = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      { role: 'user', content: 'File: src/Test.tsx\nKey scope: test\n\n```tsx\n<h1>Hello</h1>\n```' },
    ],
  });
  console.log('Usage raw:', JSON.stringify(r1.usage.raw, null, 2));

  console.log('\n=== CALL 2 (should hit cache) ===');
  const r2 = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      { role: 'user', content: 'File: src/Other.tsx\nKey scope: other\n\n```tsx\n<p>World</p>\n```' },
    ],
  });
  console.log('Usage raw:', JSON.stringify(r2.usage.raw, null, 2));
}

main();
