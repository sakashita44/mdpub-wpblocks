/**
 * CLI: Markdown → Gutenberg ブロック HTML 変換
 *
 * 使い方: node scripts/convert.mjs <path-to-md>
 * ブロック HTML を stdout に出力する。
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize } from '../lib/wp-env.mjs';
import { parseMd } from '../lib/md-parser.mjs';
import { transformTokens } from '../lib/block-transforms/index.mjs';
import {
    extractOption,
    resolveContentRoot,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const { value: cliContentRoot, rest } = extractOption(
    process.argv.slice(2),
    '--content-root',
);
const articleInput = rest[0];

if (!articleInput) {
    console.error(
        '使い方: npm run convert -- [--content-root <path>] <article-slug|path-to-md>',
    );
    process.exit(1);
}

const { absPath: contentRootAbsPath } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});

const mdPath = resolveArticleMarkdownPath(articleInput, { contentRootAbsPath });

if (!existsSync(mdPath)) {
    console.error(`エラー: ファイルが見つかりません: ${mdPath}`);
    process.exit(1);
}

const markdownString = readFileSync(mdPath, 'utf-8');
const { tokens } = parseMd(markdownString);
const blocks = transformTokens(tokens);
const html = serialize(blocks);

console.log(html);
// happy-dom の Window がイベントループを維持するため明示的に終了
process.exit(0);
