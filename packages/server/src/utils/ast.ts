import { parse, type ParserOptions } from '@babel/parser';
import generate from '@babel/generator';
import type { File } from '@babel/types';

export function parseSource(code: string, filePath: string): File {
  const isTS = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
  const plugins: ParserOptions['plugins'] = ['jsx'];
  if (isTS) plugins.push('typescript');

  return parse(code, {
    sourceType: 'module',
    plugins,
    errorRecovery: true,
  });
}

export function generateSource(ast: File): string {
  return generate(ast, { retainLines: true, concise: false }).code;
}
