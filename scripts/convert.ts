/**
 * CLI: Markdown → Gutenberg ブロック HTML 変換
 *
 * 使い方: node dist/scripts/convert.js [--content-root <path>] <article-slug|path-to-md>
 * ブロック HTML を stdout に出力する。
 */

import { readFileSync, existsSync } from 'node:fs';
import { serialize, cleanupWpEnv } from '../lib/wp-env.js';
import { parseMd } from '../lib/md-parser.js';
import { transformTokens } from '../lib/block-transforms/index.js';
import {
    extractOption,
    resolveContentRoot,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.js';
import { resolveProjectRoot } from '../lib/project-root.js';
import { loadPlugins } from '../lib/plugins/config.js';

const projectRoot = resolveProjectRoot(import.meta.url);

let cliContentRoot: string | undefined;
let rest: string[];
try {
    ({ value: cliContentRoot, rest } = extractOption(
        process.argv.slice(2),
        '--content-root',
    ));
} catch (e) {
    console.error(`引数エラー: ${(e as Error).message}`);
    process.exit(1);
}
const articleInput: string | undefined = rest[0];

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

const mdPath = resolveArticleMarkdownPath(articleInput, {
    contentRootAbsPath,
});

if (!existsSync(mdPath)) {
    console.error(`エラー: ファイルが見つかりません: ${mdPath}`);
    process.exit(1);
}

const plugins = loadPlugins(projectRoot);

const markdownString = readFileSync(mdPath, 'utf-8');
const { tokens } = parseMd(markdownString);
const { blocks } = transformTokens(tokens, plugins);
const html = serialize(blocks);

console.log(html);
cleanupWpEnv();
