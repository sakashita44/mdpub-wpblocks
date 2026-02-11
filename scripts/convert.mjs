/**
 * CLI: Markdown → Gutenberg ブロック HTML 変換
 *
 * 使い方: node scripts/convert.mjs <path-to-md>
 * ブロック HTML を stdout に出力する。
 */

import { readFileSync } from 'node:fs';
import { serialize } from '../lib/wp-env.mjs';
import { parseMd } from '../lib/md-parser.mjs';
import { transformTokens } from '../lib/block-transforms/index.mjs';

const mdPath = process.argv[2];
if (!mdPath) {
    console.error('使い方: npm run convert -- <path-to-md>');
    process.exit(1);
}

const markdownString = readFileSync(mdPath, 'utf-8');
const { tokens } = parseMd(markdownString);
const blocks = transformTokens(tokens);
const html = serialize(blocks);

console.log(html);
// happy-dom の Window がイベントループを維持するため明示的に終了
process.exit(0);
