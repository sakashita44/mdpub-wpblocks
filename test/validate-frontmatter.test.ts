/**
 * validate-frontmatter のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
    validateFrontmatterAll,
    validateSlugDirMatch,
} from '../lib/validate-frontmatter.js';

describe('validateFrontmatterAll', () => {
    it('全フィールド正常なら空配列を返す', () => {
        const errors = validateFrontmatterAll({
            title: '記事タイトル',
            slug: 'article-a',
            categories: ['diary'],
            tags: ['tag1'],
        });
        expect(errors).toEqual([]);
    });

    it('tags 省略でも正常', () => {
        const errors = validateFrontmatterAll({
            title: '記事タイトル',
            slug: 'article-a',
            categories: ['diary'],
        });
        expect(errors).toEqual([]);
    });

    it('title 未指定でエラー', () => {
        const errors = validateFrontmatterAll({
            slug: 'article-a',
            categories: ['diary'],
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'title' });
    });

    it('slug 未指定でエラー', () => {
        const errors = validateFrontmatterAll({
            title: '記事',
            categories: ['diary'],
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'slug' });
    });

    it('categories 未指定でエラー', () => {
        const errors = validateFrontmatterAll({
            title: '記事',
            slug: 'article-a',
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'categories' });
    });

    it('categories が文字列（配列でない）でエラー', () => {
        const errors = validateFrontmatterAll({
            title: '記事',
            slug: 'article-a',
            categories: 'diary',
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'categories' });
    });

    it('categories が空配列でエラー', () => {
        const errors = validateFrontmatterAll({
            title: '記事',
            slug: 'article-a',
            categories: [],
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            field: 'categories',
            message: 'categories は1件以上必要です',
        });
    });

    it('tags が文字列（配列でない）でエラー', () => {
        const errors = validateFrontmatterAll({
            title: '記事',
            slug: 'article-a',
            categories: ['diary'],
            tags: 'tag1',
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'tags' });
    });

    it('複数フィールド同時にエラーを返す', () => {
        const errors = validateFrontmatterAll({});
        expect(errors.length).toBeGreaterThanOrEqual(3);
        const fields = errors.map((e) => e.field);
        expect(fields).toContain('title');
        expect(fields).toContain('slug');
        expect(fields).toContain('categories');
    });

    it('frontmatter が null ならエラー', () => {
        const errors = validateFrontmatterAll(null);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'frontmatter' });
    });

    it('frontmatter が undefined ならエラー', () => {
        const errors = validateFrontmatterAll(undefined);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ field: 'frontmatter' });
    });
});

describe('validateSlugDirMatch', () => {
    it('slug とディレクトリ名が一致すれば null', () => {
        const result = validateSlugDirMatch(
            'article-a',
            '/posts/article-a/index.md',
        );
        expect(result).toBeNull();
    });

    it('slug とディレクトリ名が不一致ならエラー', () => {
        const result = validateSlugDirMatch(
            'article-a',
            '/posts/wrong-dir/index.md',
        );
        expect(result).not.toBeNull();
        expect(result!.field).toBe('slug');
        expect(result!.message).toContain('article-a');
        expect(result!.message).toContain('wrong-dir');
    });
});
