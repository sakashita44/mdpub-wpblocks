import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    extractFlag,
    extractOption,
    resolveContentRoot,
    resolveArticleDirPath,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.js';

describe('cli-config', () => {
    let workDir: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        workDir = mkdtempSync(join(tmpdir(), 'mdpub-cli-config-'));
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        if (workDir) {
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

    it('extractOption は値欠落時にエラーを投げる', () => {
        expect(() =>
            extractOption(['--content-root'], '--content-root'),
        ).toThrow('--content-root に値が指定されていません');

        expect(() =>
            extractOption(
                ['--content-root', '--force-upload', 'article-a'],
                '--content-root',
            ),
        ).toThrow('--content-root に値が指定されていません');
    });

    it('extractOption は重複指定時に後勝ちで解釈する', () => {
        const parsed = extractOption(
            [
                '--content-root',
                'first-root',
                '--content-root=second-root',
                'article-a',
            ],
            '--content-root',
        );

        expect(parsed.value).toBe('second-root');
        expect(parsed.rest).toEqual(['article-a']);
    });

    it('extractFlag はフラグを抽出して残り引数を返す', () => {
        const parsed = extractFlag(
            ['--force-upload', '--content-root', 'posts2', 'article-a'],
            '--force-upload',
        );

        expect(parsed.enabled).toBe(true);
        expect(parsed.rest).toEqual(['--content-root', 'posts2', 'article-a']);
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

    it('ディレクトリパス入力から MD パスを解決できる', () => {
        const contentRootAbsPath = resolve(workDir, 'posts');
        const md = resolveArticleMarkdownPath('./posts/article-b', {
            contentRootAbsPath,
        });

        expect(md).toBe(resolve('./posts/article-b', 'index.md'));
    });

    it('content root に空文字が指定されたらエラーにする', () => {
        expect(() =>
            resolveContentRoot({
                projectRoot: workDir,
                cliValue: '',
            }),
        ).toThrow('CLI 引数 --content-root が空です');

        process.env.MDPUB_CONTENT_ROOT = '   ';
        expect(() =>
            resolveContentRoot({
                projectRoot: workDir,
                cliValue: undefined,
            }),
        ).toThrow('環境変数 MDPUB_CONTENT_ROOT が空です');

        delete process.env.MDPUB_CONTENT_ROOT;
        writeFileSync(
            resolve(workDir, '.mdpub-wpblocks.json'),
            JSON.stringify({ contentRoot: ' ' }),
            'utf-8',
        );
        expect(() =>
            resolveContentRoot({
                projectRoot: workDir,
                cliValue: undefined,
            }),
        ).toThrow('設定ファイル .mdpub-wpblocks.json が空です');
    });
});
