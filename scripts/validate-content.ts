/**
 * CLI: コンテンツバリデーション
 *
 * 使い方: node dist/scripts/validate-content.js [--content-root <path>] [--strict] <glob>
 * 指定 glob にマッチする Markdown ファイルの frontmatter・画像パス・トークンを検証し、違反があれば報告する。
 */

import { readFileSync, globSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMd } from '../lib/md-parser.js';
import {
    validateFrontmatterAll,
    validateSlugDirMatch,
} from '../lib/validate-frontmatter.js';
import {
    validateImagePaths,
    validateFeaturedImage,
} from '../lib/validate-images.js';
import { collectUnsupportedTokens } from '../lib/validate-tokens.js';
import {
    extractOption,
    extractFlag,
    resolveContentRoot,
} from '../lib/cli-config.js';
import { resolveProjectRoot } from '../lib/project-root.js';
import type { ValidationError } from '../lib/validate-frontmatter.js';

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

const flagResult = extractFlag(rest, '--strict');
const strict = flagResult.enabled;
rest = flagResult.rest;

const globPattern = rest[0];

if (!globPattern) {
    console.error(
        '使い方: npm run validate-content -- [--content-root <dir>] [--strict] <glob>',
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
const files = globSync(resolvedPattern);

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
    const { frontmatter, tokens, body } = parseMd(content);

    const errors: ValidationError[] = validateFrontmatterAll(frontmatter);

    // slug バリデーション通過時のみディレクトリ名との整合チェック
    const fm = frontmatter as Record<string, unknown> | null;
    if (fm && typeof fm.slug === 'string') {
        const slugError = validateSlugDirMatch(fm.slug, mdPath);
        if (slugError) {
            errors.push(slugError);
        }
    }

    // 画像パス実在チェック（frontmatter を除いた本文のみ対象）
    errors.push(...validateImagePaths(body, mdPath));
    if (fm) {
        const featuredError = validateFeaturedImage(fm, mdPath);
        if (featuredError) {
            errors.push(featuredError);
        }
    }

    // 未対応トークン検出
    const tokenWarnings = collectUnsupportedTokens(tokens);
    const tokenValidationItems: ValidationError[] = tokenWarnings.map((w) => {
        const label =
            w.type === 'unsupported_inline_token'
                ? '未対応インライントークン'
                : '未対応トークン';
        return {
            field: 'token',
            message: `${label}: ${w.tokenType}${w.line != null ? `（行 ${w.line + 1}）` : ''}`,
        };
    });

    if (errors.length > 0) {
        hasErrors = true;
        console.error(`\n❌ ${mdPath}`);
        for (const err of errors) {
            console.error(`  - [${err.field}] ${err.message}`);
        }
    }

    if (tokenValidationItems.length > 0) {
        if (strict) {
            hasErrors = true;
            if (errors.length === 0) {
                console.error(`\n❌ ${mdPath}`);
            }
            for (const item of tokenValidationItems) {
                console.error(`  - [${item.field}] ${item.message}`);
            }
        } else {
            if (errors.length === 0) {
                console.log(`✅ ${mdPath}`);
            }
            for (const item of tokenValidationItems) {
                console.warn(`  ⚠ [${item.field}] ${item.message}`);
            }
        }
    } else if (errors.length === 0) {
        console.log(`✅ ${mdPath}`);
    }
}

if (hasErrors) {
    console.error('\nコンテンツバリデーションに失敗しました');
    process.exit(1);
}

console.log('\n全ファイルのコンテンツバリデーションに成功しました');
