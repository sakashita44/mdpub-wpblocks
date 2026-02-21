/**
 * frontmatter バリデーション
 *
 * 全フィールドを検証しエラー配列を返す。publish-utils の validateFrontmatter は
 * 最初のエラーで throw する設計のため、lint 用途では本モジュールを使用する。
 */

import { dirname, basename } from 'node:path';

export interface ValidationError {
    field: string;
    message: string;
}

/** frontmatter の全フィールドを検証し、エラー配列を返す（空配列 = 正常） */
export function validateFrontmatterAll(
    frontmatter: unknown,
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!frontmatter || typeof frontmatter !== 'object') {
        errors.push({
            field: 'frontmatter',
            message: 'frontmatter が不正です',
        });
        return errors;
    }

    const fm = frontmatter as Record<string, unknown>;

    if (!fm.title || typeof fm.title !== 'string') {
        errors.push({ field: 'title', message: 'title は必須の文字列です' });
    }

    if (!fm.slug || typeof fm.slug !== 'string') {
        errors.push({ field: 'slug', message: 'slug は必須の文字列です' });
    }

    if (!Array.isArray(fm.categories)) {
        errors.push({
            field: 'categories',
            message: 'categories は必須の文字列配列です',
        });
    } else if (fm.categories.length === 0) {
        errors.push({
            field: 'categories',
            message: 'categories は1件以上必要です',
        });
    } else if (
        fm.categories.some((c: unknown) => typeof c !== 'string' || !c)
    ) {
        errors.push({
            field: 'categories',
            message: 'categories の各要素は非空文字列で指定してください',
        });
    }

    if (
        fm.tags !== undefined &&
        (!Array.isArray(fm.tags) ||
            fm.tags.some((t: unknown) => typeof t !== 'string' || !t))
    ) {
        errors.push({
            field: 'tags',
            message: 'tags は文字列配列で指定してください',
        });
    }

    return errors;
}

/** slug とディレクトリ名の整合チェック */
export function validateSlugDirMatch(
    slug: string,
    mdPath: string,
): ValidationError | null {
    const dirName = basename(dirname(mdPath));
    if (dirName !== slug) {
        return {
            field: 'slug',
            message: `slug "${slug}" とディレクトリ名 "${dirName}" が一致しません`,
        };
    }
    return null;
}
