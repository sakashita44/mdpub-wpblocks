/**
 * CLI: E2E 統合実行（Issue #8）
 *
 * 使い方:
 *   node dist/scripts/pipeline.js [--content-root <path>] [--force-upload] <article-slug|path>
 *
 * 実行順:
 *   1) convert（変換確認）
 *   2) upload-media（メディア同期）
 *   3) publish（投稿）
 */

import { dirname } from 'node:path';
import type { SpawnSyncReturns } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import {
    extractFlag,
    extractOption,
    resolveContentRoot,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.js';
import { resolveProjectRoot } from '../lib/project-root.js';

const projectRoot: string = resolveProjectRoot(import.meta.url);

const args: string[] = process.argv.slice(2);
const { enabled: forceUpload, rest: argsWithoutForceUpload } = extractFlag(
    args,
    '--force-upload',
);
let cliContentRoot: string | undefined;
let rest: string[];
try {
    ({ value: cliContentRoot, rest } = extractOption(
        argsWithoutForceUpload,
        '--content-root',
    ));
} catch (e) {
    console.error(`引数エラー: ${(e as Error).message}`);
    process.exit(1);
}
const articleInput: string | undefined = rest[0];

if (!articleInput) {
    console.error(
        '使い方: npm run pipeline -- [--content-root <path>] [--force-upload] <article-slug|path>',
    );
    process.exit(1);
}

const { value: contentRoot, absPath: contentRootAbsPath } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});
const commonArgs: string[] = ['--content-root', contentRoot];
const markdownInput: string = articleInput.endsWith('.md')
    ? resolveArticleMarkdownPath(articleInput, { contentRootAbsPath })
    : articleInput;
const uploadInput: string = articleInput.endsWith('.md')
    ? dirname(markdownInput)
    : articleInput;

try {
    runStep(
        'convert',
        ['dist/scripts/convert.js', ...commonArgs, markdownInput],
        false,
    );

    const uploadArgs: string[] = [
        'dist/scripts/upload-media.js',
        ...commonArgs,
        uploadInput,
    ];
    if (forceUpload) {
        uploadArgs.push('--force-upload');
    }
    runStep('upload-media', uploadArgs, true);

    runStep(
        'publish',
        ['dist/scripts/publish.js', ...commonArgs, markdownInput],
        true,
    );

    console.log('\n✅ E2E 実行が完了しました');
    process.exit(0);
} catch (e) {
    console.error(`\n❌ pipeline に失敗しました: ${(e as Error).message}`);
    process.exit(1);
}

function runStep(
    label: string,
    scriptArgs: string[],
    inheritOutput: boolean,
): void {
    console.log(`\n▶ ${label} 実行中...`);
    const result: SpawnSyncReturns<string> = spawnSync(
        process.execPath,
        scriptArgs,
        {
            cwd: projectRoot,
            // convert 成功時はブロックHTMLが大量出力されるため抑制し、失敗時のみ表示する。
            stdio: inheritOutput ? 'inherit' : ['ignore', 'pipe', 'pipe'],
            env: process.env,
            encoding: 'utf-8',
        },
    );

    if (result.status !== 0) {
        if (!inheritOutput) {
            if (result.stdout) {
                process.stdout.write(result.stdout);
            }
            if (result.stderr) {
                process.stderr.write(result.stderr);
            }
        }
        throw new Error(`${label} に失敗しました（exit=${result.status}）`);
    }
}
