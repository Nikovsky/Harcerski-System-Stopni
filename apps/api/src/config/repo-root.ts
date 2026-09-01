// @file: apps/api/src/config/repo-root.ts
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function findRepoRoot(startDir: string): string {
  let dir = resolve(startDir);
  let packageRoot: string | undefined;

  while (true) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    if (existsSync(resolve(dir, '.git'))) return dir;
    if (!packageRoot && existsSync(resolve(dir, 'package.json'))) {
      packageRoot = dir;
    }

    const parent = dirname(dir);
    if (parent === dir) return packageRoot ?? resolve(startDir);
    dir = parent;
  }
}
