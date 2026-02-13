/**
 * publish-utils.mjs のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
    validateFrontmatter,
    replaceLocalImagePaths,
    buildPostPayload,
} from '../lib/publish-utils.mjs';

describe('validateFrontmatter', () => {
    it('必須項目が揃っていれば通る', () => {
        expect(() =>
            validateFrontmatter({
                title: '記事タイトル',
                slug: 'article-a',
                categories: ['diary'],
                tags: ['tag1'],
            }),
        ).not.toThrow();
    });

    it('title 未指定でエラー', () => {
        expect(() =>
            validateFrontmatter({ slug: 'article-a', categories: ['diary'] }),
        ).toThrow('frontmatter.title は必須です');
    });

    it('slug 未指定でエラー', () => {
        expect(() =>
            validateFrontmatter({ title: '記事', categories: ['diary'] }),
        ).toThrow('frontmatter.slug は必須です');
    });

    it('categories 未指定でエラー', () => {
        expect(() =>
            validateFrontmatter({ title: '記事', slug: 'article-a' }),
        ).toThrow('frontmatter.categories は1件以上の文字列配列で必須です');
    });
});

describe('replaceLocalImagePaths', () => {
    it('本文中のローカル画像パスを URL に置換する', () => {
        const html =
            '<figure><img src="images/photo.jpg" alt="x" /></figure>' +
            '<p><img src="../shared/logo.png" alt="y" /></p>';

        const map = new Map([
            [
                'images/photo.jpg',
                'https://example.com/uploads/article-a-photo.jpg',
            ],
            [
                '../shared/logo.png',
                'https://example.com/uploads/shared-logo.png',
            ],
        ]);

        const replaced = replaceLocalImagePaths(html, map);

        expect(replaced).toContain(
            'https://example.com/uploads/article-a-photo.jpg',
        );
        expect(replaced).toContain(
            'https://example.com/uploads/shared-logo.png',
        );
        expect(replaced).not.toContain('images/photo.jpg');
        expect(replaced).not.toContain('../shared/logo.png');
    });

    it('src/href 以外の文字列は置換しない', () => {
        const html =
            '<p>images/photo.jpg</p>' +
            '<img src="images/photo.jpg" alt="images/photo.jpg" />';

        const map = new Map([
            [
                'images/photo.jpg',
                'https://example.com/uploads/article-a-photo.jpg',
            ],
        ]);

        const replaced = replaceLocalImagePaths(html, map);

        expect(replaced).toContain('<p>images/photo.jpg</p>');
        expect(replaced).toContain(
            '<img src="https://example.com/uploads/article-a-photo.jpg" alt="images/photo.jpg" />',
        );
    });
});

describe('buildPostPayload', () => {
    it('必須項目のみで payload を組み立てる', () => {
        const frontmatter = {
            title: '記事',
            slug: 'article-a',
            categories: ['diary'],
        };

        const payload = buildPostPayload(frontmatter, {
            categories: [10],
            tags: [],
            contentHtml: '<p>body</p>',
        });

        expect(payload).toEqual({
            title: '記事',
            slug: 'article-a',
            categories: [10],
            tags: [],
            content: '<p>body</p>',
            status: 'draft',
        });
    });

    it('任意項目（excerpt/date/featured_media）を含められる', () => {
        const frontmatter = {
            title: '記事',
            slug: 'article-a',
            categories: ['diary'],
            excerpt: '抜粋',
            date: '2026-02-13T00:00:00+09:00',
        };

        const payload = buildPostPayload(frontmatter, {
            categories: [10],
            tags: [11],
            contentHtml: '<p>body</p>',
            featuredMediaId: 99,
        });

        expect(payload).toEqual({
            title: '記事',
            slug: 'article-a',
            categories: [10],
            tags: [11],
            content: '<p>body</p>',
            status: 'draft',
            excerpt: '抜粋',
            date: '2026-02-13T00:00:00+09:00',
            featured_media: 99,
        });
    });
});
