/**
 * CLI: 記事投稿（Issue #7）
 *
 * 使い方: node scripts/publish.mjs [--content-root <path>] <article-slug|path-to-index-md>
 *
 * Frontmatter と Markdown 本文から Gutenberg ブロック HTML を生成し、
 * WordPress REST API に draft 投稿する。
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { parseMd } from '../lib/md-parser.mjs';
import { transformTokens } from '../lib/block-transforms/index.mjs';
import { serialize } from '../lib/wp-env.mjs';
import { createWpClient, loadEnv, getWpConfig } from '../lib/wp-client.mjs';
import { expectedSlug, extractImagePaths } from '../lib/media-slug.mjs';
import {
    validateFrontmatter,
    replaceLocalImagePaths,
    buildPostPayload,
} from '../lib/publish-utils.mjs';
import {
    extractOption,
    resolveContentRoot,
    resolveArticleMarkdownPath,
} from '../lib/cli-config.mjs';
import { resolveProjectRoot } from '../lib/project-root.mjs';

const projectRoot = resolveProjectRoot(import.meta.url);

loadEnv(resolve(projectRoot, '.env'));

let cliContentRoot;
let rest;
try {
    ({ value: cliContentRoot, rest } = extractOption(
        process.argv.slice(2),
        '--content-root',
    ));
} catch (e) {
    console.error(`引数エラー: ${e.message}`);
    process.exit(1);
}
const articleInput = rest[0];

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

let config;
try {
    config = getWpConfig();
} catch (e) {
    console.error(e.message);
    process.exit(1);
}

const markdownString = readFileSync(absMdPath, 'utf-8');
const { data: frontmatter, content: body } = matter(markdownString);

try {
    validateFrontmatter(frontmatter);

    const articleSlug = frontmatter.slug;
    const wp = createWpClient(config);

    const { tokens } = parseMd(body);
    const blocks = transformTokens(tokens);
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

    const payload = buildPostPayload(frontmatter, {
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

    process.exit(0);
} catch (e) {
    console.error(`❌ 投稿処理に失敗しました: ${e.message}`);
    process.exit(1);
}

async function resolveCategoryIds(wp, categorySlugs) {
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

    return categories.map((category) => category.id);
}

async function resolveTagIds(wp, tagSlugs) {
    const tags = await Promise.all(
        tagSlugs.map((slug) => wp.findTagBySlug(slug)),
    );

    tags.forEach((tag, index) => {
        if (!tag) {
            throw new Error(`タグが見つかりません: ${tagSlugs[index]}`);
        }
    });

    return tags.map((tag) => tag.id);
}

async function resolveFeaturedMediaId(wp, featuredImagePath, articleSlug) {
    const slug = expectedSlug(featuredImagePath, articleSlug);
    const media = await wp.findMediaBySlug(slug);
    if (!media) {
        throw new Error(
            `featured_image のメディアが見つかりません: path=${featuredImagePath}, slug=${slug}`,
        );
    }
    return media.id;
}

async function resolveImageUrlMap(wp, markdownBody, articleSlug) {
    const imagePaths = extractImagePaths(markdownBody);
    const map = new Map();

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
