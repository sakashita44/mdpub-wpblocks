import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** package.json を上方探索してプロジェクトルートを返す */
export function resolveProjectRoot(importMetaUrl: string): string {
    let dir = dirname(fileURLToPath(importMetaUrl));
    while (dir !== dirname(dir)) {
        if (existsSync(join(dir, 'package.json'))) return dir;
        dir = dirname(dir);
    }
    throw new Error('package.json が見つかりません');
}
