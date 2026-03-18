import type { Visitor } from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import {
  shouldTranslateString,
  isTranslatableAttribute,
  isSkipAttribute,
  isInsideConsoleCall,
  isInsideImport,
} from './heuristics.js';

export interface ExtractedString {
  value: string;
  key: string;
  filePath: string;
  type: 'text' | 'attribute' | 'template' | 'string-expression';
  attributeName?: string;
  interpolations?: { name: string; expression: string }[];
  line: number;
  column: number;
}

export type KeyGenFn = (filePath: string, value: string) => string;

export function createExtractionVisitors(
  filePath: string,
  keyGen: KeyGenFn,
): { visitor: Visitor; getExtracted: () => ExtractedString[] } {
  const extracted: ExtractedString[] = [];

  const visitor: Visitor = {
    JSXText(path: NodePath<t.JSXText>) {
      const raw = path.node.value;
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      if (!trimmed || !shouldTranslateString(trimmed)) return;

      extracted.push({
        value: trimmed,
        key: keyGen(filePath, trimmed),
        filePath,
        type: 'text',
        line: path.node.loc?.start.line ?? 0,
        column: path.node.loc?.start.column ?? 0,
      });
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

      extracted.push({
        value: value.value,
        key: keyGen(filePath, value.value),
        filePath,
        type: 'attribute',
        attributeName: attrName,
        line: value.loc?.start.line ?? 0,
        column: value.loc?.start.column ?? 0,
      });
    },

    JSXExpressionContainer(path: NodePath<t.JSXExpressionContainer>) {
      const expr = path.node.expression;

      // Skip JSXEmptyExpression
      if (expr.type === 'JSXEmptyExpression') return;

      // String literal as JSX child: {"Hello"}
      if (expr.type === 'StringLiteral') {
        if (isInsideConsoleCall(path)) return;
        if (isInsideImport(path)) return;
        if (!shouldTranslateString(expr.value)) return;

        extracted.push({
          value: expr.value,
          key: keyGen(filePath, expr.value),
          filePath,
          type: 'string-expression',
          line: expr.loc?.start.line ?? 0,
          column: expr.loc?.start.column ?? 0,
        });
        return;
      }

      // Template literal: {`Hello ${name}`}
      if (expr.type === 'TemplateLiteral') {
        if (isInsideConsoleCall(path)) return;
        if (isInsideImport(path)) return;

        const { text, interpolations } = templateLiteralToText(expr);
        if (!shouldTranslateString(text)) return;

        extracted.push({
          value: text,
          key: keyGen(filePath, text),
          filePath,
          type: 'template',
          interpolations,
          line: expr.loc?.start.line ?? 0,
          column: expr.loc?.start.column ?? 0,
        });
      }
    },
  };

  return { visitor, getExtracted: () => extracted };
}

function templateLiteralToText(node: t.TemplateLiteral): {
  text: string;
  interpolations: { name: string; expression: string }[];
} {
  const parts: string[] = [];
  const interpolations: { name: string; expression: string }[] = [];

  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.cooked ?? node.quasis[i].value.raw);

    if (i < node.expressions.length) {
      const expr = node.expressions[i];
      const name = expressionToName(expr as t.Expression);
      parts.push(`{${name}}`);
      interpolations.push({
        name,
        expression: expressionToString(expr as t.Expression),
      });
    }
  }

  return { text: parts.join(''), interpolations };
}

function expressionToName(expr: t.Expression): string {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression' && expr.property.type === 'Identifier') {
    return expr.property.name;
  }
  return 'expr';
}

function expressionToString(expr: t.Expression): string {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression') {
    const obj = expressionToString(expr.object as t.Expression);
    const prop = expr.property.type === 'Identifier' ? expr.property.name : '?';
    return `${obj}.${prop}`;
  }
  return '(expression)';
}
