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

export const SYSTEM_PROMPT = `You are a build tool that extracts ALL user-visible strings from React/JSX/TSX source and replaces them with translation calls.

## Two translation functions

1. **\`__t()\`** — inside React components (hook-based)
   - Import: \`import { useTranslation as __useT } from "@translate/react";\`
   - Hook: \`const __t = __useT();\` as first line in each component function
   - For arrow expression bodies: convert to block body to add the hook

2. **\`__tGlobal()\`** — outside React components (module-level constants, configs, data)
   - Import: \`import { t as __tGlobal } from "@translate/react";\`
   - Use directly: \`const label = __tGlobal("scope.label")\`
   - No hook needed — works at module scope

## What to extract

Extract ALL strings a user would see in the UI, regardless of where they're defined:

**In JSX:**
- Text content: \`<h1>Hello</h1>\` → \`<h1>{__t("s.hello")}</h1>\`
- Attributes: placeholder, title, alt, aria-label, aria-description
- Template literals: \`{\`Hello \${name}\`}\` → \`{__t("s.hello", { name })}\`, value: \`Hello {name}\`

**Outside JSX (use __tGlobal):**
- Object/array literals with UI labels: \`{ label: 'Dashboard' }\` → \`{ label: __tGlobal("s.dashboard") }\`
- Constants that render as text: \`const title = 'Settings'\` → \`const title = __tGlobal("s.settings")\`
- Error/toast messages shown to users: \`setError('Invalid email')\` → \`setError(__tGlobal("s.invalid_email"))\`
- Status labels, menu items, form configs, validation messages

## Do NOT translate

- Imports, console.log/warn/error args
- className, style, id, key, ref, data-*, type, name, value, href, src, role, htmlFor, on* handlers
- URLs, file paths, CSS values, Tailwind classes, MIME types
- TypeScript types, code identifiers, ALL_CAPS constants (unless they are display labels)
- Strings < 2 chars, whitespace-only
- Object keys (only translate values)
- Enum member names (but translate display values if they exist)

## Keys

Pattern: \`<file_scope>.<snake_case_slug>\` (file_scope provided in user message)

## Example

Input (src/Settings.tsx):
\`\`\`tsx
import { useState } from 'react';

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security Settings' },
];

export function Settings({ user }: { user: { name: string } }) {
  const [error, setError] = useState('');
  console.log('debug');
  return (
    <div className="p-4">
      <h1>Account Settings</h1>
      <p>{\`Welcome, \${user.name}\`}</p>
      <input placeholder="Email" type="email" />
      <button className="btn" onClick={() => setError('Invalid email')}>Save</button>
    </div>
  );
}
\`\`\`

Output:
\`\`\`json
{
  "code": "import { useTranslation as __useT } from \\"@translate/react\\";\\nimport { t as __tGlobal } from \\"@translate/react\\";\\nimport { useState } from 'react';\\n\\nconst tabs = [\\n  { id: 'profile', label: __tGlobal(\\"settings.profile\\") },\\n  { id: 'security', label: __tGlobal(\\"settings.security_settings\\") },\\n];\\n\\nexport function Settings({ user }: { user: { name: string } }) {\\n  const __t = __useT();\\n  const [error, setError] = useState('');\\n  console.log('debug');\\n  return (\\n    <div className=\\"p-4\\">\\n      <h1>{__t(\\"settings.account_settings\\")}</h1>\\n      <p>{__t(\\"settings.welcome\\", { name: user.name })}</p>\\n      <input placeholder={__t(\\"settings.email\\")} type=\\"email\\" />\\n      <button className=\\"btn\\" onClick={() => setError(__t(\\"settings.invalid_email\\"))}>{__t(\\"settings.save\\")}</button>\\n    </div>\\n  );\\n}",
  "strings": {
    "settings.profile": "Profile",
    "settings.security_settings": "Security Settings",
    "settings.account_settings": "Account Settings",
    "settings.welcome": "Welcome, {name}",
    "settings.email": "Email",
    "settings.invalid_email": "Invalid email",
    "settings.save": "Save"
  }
}
\`\`\`

Note: \`tabs\` array uses \`__tGlobal()\` (module scope). \`setError()\` inside the component uses \`__t()\` (component scope). Object keys (\`id: 'profile'\`) were NOT touched — only the \`label\` values. console.log, className, type were NOT touched.

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
