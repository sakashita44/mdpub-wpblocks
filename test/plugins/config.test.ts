import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPlugins } from '../../lib/plugins/config.js';

function createTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'mdpub-test-'));
}

describe('loadPlugins', () => {
    it('キャッシュファイルが存在しない場合は空 Set を返す', () => {
        const dir = createTempDir();
        try {
            const result = loadPlugins(dir);
            expect(result).toEqual(new Set());
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('plugins フィールドが配列でない場合は空 Set を返す', () => {
        const dir = createTempDir();
        try {
            writeFileSync(
                join(dir, '.mdpub-cache.json'),
                JSON.stringify({ generatedAt: '2026-01-01', plugins: null }),
            );
            const result = loadPlugins(dir);
            expect(result).toEqual(new Set());
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('plugins 配列からプラグイン名の Set を返す', () => {
        const dir = createTempDir();
        try {
            writeFileSync(
                join(dir, '.mdpub-cache.json'),
                JSON.stringify({
                    generatedAt: '2026-01-01',
                    plugins: ['katex'],
                }),
            );
            const result = loadPlugins(dir);
            expect(result).toEqual(new Set(['katex']));
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('不正な JSON の場合はエラー', () => {
        const dir = createTempDir();
        try {
            writeFileSync(join(dir, '.mdpub-cache.json'), '{invalid json}');
            expect(() => loadPlugins(dir)).toThrow(
                '.mdpub-cache.json の読み込みに失敗しました',
            );
        } finally {
            rmSync(dir, { recursive: true });
        }
    });
});
