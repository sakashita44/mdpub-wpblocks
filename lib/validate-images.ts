/**
 * 画像パス実在チェック
 *
 * 記事本文中の画像参照および frontmatter の featured_image が
 * 実際にファイルとして存在するかを検証する。
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { extractImagePaths } from './media-slug.js';
import type { ValidationError } from './validate-frontmatter.js';

/** 記事本文中の画像パスが実在するか検証する */
export function validateImagePaths(
    markdownBody: string,
    mdPath: string,
): ValidationError[] {
    const articleDir = dirname(mdPath);
    const imagePaths = extractImagePaths(markdownBody);
    const errors: ValidationError[] = [];

    for (const imgPath of imagePaths) {
        // 外部 URL はスキップ
        if (/^https?:\/\//.test(imgPath)) continue;

        const absPath = resolve(articleDir, imgPath);
        if (!existsSync(absPath)) {
            errors.push({
                field: 'image',
                message: `画像ファイルが見つかりません: ${imgPath}`,
            });
        }
    }

    return errors;
}

/** frontmatter の featured_image が実在するか検証する */
export function validateFeaturedImage(
    frontmatter: Record<string, unknown>,
    mdPath: string,
): ValidationError | null {
    const featuredImage = frontmatter.featured_image;
    if (typeof featuredImage !== 'string') return null;

    const articleDir = dirname(mdPath);
    const absPath = resolve(articleDir, featuredImage);
    if (!existsSync(absPath)) {
        return {
            field: 'featured_image',
            message: `featured_image のファイルが見つかりません: ${featuredImage}`,
        };
    }

    return null;
}
