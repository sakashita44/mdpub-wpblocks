/**
 * 画像パス実在チェック
 *
 * 記事本文中の画像参照および frontmatter の featured_image が
 * 実際にファイルとして存在するかを検証する。
 */

import { statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { extractImagePaths } from './media-slug.js';
import type { ValidationError } from './validate-frontmatter.js';

/** パスが通常ファイルとして存在するか判定する */
function isFile(absPath: string): boolean {
    try {
        return statSync(absPath).isFile();
    } catch {
        return false;
    }
}

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
        if (!isFile(absPath)) {
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
    if (typeof featuredImage !== 'string' || featuredImage.trim() === '')
        return null;

    const articleDir = dirname(mdPath);
    const absPath = resolve(articleDir, featuredImage);
    if (!isFile(absPath)) {
        return {
            field: 'featured_image',
            message: `featured_image のファイルが見つかりません: ${featuredImage}`,
        };
    }

    return null;
}
