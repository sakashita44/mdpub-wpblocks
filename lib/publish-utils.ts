/**
 * 記事投稿ユーティリティ
 */

import type { Frontmatter } from './types.js';
import { validateFrontmatterAll } from './validate-frontmatter.js';

/** frontmatter の必須項目を検証する（最初のエラーで throw） */
export function validateFrontmatter(
    frontmatter: unknown,
): asserts frontmatter is Frontmatter {
    const errors = validateFrontmatterAll(frontmatter);
    if (errors.length > 0) {
        throw new Error(errors[0].message);
    }
}

/** ブロック HTML 内のローカル画像パスをメディア URL に置換する */
export function replaceLocalImagePaths(
    html: string,
    imageUrlMap: Map<string, string>,
): string {
    let replaced = html;
    for (const [localPath, mediaUrl] of imageUrlMap.entries()) {
        // 生パスと URL エンコード版の両方で置換を試みる
        // serialize() がスペースや非 ASCII 文字を %XX にエンコードするため
        const variants = [localPath, encodeURI(localPath)];
        for (const variant of [...new Set(variants)]) {
            const escapedPath = escapeRegExp(variant);
            const attrRegex = new RegExp(
                `(src|href)=("|')${escapedPath}\\2`,
                'g',
            );
            replaced = replaced.replace(attrRegex, `$1=$2${mediaUrl}$2`);
        }
    }
    return replaced;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface ResolvedPayload {
    categories: number[];
    tags: number[];
    contentHtml: string;
    featuredMediaId?: number;
}

/** 投稿 API 用 payload を組み立てる */
export function buildPostPayload(
    frontmatter: Frontmatter,
    resolved: ResolvedPayload,
): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        title: frontmatter.title,
        slug: frontmatter.slug,
        categories: resolved.categories,
        tags: resolved.tags,
        content: resolved.contentHtml,
        status: 'draft',
    };

    if (frontmatter.excerpt) {
        payload.excerpt = frontmatter.excerpt;
    }

    if (frontmatter.date) {
        payload.date = frontmatter.date;
    }

    if (resolved.featuredMediaId !== undefined) {
        payload.featured_media = resolved.featuredMediaId;
    }

    return payload;
}
