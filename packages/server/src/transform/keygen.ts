import { createHash } from 'crypto';

export function generateKey(filePath: string, value: string): string {
  const fileScope = filePathToScope(filePath);
  const slug = textToSlug(value);
  return `${fileScope}.${slug}`;
}

export function filePathToScope(filePath: string): string {
  return filePath
    .replace(/^src\//, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\/index$/, '')
    .split('/')
    .map(pascalToSnake)
    .join('.');
}

export function textToSlug(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/\{[^}]+\}/g, (match) => {
      // Preserve interpolation variable names
      const varName = match.slice(1, -1).trim();
      return varName.split('.').pop() || varName;
    })
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (cleaned.length === 0) return shortHash(text);

  const slug = cleaned.slice(0, 6).join('_');

  if (slug.length > 40) {
    return slug.slice(0, 33) + '_' + shortHash(text);
  }

  return slug;
}

function pascalToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

function shortHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 6);
}

export class KeyRegistry {
  private keys = new Map<string, string>();

  register(filePath: string, value: string): string {
    let key = generateKey(filePath, value);

    const existing = this.keys.get(key);
    if (existing && existing !== value) {
      let counter = 2;
      while (this.keys.has(`${key}_${counter}`) && this.keys.get(`${key}_${counter}`) !== value) {
        counter++;
      }
      key = `${key}_${counter}`;
    }

    this.keys.set(key, value);
    return key;
  }

  clear(): void {
    this.keys.clear();
  }
}
