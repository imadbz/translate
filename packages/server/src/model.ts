import { anthropic } from '@ai-sdk/anthropic';

export function getModel() {
  return anthropic('claude-haiku-4-5-20251001');
}
