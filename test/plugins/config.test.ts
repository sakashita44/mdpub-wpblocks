import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPlugins } from '../../lib/plugins/config.js';

function createTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'mdpub-test-'));
}

describe('loadPlugins', () => {
    it('設定ファイルが存在しない場合は空 Set を返す', () => {
        const dir = createTempDir();
        try {
            const result = loadPlugins(dir);
            expect(result).toEqual(new Set());
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('plugins フィールドが未定義の場合は空 Set を返す', () => {
        const dir = createTempDir();
        try {
            writeFileSync(
                join(dir, '.mdpub-wpblocks.json'),
                JSON.stringify({ contentRoot: 'posts' }),
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
                join(dir, '.mdpub-wpblocks.json'),
                JSON.stringify({ plugins: ['katex'] }),
            );
            const result = loadPlugins(dir);
            expect(result).toEqual(new Set(['katex']));
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('plugins が配列でない場合はエラー', () => {
        const dir = createTempDir();
        try {
            writeFileSync(
                join(dir, '.mdpub-wpblocks.json'),
                JSON.stringify({ plugins: 'katex' }),
            );
            expect(() => loadPlugins(dir)).toThrow('文字列の配列');
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('plugins 配列に文字列以外が含まれる場合はエラー', () => {
        const dir = createTempDir();
        try {
            writeFileSync(
                join(dir, '.mdpub-wpblocks.json'),
                JSON.stringify({ plugins: ['katex', 123] }),
            );
            expect(() => loadPlugins(dir)).toThrow('文字列の配列');
        } finally {
            rmSync(dir, { recursive: true });
        }
    });
});
