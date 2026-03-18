import fg from 'fast-glob';
import { readFile } from 'fs/promises';
import { relative } from 'path';

export interface CollectedFile {
  path: string;
  content: string;
}

export async function collectFiles(
  root: string,
  include: string[],
  exclude: string[],
): Promise<CollectedFile[]> {
  const absolutePaths = await fg(include, {
    cwd: root,
    absolute: true,
    ignore: [...exclude, '**/node_modules/**'],
  });

  const files: CollectedFile[] = [];

  for (const absPath of absolutePaths.sort()) {
    const content = await readFile(absPath, 'utf-8');
    files.push({
      path: relative(root, absPath),
      content,
    });
  }

  return files;
}
