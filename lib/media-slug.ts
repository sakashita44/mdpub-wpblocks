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
 *   - 英数字・ハイフン・アンダースコア以外をハイフンに置換
 *   - 連続ハイフンを圧縮
 *   - 先頭・末尾ハイフンを除去
 */
function slugify(name: string): string {
    const withoutExt = name.replace(/\.[^.]+$/, '');
    return withoutExt
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '');
}

/** アップロード用ファイル名を算出する */
export function uploadFilename(imagePath: string, articleSlug: string): string {
    const normalized = imagePath.replace(/\\/g, '/');
    const file = posix.basename(normalized);
    const dir = posix.dirname(normalized);

    // 共有リソース判定: パスに `shared` ディレクトリが含まれる
    const isShared = dir.split('/').includes('shared');

    const prefix = isShared ? 'shared' : articleSlug;
    const sanitized = sanitizeFilename(`${prefix}-${file}`);
    return sanitized;
}

/** ファイル名を WordPress 互換に正規化する（拡張子は保持し、ベース部分のみサニタイズ） */
function sanitizeFilename(filename: string): string {
    const extMatch = filename.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';
    const base = extMatch ? filename.slice(0, -ext.length) : filename;
    const sanitized = base
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '');
    return sanitized + ext;
}

/** ローカル画像パスから WP メディア slug を算出する */
export function expectedSlug(imagePath: string, articleSlug: string): string {
    const filename = uploadFilename(imagePath, articleSlug);
    const slug = slugify(filename);
    if (!slug) {
        throw new Error(
            `メディア slug を算出できません: imagePath="${imagePath}" articleSlug="${articleSlug}"`,
        );
    }
    // slug がプレフィックスのみ（= ファイル名部分の ASCII 文字がゼロ）の場合はエラー
    const prefix = imagePath.includes('shared') ? 'shared' : articleSlug;
    if (slug === prefix) {
        throw new Error(
            `メディア slug がプレフィックスと同一です（ファイル名に ASCII 文字を含めてください）: imagePath="${imagePath}" slug="${slug}"`,
        );
    }
    return slug;
}

/** Markdown ファイルの本文から画像パスを抽出する */
export function extractImagePaths(markdownBody: string): string[] {
    // パターン1: ![alt](<path with spaces>) — angle-bracket 記法
    // パターン2: ![alt](path "title") — 通常記法（パスにスペース不可）
    const angleBracket = /!\[([^\]]*)\]\(<([^>]+)>\s*(?:"[^"]*")?\)/g;
    const normal = /!\[([^\]]*)\]\(([^)<>\s]+)(?:\s+"[^"]*")?\)/g;
    const paths: string[] = [];
    let match;
    while ((match = angleBracket.exec(markdownBody)) !== null) {
        paths.push(match[2]);
    }
    while ((match = normal.exec(markdownBody)) !== null) {
        // %20 等の URL エンコードをデコード
        paths.push(decodeURIComponent(match[2]));
    }
    return [...new Set(paths)];
}

/** ローカル相対パスを記事ディレクトリ基準で絶対パスに解決する */
export function resolveImagePath(
    imagePath: string,
    articleDir: string,
): string {
    return resolve(articleDir, imagePath);
}
