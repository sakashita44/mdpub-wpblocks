import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveProjectRoot(importMetaUrl) {
    const scriptDir = dirname(fileURLToPath(importMetaUrl));
    return resolve(scriptDir, '..');
}
