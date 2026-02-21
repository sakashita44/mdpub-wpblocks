#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { resolveProjectRoot } from '../lib/project-root.js';

const projectRoot = resolveProjectRoot(import.meta.url);

const subcommands = new Map<string, string>([
    ['convert', 'dist/scripts/convert.js'],
    ['upload-media', 'dist/scripts/upload-media.js'],
    ['publish', 'dist/scripts/publish.js'],
    ['pipeline', 'dist/scripts/pipeline.js'],
    ['sync', 'dist/scripts/sync.js'],
    ['validate-content', 'dist/scripts/validate-content.js'],
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

const result = spawnSync(
    process.execPath,
    [resolve(projectRoot, scriptPath), ...args],
    {
        cwd: projectRoot,
        stdio: 'inherit',
        env: process.env,
    },
);

process.exit(result.status ?? 1);

function runInit(rootDir: string): void {
    const envExamplePath = resolve(rootDir, '.env.example');

    if (existsSync(envExamplePath)) {
        console.log('⏭ 既存のためスキップ: .env.example');
    } else {
        writeFileSync(envExamplePath, getEnvExampleTemplate(), 'utf-8');
        console.log('✅ 生成: .env.example');
        console.log(
            '次の手順: .env.example を参考に .env を作成し、WordPress 接続情報を設定してください。',
        );
    }
}

function getEnvExampleTemplate(): string {
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

function printVersion(): void {
    try {
        const pkg: { version: string } = JSON.parse(
            readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'),
        );
        console.log(pkg.version);
    } catch {
        console.log('0.0.0');
    }
}

function printHelp(stream: NodeJS.WritableStream = process.stdout): void {
    const text = [
        'mdpub - Markdown to WordPress CLI',
        '',
        '使い方:',
        '  mdpub <subcommand> [options]',
        '',
        'サブコマンド:',
        '  init              .env.example の雛形を生成',
        '  convert           Markdown を Gutenberg ブロック HTML に変換',
        '  upload-media      記事画像を WordPress へアップロード',
        '  publish           記事を WordPress に draft 投稿',
        '  pipeline          sync → convert → upload-media → publish を実行',
        '  sync              WP プラグイン情報を .mdpub-cache.json に同期',
        '  validate-content  コンテンツバリデーション（frontmatter・画像・トークン）',
        '',
        'オプション:',
        '  -h, --help     ヘルプ表示',
        '  -v, --version  バージョン表示',
    ].join('\n');
    stream.write(text + '\n');
}
