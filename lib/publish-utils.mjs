/**
 * Issue #7: 記事投稿ユーティリティ
 */

/**
 * frontmatter の必須項目を検証する
 *
 * @param {any} frontmatter
 */
export function validateFrontmatter(frontmatter) {
    if (!frontmatter || typeof frontmatter !== 'object') {
        throw new Error('frontmatter が不正です');
    }

    if (!frontmatter.title || typeof frontmatter.title !== 'string') {
        throw new Error('frontmatter.title は必須です');
    }

    if (!frontmatter.slug || typeof frontmatter.slug !== 'string') {
        throw new Error('frontmatter.slug は必須です');
    }

    if (
        !Array.isArray(frontmatter.categories) ||
        frontmatter.categories.length === 0 ||
        frontmatter.categories.some((c) => typeof c !== 'string' || !c)
    ) {
        throw new Error(
            'frontmatter.categories は1件以上の文字列配列で必須です',
        );
    }

    if (
        frontmatter.tags !== undefined &&
        (!Array.isArray(frontmatter.tags) ||
            frontmatter.tags.some((t) => typeof t !== 'string' || !t))
    ) {
        throw new Error('frontmatter.tags は文字列配列で指定してください');
    }
}

/**
 * ブロック HTML 内のローカル画像パスをメディア URL に置換する
 *
 * @param {string} html
 * @param {Map<string, string>} imageUrlMap
 * @returns {string}
 */
export function replaceLocalImagePaths(html, imageUrlMap) {
    let replaced = html;
    for (const [localPath, mediaUrl] of imageUrlMap.entries()) {
        replaced = replaced.split(localPath).join(mediaUrl);
    }
    return replaced;
}

/**
 * 投稿 API 用 payload を組み立てる
 *
 * @param {object} frontmatter
 * @param {{ categories: number[], tags: number[], contentHtml: string, featuredMediaId?: number }} resolved
 * @returns {object}
 */
export function buildPostPayload(frontmatter, resolved) {
    const payload = {
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
