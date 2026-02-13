/**
 * ローカル画像パス → WordPress メディア slug 算出
 *
 * 命名規則:
 *   - 記事固有画像: `<article-slug>-<filename>`（拡張子なし）
 *   - 共有画像:     `shared-<filename>`（拡張子なし）
 *
 * WP の slug sanitize に合わせ、小文字化・記号→ハイフン変換を適用する。
 * 純粋関数のみ。副作用なし。
 */

import { resolve, posix } from 'node:path';

/**
 * ファイル名から拡張子を除去し slug 化
 * WP の sanitize_title 互換:
 *   - 小文字化
 *   - 英数字・ハイフン以外をハイフンに置換
 *   - 連続ハイフンを圧縮
 *   - 先頭・末尾ハイフンを除去
 * @param {string} name ファイル名（拡張子あり）
 * @returns {string} slug 化した名前（拡張子なし）
 */
function slugify(name) {
    const withoutExt = name.replace(/\.[^.]+$/, '');
    return withoutExt
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * アップロード用ファイル名を算出する
 *
 * @param {string} imagePath - MD から参照されるローカル相対パス（例: `images/photo.jpg`）
 * @param {string} articleSlug - 記事の slug（frontmatter の `slug` フィールド）
 * @returns {string} アップロード時のファイル名（例: `article-a-photo.jpg`）
 */
export function uploadFilename(imagePath, articleSlug) {
    const normalized = imagePath.replace(/\\/g, '/');
    const file = posix.basename(normalized);
    const dir = posix.dirname(normalized);

    // 共有リソース判定: パスに `shared` ディレクトリが含まれる
    const isShared = dir.split('/').includes('shared');

    const prefix = isShared ? 'shared' : articleSlug;
    return `${prefix}-${file}`;
}

/**
 * ローカル画像パスから WP メディア slug を算出する
 *
 * @param {string} imagePath - MD から参照されるローカル相対パス
 * @param {string} articleSlug - 記事の slug
 * @returns {string} 期待される WP メディア slug
 */
export function expectedSlug(imagePath, articleSlug) {
    const filename = uploadFilename(imagePath, articleSlug);
    const slug = slugify(filename);
    if (!slug) {
        throw new Error(
            `メディア slug を算出できません: imagePath="${imagePath}" articleSlug="${articleSlug}"`,
        );
    }
    return slug;
}

/**
 * Markdown ファイルの本文から画像パスを抽出する
 *
 * @param {string} markdownBody - frontmatter を除いた Markdown 本文
 * @returns {string[]} 画像パスの配列
 */
export function extractImagePaths(markdownBody) {
    const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    const paths = [];
    let match;
    while ((match = imageRegex.exec(markdownBody)) !== null) {
        paths.push(match[2]);
    }
    return [...new Set(paths)];
}

/**
 * ローカル相対パスを記事ディレクトリ基準で絶対パスに解決する
 *
 * @param {string} imagePath - MD 内の相対パス（例: `images/photo.jpg`, `../shared/logo.png`）
 * @param {string} articleDir - 記事ディレクトリの絶対パス（例: `/path/to/posts/article-a`）
 * @returns {string} 絶対パス
 */
export function resolveImagePath(imagePath, articleDir) {
    return resolve(articleDir, imagePath);
}
