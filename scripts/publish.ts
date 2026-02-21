/**
 * CLI: 記事投稿（Issue #7）
 *
 * 使い方: node dist/scripts/publish.js [--content-root <path>] <article-slug|path-to-index-md>
 *
 * Frontmatter と Markdown 本文から Gutenberg ブロック HTML を生成し、
 * WordPress REST API に draft 投稿する。
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { parseMd } from '../lib/md-parser.js';
import { transformTokens } from '../lib/block-transforms/index.js';
import { loadPlugins } from '../lib/plugins/config.js';
import { serialize, cleanupWpEnv } from '../lib/wp-env.js';
import { createWpClient, getWpConfig } from '../lib/wp-client.js';
import { initEnv } from '../lib/env.js';
import { expectedSlug, extractImagePaths } from '../lib/media-slug.js';
import {
    validateFrontmatter,
    replaceLocalImagePaths,
    buildPostPayload,
} from '../lib/publish-utils.js';
import {
    extractOption,
    resolveContentRoot,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.js';
import { resolveProjectRoot } from '../lib/project-root.js';
import type {
    WpClient,
    WpClientConfig,
    WpTerm,
    Frontmatter,
} from '../lib/types.js';

const projectRoot = resolveProjectRoot(import.meta.url);

initEnv(resolve(projectRoot, '.env'));

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
        '使い方: npm run publish -- [--content-root <path>] <article-slug|path-to-index-md>',
    );
    process.exit(1);
}

const { absPath: contentRootAbsPath } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});
const absMdPath = resolveArticleMarkdownPath(articleInput, {
    contentRootAbsPath,
});
if (!existsSync(absMdPath)) {
    console.error(`エラー: ファイルが見つかりません: ${absMdPath}`);
    process.exit(1);
}

let config: WpClientConfig;
try {
    config = getWpConfig();
} catch (e) {
    console.error((e as Error).message);
    process.exit(1);
}

const markdownString = readFileSync(absMdPath, 'utf-8');
const { data: frontmatter, content: body } = matter(markdownString);

try {
    validateFrontmatter(frontmatter);

    const articleSlug: string = frontmatter.slug;
    const wp = createWpClient(config);

    const plugins = loadPlugins(projectRoot);

    const { tokens } = parseMd(body);
    const { blocks } = transformTokens(tokens, plugins);
    const rawHtml = serialize(blocks);

    const resolvedImageMap = await resolveImageUrlMap(wp, body, articleSlug);
    const contentHtml = replaceLocalImagePaths(rawHtml, resolvedImageMap);

    const [categories, tags, featuredMediaId] = await Promise.all([
        resolveCategoryIds(wp, frontmatter.categories),
        resolveTagIds(wp, frontmatter.tags || []),
        frontmatter.featured_image
            ? resolveFeaturedMediaId(
                  wp,
                  frontmatter.featured_image,
                  articleSlug,
              )
            : Promise.resolve(undefined),
    ]);

    const payload = buildPostPayload(frontmatter as Frontmatter, {
        categories,
        tags,
        contentHtml,
        featuredMediaId,
    });

    const existingPost = await wp.findPostBySlug(articleSlug);
    if (existingPost) {
        const updated = await wp.updatePost(existingPost.id, payload);
        console.log(
            `✅ 投稿を更新しました: id=${updated.id}, slug=${updated.slug}`,
        );
    } else {
        const created = await wp.createPost(payload);
        console.log(
            `✅ 投稿を作成しました: id=${created.id}, slug=${created.slug}`,
        );
    }

    cleanupWpEnv();
} catch (e) {
    console.error(`❌ 投稿処理に失敗しました: ${(e as Error).message}`);
    process.exit(1);
}

async function resolveCategoryIds(
    wp: WpClient,
    categorySlugs: string[],
): Promise<number[]> {
    const categories = await Promise.all(
        categorySlugs.map((slug) => wp.findCategoryBySlug(slug)),
    );

    categories.forEach((category, index) => {
        if (!category) {
            throw new Error(
                `カテゴリが見つかりません: ${categorySlugs[index]}`,
            );
        }
    });

    return categories.filter((c): c is WpTerm => c !== null).map((c) => c.id);
}

async function resolveTagIds(
    wp: WpClient,
    tagSlugs: string[],
): Promise<number[]> {
    const tags = await Promise.all(
        tagSlugs.map((slug) => wp.findTagBySlug(slug)),
    );

    tags.forEach((tag, index) => {
        if (!tag) {
            throw new Error(`タグが見つかりません: ${tagSlugs[index]}`);
        }
    });

    return tags.filter((t): t is WpTerm => t !== null).map((t) => t.id);
}

async function resolveFeaturedMediaId(
    wp: WpClient,
    featuredImagePath: string,
    articleSlug: string,
): Promise<number> {
    const slug = expectedSlug(featuredImagePath, articleSlug);
    const media = await wp.findMediaBySlug(slug);
    if (!media) {
        throw new Error(
            `featured_image のメディアが見つかりません: path=${featuredImagePath}, slug=${slug}`,
        );
    }
    return media.id;
}

async function resolveImageUrlMap(
    wp: WpClient,
    markdownBody: string,
    articleSlug: string,
): Promise<Map<string, string>> {
    const imagePaths = extractImagePaths(markdownBody);
    const map = new Map<string, string>();

    for (const imagePath of imagePaths) {
        const slug = expectedSlug(imagePath, articleSlug);
        const media = await wp.findMediaBySlug(slug);
        if (!media || !media.source_url) {
            throw new Error(
                `本文画像のメディア URL が取得できません: path=${imagePath}, slug=${slug}`,
            );
        }
        map.set(imagePath, media.source_url);
    }

    return map;
}
