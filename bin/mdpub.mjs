#!/usr/bin/env node

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { resolveProjectRoot } from '../lib/project-root.mjs';

const projectRoot = resolveProjectRoot(import.meta.url);

const subcommands = new Map([
    ['convert', 'scripts/convert.mjs'],
    ['upload-media', 'scripts/upload-media.mjs'],
    ['publish', 'scripts/publish.mjs'],
    ['pipeline', 'scripts/pipeline.mjs'],
    ['sync', 'scripts/sync.mjs'],
]);

const [command, ...args] = process.argv.slice(2);

if (
    !command ||
    command === '--help' ||
    command === '-h' ||
    command === 'help'
) {
    printHelp();
    process.exit(0);
}

if (command === '--version' || command === '-v' || command === 'version') {
    printVersion();
    process.exit(0);
}

if (command === 'init') {
    runInit(process.cwd());
    process.exit(0);
}

const scriptPath = subcommands.get(command);
if (!scriptPath) {
    console.error(`不明なサブコマンドです: ${command}`);
    console.error('');
    printHelp(process.stderr);
    process.exit(1);
}

const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
});

process.exit(result.status ?? 1);

function runInit(rootDir) {
    const envExamplePath = resolve(rootDir, '.env.example');
    const configPath = resolve(rootDir, '.mdpub-wpblocks.json');

    const created = [];
    const skipped = [];

    if (existsSync(envExamplePath)) {
        skipped.push('.env.example');
    } else {
        writeFileSync(envExamplePath, getEnvExampleTemplate(), 'utf-8');
        created.push('.env.example');
    }

    if (existsSync(configPath)) {
        skipped.push('.mdpub-wpblocks.json');
    } else {
        writeFileSync(configPath, getConfigTemplate(), 'utf-8');
        created.push('.mdpub-wpblocks.json');
    }

    if (created.length > 0) {
        console.log(`✅ 生成: ${created.join(', ')}`);
    }
    if (skipped.length > 0) {
        console.log(`⏭ 既存のためスキップ: ${skipped.join(', ')}`);
    }

    if (created.length > 0) {
        console.log(
            '次の手順: .env.example を参考に .env を作成し、WordPress 接続情報を設定してください。',
        );
    }
}

function getEnvExampleTemplate() {
    return [
        '# WordPress site URL (no trailing slash recommended)',
        'WP_URL=https://example.com',
        '',
        '# WordPress login username',
        'WP_USER=your-username',
        '',
        '# Application Password generated in WP profile',
        'WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx-xxxx-xxxx',
        '',
        '# Optional: content root directory',
        'MDPUB_CONTENT_ROOT=posts',
        '',
    ].join('\n');
}

function getConfigTemplate() {
    return (
        JSON.stringify(
            {
                contentRoot: 'posts',
            },
            null,
            4,
        ) + '\n'
    );
}

function printVersion() {
    try {
        const pkg = JSON.parse(
            readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'),
        );
        console.log(pkg.version);
    } catch {
        console.log('0.0.0');
    }
}

function printHelp(stream = process.stdout) {
    const text = [
        'mdpub - Markdown to WordPress CLI',
        '',
        '使い方:',
        '  mdpub <subcommand> [options]',
        '',
        'サブコマンド:',
        '  init          .env.example / .mdpub-wpblocks.json の雛形を生成',
        '  convert       Markdown を Gutenberg ブロック HTML に変換',
        '  upload-media  記事画像を WordPress へアップロード',
        '  publish       記事を WordPress に draft 投稿',
        '  pipeline      convert → upload-media → publish を実行',
        '  sync          サーバ状態から .registry.yaml を再生成',
        '',
        'オプション:',
        '  -h, --help     ヘルプ表示',
        '  -v, --version  バージョン表示',
    ].join('\n');
    stream.write(text + '\n');
}
