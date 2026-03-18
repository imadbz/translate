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

export type KeyGenFn = (filePath: string, value: string) => string;

/**
 * Transforms source code by replacing translatable strings with t() calls.
 * The t() function is imported from @translate/react.
 *
 * `<h1>Hello</h1>` → `<h1>{t('key.hello')}</h1>`
 * `<input placeholder="Email" />` → `<input placeholder={t('key.email')} />`
 * `{`Hello ${name}`}` → `{t('key.hello_name', { name })}`
 */
export function emitTCalls(
  code: string,
  filePath: string,
  keyGen: KeyGenFn,
): string {
  const ast = parseSource(code, filePath);
  let hasTranslations = false;

  traverse(ast, {
    JSXText(path: NodePath<t.JSXText>) {
      const raw = path.node.value;
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      if (!trimmed || !shouldTranslateString(trimmed)) return;

      const key = keyGen(filePath, trimmed);
      hasTranslations = true;

      // Replace JSXText with {t('key')}
      path.replaceWith(
        t.jsxExpressionContainer(
          t.callExpression(t.identifier('__t'), [t.stringLiteral(key)])
        )
      );
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
      hasTranslations = true;

      // Replace "string" with {t('key')}
      path.node.value = t.jsxExpressionContainer(
        t.callExpression(t.identifier('__t'), [t.stringLiteral(key)])
      );
    },

    JSXExpressionContainer(path: NodePath<t.JSXExpressionContainer>) {
      const expr = path.node.expression;
      if (expr.type === 'JSXEmptyExpression') return;

      // String literal: {"Hello"}
      if (expr.type === 'StringLiteral') {
        if (isInsideConsoleCall(path)) return;
        if (isInsideImport(path)) return;
        if (!shouldTranslateString(expr.value)) return;

        const key = keyGen(filePath, expr.value);
        hasTranslations = true;

        path.node.expression = t.callExpression(
          t.identifier('__t'),
          [t.stringLiteral(key)]
        );
        return;
      }

      // Template literal: {`Hello ${name}`}
      if (expr.type === 'TemplateLiteral') {
        if (isInsideConsoleCall(path)) return;
        if (isInsideImport(path)) return;

        const { text, params } = templateLiteralToParams(expr);
        if (!shouldTranslateString(text)) return;

        const key = keyGen(filePath, text);
        hasTranslations = true;

        if (params.length === 0) {
          path.node.expression = t.callExpression(
            t.identifier('__t'),
            [t.stringLiteral(key)]
          );
        } else {
          // t('key', { name, count })
          path.node.expression = t.callExpression(
            t.identifier('__t'),
            [
              t.stringLiteral(key),
              t.objectExpression(
                params.map(p =>
                  t.objectProperty(
                    t.identifier(p.name),
                    p.expression,
                    false,
                    p.name === expressionToSource(p.expression),
                  )
                )
              ),
            ]
          );
        }
      }
    },
  });

  if (!hasTranslations) return code;

  // Add import: import { useTranslation as __useT } from '@translate/react';
  // And: const __t = __useT();
  // Wait — we can't call hooks at module level. The t() needs to come from
  // the component's render context. Instead, we inject a hook call at the top
  // of each component function that uses __t.
  //
  // Actually, the simplest approach: inject the import and let the plugin
  // wrap this. But for now, we use a global __t that the provider sets up.
  //
  // The cleanest approach: the plugin adds `import { useTranslation } from '@translate/react'`
  // and at the top of each component that uses __t, adds `const __t = useTranslation()`.
  //
  // Let's do it: find all function components that contain __t calls and inject the hook.

  injectHookIntoComponents(ast);

  // Add the import at the top
  const importDecl = t.importDeclaration(
    [t.importSpecifier(t.identifier('__useT'), t.identifier('useTranslation'))],
    t.stringLiteral('@translate/react')
  );
  ast.program.body.unshift(importDecl);

  return generateSource(ast);
}

function injectHookIntoComponents(ast: t.File) {
  traverse(ast, {
    // Arrow functions and function declarations that return JSX
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(
      path: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>
    ) {
      // Check if this function contains any __t calls
      let hasT = false;
      path.traverse({
        CallExpression(inner: NodePath<t.CallExpression>) {
          if (inner.node.callee.type === 'Identifier' && inner.node.callee.name === '__t') {
            hasT = true;
            inner.stop();
          }
        },
      });

      if (!hasT) return;

      // Inject `const __t = __useT();` at the top of the function body
      const hookCall = t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('__t'),
          t.callExpression(t.identifier('__useT'), [])
        ),
      ]);

      const body = path.node.body;
      if (body.type === 'BlockStatement') {
        body.body.unshift(hookCall);
      } else {
        // Arrow function with expression body: () => <div>...</div>
        // Convert to block: () => { const __t = __useT(); return <div>...</div>; }
        path.node.body = t.blockStatement([
          hookCall,
          t.returnStatement(body as t.Expression),
        ]);
      }
    },
  });
}

interface ParamInfo {
  name: string;
  expression: t.Expression;
}

function templateLiteralToParams(node: t.TemplateLiteral): {
  text: string;
  params: ParamInfo[];
} {
  const parts: string[] = [];
  const params: ParamInfo[] = [];

  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.cooked ?? node.quasis[i].value.raw);

    if (i < node.expressions.length) {
      const expr = node.expressions[i] as t.Expression;
      const name = expressionToName(expr);
      parts.push(`{${name}}`);
      params.push({ name, expression: expr });
    }
  }

  return { text: parts.join(''), params };
}

function expressionToName(expr: t.Expression): string {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression' && expr.property.type === 'Identifier') {
    return expr.property.name;
  }
  return 'expr';
}

function expressionToSource(expr: t.Expression): string {
  if (expr.type === 'Identifier') return expr.name;
  return '';
}
