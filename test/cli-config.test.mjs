import {
    mkdtempSync,
    rmSync,
    writeFileSync,
    mkdirSync,
    existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    extractOption,
    resolveContentRoot,
    resolveArticleDirPath,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.mjs';

describe('cli-config', () => {
    let workDir;
    let originalEnv;

    beforeEach(() => {
        workDir = mkdtempSync(join(tmpdir(), 'mdpub-cli-config-'));
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        if (workDir && existsSync(workDir)) {
            rmSync(workDir, { recursive: true, force: true });
        }
    });

    it('extractOption は --key value と --key=value を解釈できる', () => {
        const one = extractOption(
            ['--content-root', 'docs/posts', 'article-a'],
            '--content-root',
        );
        expect(one.value).toBe('docs/posts');
        expect(one.rest).toEqual(['article-a']);

        const two = extractOption(
            ['--content-root=posts2', 'article-b'],
            '--content-root',
        );
        expect(two.value).toBe('posts2');
        expect(two.rest).toEqual(['article-b']);
    });

    it('content root 優先順位は CLI > ENV > 設定ファイル > デフォルト', () => {
        writeFileSync(
            resolve(workDir, '.mdpub-wpblocks.json'),
            JSON.stringify({ contentRoot: 'from-config' }),
            'utf-8',
        );
        process.env.MDPUB_CONTENT_ROOT = 'from-env';

        const cli = resolveContentRoot({
            projectRoot: workDir,
            cliValue: 'from-cli',
        });
        expect(cli.value).toBe('from-cli');

        const env = resolveContentRoot({
            projectRoot: workDir,
            cliValue: undefined,
        });
        expect(env.value).toBe('from-env');

        delete process.env.MDPUB_CONTENT_ROOT;
        const config = resolveContentRoot({
            projectRoot: workDir,
            cliValue: undefined,
        });
        expect(config.value).toBe('from-config');

        rmSync(resolve(workDir, '.mdpub-wpblocks.json'));
        const fallback = resolveContentRoot({
            projectRoot: workDir,
            cliValue: undefined,
        });
        expect(fallback.value).toBe('posts');
    });

    it('slug 入力から記事ディレクトリ/MDパスを解決できる', () => {
        const contentRootAbsPath = resolve(workDir, 'posts');
        mkdirSync(contentRootAbsPath, { recursive: true });

        const dir = resolveArticleDirPath('article-a', { contentRootAbsPath });
        const md = resolveArticleMarkdownPath('article-a', {
            contentRootAbsPath,
        });

        expect(dir).toBe(resolve(contentRootAbsPath, 'article-a'));
        expect(md).toBe(resolve(contentRootAbsPath, 'article-a', 'index.md'));
    });
});
