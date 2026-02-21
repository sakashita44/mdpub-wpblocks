/**
 * CLI: frontmatter バリデーション
 *
 * 使い方: node dist/scripts/validate-content.js [--content-root <path>] <glob>
 * 指定 glob にマッチする Markdown ファイルの frontmatter を検証し、違反があれば報告する。
 */

import { readFileSync, globSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMd } from '../lib/md-parser.js';
import {
    validateFrontmatterAll,
    validateSlugDirMatch,
} from '../lib/validate-frontmatter.js';
import { extractOption, resolveContentRoot } from '../lib/cli-config.js';
import { resolveProjectRoot } from '../lib/project-root.js';

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

const globPattern = rest[0];

if (!globPattern) {
    console.error(
        '使い方: npm run validate-content -- [--content-root <dir>] <glob>',
    );
    console.error('例: npm run validate-content -- "posts/*/index.md"');
    process.exit(1);
}

const { absPath: contentRootAbsPath } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});

// glob 展開（content root 起点の相対パターンと絶対パスの両方に対応）
const resolvedPattern = resolve(contentRootAbsPath, globPattern);
const files = globSync(resolvedPattern, { withFileTypes: false }) as string[];

if (files.length === 0) {
    console.error(
        `パターンにマッチするファイルがありません: ${resolvedPattern}`,
    );
    process.exit(1);
}

let hasErrors = false;

for (const filePath of files) {
    const mdPath = resolve(filePath);
    const content = readFileSync(mdPath, 'utf-8');
    const { frontmatter } = parseMd(content);

    const errors = validateFrontmatterAll(frontmatter);

    // slug が取得できた場合のみディレクトリ名との整合チェック
    if (
        frontmatter &&
        typeof frontmatter === 'object' &&
        typeof (frontmatter as Record<string, unknown>).slug === 'string'
    ) {
        const slugError = validateSlugDirMatch(
            (frontmatter as Record<string, unknown>).slug as string,
            mdPath,
        );
        if (slugError) {
            errors.push(slugError);
        }
    }

    if (errors.length > 0) {
        hasErrors = true;
        console.error(`\n❌ ${mdPath}`);
        for (const err of errors) {
            console.error(`  - [${err.field}] ${err.message}`);
        }
    } else {
        console.log(`✅ ${mdPath}`);
    }
}

if (hasErrors) {
    console.error('\nfrontmatter バリデーションに失敗しました');
    process.exit(1);
}

console.log('\n全ファイルの frontmatter バリデーションに成功しました');
