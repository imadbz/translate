import { generateText } from 'ai';
import { createHash } from 'crypto';

export interface LLMTransformOptions {
  model: Parameters<typeof generateText>[0]['model'];
}

export interface TransformResult {
  code: string;
  strings: Record<string, string>;
}

// Cache: file content hash → transform result
const transformCache = new Map<string, TransformResult>();

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export const SYSTEM_PROMPT = `You are a build tool that extracts translatable strings from React/JSX/TSX source and replaces them with __t() calls.

## Task

For each file: identify user-visible strings, replace with \`__t("key")\` calls, return the transformed code + a key→value map.

- Add \`import { useTranslation as __useT } from "@translate/react";\` at the top (only if strings found)
- Add \`const __t = __useT();\` as first line in each component function that uses __t
- For arrow expression bodies: convert to block body to add the hook
- Keys: \`<file_scope>.<snake_case_slug>\` (file_scope from the file path, provided in user message)
- Interpolated strings: \`{\`Hello \${name}\`}\` → \`{__t("scope.hello", { name })}\`, value: \`Hello {name}\`

## Translate (replace with __t)

- JSX text content: \`<h1>Hello</h1>\` → \`<h1>{__t("s.hello")}</h1>\`
- Attributes: placeholder, title, alt, aria-label, aria-description
- Template literals and string expressions in JSX with user-visible text

## Do NOT translate

- Imports, console.log/warn/error args
- className, style, id, key, ref, data-*, type, name, value, href, src, role, htmlFor, on* handlers
- URLs, file paths, CSS values, Tailwind classes, MIME types
- TypeScript types, code identifiers, ALL_CAPS constants
- Strings < 2 chars, whitespace-only

## Example

Input (src/Settings.tsx):
\`\`\`tsx
import { useState } from 'react';
export function Settings({ user }: { user: { name: string } }) {
  console.log('debug');
  return (
    <div className="p-4">
      <h1>Account Settings</h1>
      <p>{\`Welcome, \${user.name}\`}</p>
      <input placeholder="Email" aria-label="Email input" type="email" />
      <button className="btn">Save</button>
      <a href="/help" title="Help">Need help?</a>
    </div>
  );
}
const Footer = () => <footer>All rights reserved</footer>;
\`\`\`

Output:
\`\`\`json
{
  "code": "import { useTranslation as __useT } from \\"@translate/react\\";\\nimport { useState } from 'react';\\nexport function Settings({ user }: { user: { name: string } }) {\\n  const __t = __useT();\\n  console.log('debug');\\n  return (\\n    <div className=\\"p-4\\">\\n      <h1>{__t(\\"settings.account_settings\\")}</h1>\\n      <p>{__t(\\"settings.welcome\\", { name: user.name })}</p>\\n      <input placeholder={__t(\\"settings.email\\")} aria-label={__t(\\"settings.email_input\\")} type=\\"email\\" />\\n      <button className=\\"btn\\">{__t(\\"settings.save\\")}</button>\\n      <a href=\\"/help\\" title={__t(\\"settings.help\\")}>{__t(\\"settings.need_help\\")}</a>\\n    </div>\\n  );\\n}\\nconst Footer = () => { const __t = __useT(); return <footer>{__t(\\"settings.all_rights_reserved\\")}</footer>; };",
  "strings": {
    "settings.account_settings": "Account Settings",
    "settings.welcome": "Welcome, {name}",
    "settings.email": "Email",
    "settings.email_input": "Email input",
    "settings.save": "Save",
    "settings.help": "Help",
    "settings.need_help": "Need help?",
    "settings.all_rights_reserved": "All rights reserved"
  }
}
\`\`\`

Note: console.log, className, type, href were NOT touched. placeholder, aria-label, title WERE. Arrow function converted to block body.

## Response format

Respond with ONLY a JSON block — no other text:

\`\`\`json
{
  "code": "...transformed source...",
  "strings": { "scope.key": "English text" }
}
\`\`\``;

export async function llmTransformFile(
  code: string,
  filePath: string,
  options: LLMTransformOptions,
): Promise<TransformResult> {
  const hash = hashContent(code + filePath);
  const cached = transformCache.get(hash);
  if (cached) {
    console.log(`[llm-transform] ${filePath} (cached)`);
    return cached;
  }

  const fileScope = filePath
    .replace(/^src\//, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\/index$/, '')
    .split('/')
    .map(s => s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/-/g, '_'))
    .join('.');

  console.log(`[llm-transform] ${filePath} → calling LLM...`);
  const start = Date.now();

  let transformResult: TransformResult;
  try {
    const { text, usage, providerMetadata } = await generateText({
      model: options.model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        {
          role: 'user',
          content: `File: ${filePath}\nKey scope: ${fileScope}\n\n\`\`\`tsx\n${code}\n\`\`\``,
        },
      ],
      abortSignal: AbortSignal.timeout(30000),
    });
    const elapsed = Date.now() - start;
    transformResult = parseResponse(text, code);
    const keys = Object.keys(transformResult.strings);
    const cacheCreated = (providerMetadata as any)?.anthropic?.usage?.cache_creation_input_tokens ?? 0;
    const cacheRead = (providerMetadata as any)?.anthropic?.usage?.cache_read_input_tokens ?? 0;
    const cacheInfo = cacheCreated > 0 ? ` (cache created: ${cacheCreated})`
      : cacheRead > 0 ? ` (cache hit: ${cacheRead})`
      : ' (no cache)';
    console.log(`[llm-transform] ${filePath} → ${keys.length} strings, ${elapsed}ms, ${usage?.totalTokens ?? '?'} tokens${cacheInfo}`);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`[llm-transform] ${filePath} → FAILED after ${elapsed}ms: ${err instanceof Error ? err.message : err}`);
    transformResult = { code, strings: {} };
  }

  transformCache.set(hash, transformResult);
  return transformResult;
}

function parseResponse(text: string, originalCode: string): TransformResult {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.code && parsed.strings) {
        return { code: parsed.code, strings: parsed.strings };
      }
    } catch {}
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed.code && parsed.strings) {
      return { code: parsed.code, strings: parsed.strings };
    }
  } catch {}

  return { code: originalCode, strings: {} };
}

export function clearTransformCache(): void {
  transformCache.clear();
}
