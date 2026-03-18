import traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { parseSource, generateSource } from '../utils/ast.js';
import {
  shouldTranslateString,
  isTranslatableAttribute,
  isSkipAttribute,
  isInsideConsoleCall,
  isInsideImport,
} from '../extract/heuristics.js';

export interface TranslationMap {
  [key: string]: string;
}

export type KeyGenFn = (filePath: string, value: string) => string;

export function inlineTranslations(
  code: string,
  filePath: string,
  translations: TranslationMap,
  keyGen: KeyGenFn,
): string {
  const ast = parseSource(code, filePath);

  traverse(ast, {
    JSXText(path: NodePath<t.JSXText>) {
      const raw = path.node.value;
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      if (!trimmed || !shouldTranslateString(trimmed)) return;

      const key = keyGen(filePath, trimmed);
      const translation = translations[key];
      if (!translation || translation === trimmed) return;

      // Preserve leading/trailing whitespace from original
      const leadingSpace = raw.match(/^\s+/)?.[0] ?? '';
      const trailingSpace = raw.match(/\s+$/)?.[0] ?? '';
      path.node.value = leadingSpace + translation + trailingSpace;
    },

    JSXAttribute(path: NodePath<t.JSXAttribute>) {
      const attrName = typeof path.node.name === 'string'
        ? path.node.name
        : path.node.name.name;

      if (isSkipAttribute(attrName)) return;
      if (!isTranslatableAttribute(attrName)) return;

      const value = path.node.value;
      if (!value || value.type !== 'StringLiteral') return;
      if (!shouldTranslateString(value.value)) return;

      const key = keyGen(filePath, value.value);
      const translation = translations[key];
      if (!translation || translation === value.value) return;

      value.value = translation;
    },

    JSXExpressionContainer(path: NodePath<t.JSXExpressionContainer>) {
      const expr = path.node.expression;
      if (expr.type === 'JSXEmptyExpression') return;

      if (expr.type === 'StringLiteral') {
        if (isInsideConsoleCall(path)) return;
        if (isInsideImport(path)) return;
        if (!shouldTranslateString(expr.value)) return;

        const key = keyGen(filePath, expr.value);
        const translation = translations[key];
        if (!translation || translation === expr.value) return;

        expr.value = translation;
        return;
      }

      if (expr.type === 'TemplateLiteral') {
        if (isInsideConsoleCall(path)) return;
        if (isInsideImport(path)) return;

        const text = templateLiteralToText(expr);
        if (!shouldTranslateString(text)) return;

        const key = keyGen(filePath, text);
        const translation = translations[key];
        if (!translation || translation === text) return;

        // Replace the static parts of the template literal
        replaceTemplateLiteralQuasis(expr, translation);
      }
    },
  });

  return generateSource(ast);
}

function templateLiteralToText(node: t.TemplateLiteral): string {
  const parts: string[] = [];
  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.cooked ?? node.quasis[i].value.raw);
    if (i < node.expressions.length) {
      const expr = node.expressions[i] as t.Expression;
      parts.push(`{${expressionToName(expr)}}`);
    }
  }
  return parts.join('');
}

function expressionToName(expr: t.Expression): string {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression' && expr.property.type === 'Identifier') {
    return expr.property.name;
  }
  return 'expr';
}

function replaceTemplateLiteralQuasis(
  node: t.TemplateLiteral,
  translation: string,
): void {
  // Parse the translation string to split on {placeholder} markers
  const parts = translation.split(/\{[^}]+\}/);

  // Replace each quasi with the corresponding translated part
  for (let i = 0; i < node.quasis.length; i++) {
    const newValue = parts[i] ?? '';
    node.quasis[i].value = { raw: newValue, cooked: newValue };
  }
}
