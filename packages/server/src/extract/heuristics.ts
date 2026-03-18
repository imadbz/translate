import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';

const TRANSLATABLE_ATTRIBUTES = new Set([
  'placeholder',
  'title',
  'alt',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'label',
]);

const SKIP_ATTRIBUTES = new Set([
  'className',
  'class',
  'id',
  'htmlFor',
  'key',
  'ref',
  'style',
  'type',
  'name',
  'value',
  'href',
  'src',
  'action',
  'method',
  'role',
  'tabIndex',
  'data-testid',
  'data-cy',
  'data-id',
]);

const URL_PATTERN = /^(https?:\/\/|mailto:|tel:|\/[a-z]|#)/i;
const FILE_PATH_PATTERN = /\.(js|ts|tsx|jsx|css|scss|png|jpg|jpeg|gif|svg|webp|json|html|md)$/i;
const CSS_VALUE_PATTERN = /^(\d+(\.\d+)?(px|rem|em|vh|vw|%|s|ms)|#[0-9a-f]{3,8})$/i;
const TAILWIND_PATTERN = /^[a-z][a-z0-9_:/.[\]-]*(\s+[a-z][a-z0-9_:/.[\]-]*)*$/;
const ALL_CAPS_PATTERN = /^[A-Z][A-Z0-9_]+$/;
const CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]+$/;

export function isTranslatableAttribute(attrName: string): boolean {
  return TRANSLATABLE_ATTRIBUTES.has(attrName);
}

export function isSkipAttribute(attrName: string): boolean {
  if (SKIP_ATTRIBUTES.has(attrName)) return true;
  if (attrName.startsWith('data-')) return true;
  if (attrName.startsWith('on') && attrName[2] === attrName[2]?.toUpperCase()) return true;
  return false;
}

export function shouldTranslateString(value: string): boolean {
  const trimmed = value.trim();

  // Skip empty or whitespace-only
  if (!trimmed) return false;

  // Skip single characters
  if (trimmed.length < 2) return false;

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  // Skip URLs and file paths
  if (URL_PATTERN.test(trimmed)) return false;
  if (FILE_PATH_PATTERN.test(trimmed)) return false;

  // Skip CSS values
  if (CSS_VALUE_PATTERN.test(trimmed)) return false;

  // Skip ALL_CAPS constants
  if (ALL_CAPS_PATTERN.test(trimmed)) return false;

  // Skip camelCase identifiers (single word)
  if (CAMEL_CASE_PATTERN.test(trimmed) && !trimmed.includes(' ')) return false;

  // Skip Tailwind-like class strings (all lowercase with hyphens and spaces, no uppercase, no punctuation)
  if (TAILWIND_PATTERN.test(trimmed) && trimmed.includes('-')) return false;

  // Skip MIME types
  if (/^[a-z]+\/[a-z0-9.+-]+$/i.test(trimmed)) return false;

  return true;
}

export function isInsideConsoleCall(path: NodePath): boolean {
  let current = path.parentPath;
  while (current) {
    if (
      current.isCallExpression() &&
      current.get('callee').isMemberExpression()
    ) {
      const obj = (current.get('callee') as NodePath<t.MemberExpression>).get('object');
      if (obj.isIdentifier({ name: 'console' })) return true;
    }
    current = current.parentPath;
  }
  return false;
}

export function isInsideImport(path: NodePath): boolean {
  let current = path.parentPath;
  while (current) {
    if (current.isImportDeclaration()) return true;
    if (current.isCallExpression()) {
      const callee = current.get('callee');
      if (callee.isIdentifier({ name: 'require' })) return true;
    }
    current = current.parentPath;
  }
  return false;
}
