/**
 * CLI: E2E 統合実行（Issue #8）
 *
 * 使い方:
 *   node scripts/pipeline.mjs [--content-root <path>] [--force-upload] <article-slug|path>
 *
 * 実行順:
 *   1) convert（変換確認）
 *   2) upload-media（メディア同期）
 *   3) publish（投稿）
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { extractOption, resolveContentRoot } from '../lib/cli-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const args = process.argv.slice(2);
const forceUpload = args.includes('--force-upload');
const { value: cliContentRoot, rest } = extractOption(
    args.filter((a) => a !== '--force-upload'),
    '--content-root',
);
const articleInput = rest[0];

if (!articleInput) {
    console.error(
        '使い方: npm run pipeline -- [--content-root <path>] [--force-upload] <article-slug|path>',
    );
    process.exit(1);
}

const { value: contentRoot } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});
const commonArgs = ['--content-root', contentRoot];
const uploadInput = articleInput.endsWith('.md')
    ? dirname(articleInput)
    : articleInput;

try {
    runStep(
        'convert',
        ['scripts/convert.mjs', ...commonArgs, articleInput],
        false,
    );

    const uploadArgs = ['scripts/upload-media.mjs', ...commonArgs, uploadInput];
    if (forceUpload) {
        uploadArgs.push('--force-upload');
    }
    runStep('upload-media', uploadArgs, true);

    runStep(
        'publish',
        ['scripts/publish.mjs', ...commonArgs, articleInput],
        true,
    );

    console.log('\n✅ E2E 実行が完了しました');
    process.exit(0);
} catch (e) {
    console.error(`\n❌ pipeline に失敗しました: ${e.message}`);
    process.exit(1);
}

function runStep(label, scriptArgs, inheritOutput) {
    console.log(`\n▶ ${label} 実行中...`);
    const result = spawnSync(process.execPath, scriptArgs, {
        cwd: projectRoot,
        stdio: inheritOutput ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        env: process.env,
        encoding: 'utf-8',
    });

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
