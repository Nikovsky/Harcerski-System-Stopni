// @file: apps/api/src/config/repo-root.ts
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function findRepoRoot(startDir: string): string {
  let dir = resolve(startDir);

  while (true) {
    const isRoot =
      existsSync(resolve(dir, 'pnpm-workspace.yaml')) ||
      existsSync(resolve(dir, 'turbo.json')) ||
      existsSync(resolve(dir, '.git')) ||
      existsSync(resolve(dir, 'package.json'));

    if (isRoot) return dir;

    const parent = dirname(dir);
    if (parent === dir) return resolve(startDir); // fallback
    dir = parent;
  }
}
