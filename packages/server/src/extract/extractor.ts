import traverse from '@babel/traverse';
import { parseSource } from '../utils/ast.js';
import { createExtractionVisitors, type ExtractedString, type KeyGenFn } from './visitors.js';

export function extractStrings(
  code: string,
  filePath: string,
  keyGen: KeyGenFn,
): ExtractedString[] {
  const ast = parseSource(code, filePath);
  const { visitor, getExtracted } = createExtractionVisitors(filePath, keyGen);

  traverse(ast, visitor);

  return getExtracted();
}
