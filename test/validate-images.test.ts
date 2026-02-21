/**
 * validate-images のユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateImagePaths,
    validateFeaturedImage,
} from '../lib/validate-images.js';

// fs.existsSync をモック
vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return {
        ...actual,
        existsSync: vi.fn(),
    };
});

import { existsSync } from 'node:fs';
const mockExistsSync = vi.mocked(existsSync);

beforeEach(() => {
    mockExistsSync.mockReset();
});

describe('validateImagePaths', () => {
    it('画像がすべて存在すればエラーなし', () => {
        mockExistsSync.mockReturnValue(true);
        const md = '![alt](images/photo.jpg)\n![alt2](images/diagram.png)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toEqual([]);
    });

    it('存在しない画像パスでエラーを返す', () => {
        mockExistsSync.mockReturnValue(false);
        const md = '![alt](images/missing.jpg)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            field: 'image',
            message: expect.stringContaining('images/missing.jpg'),
        });
    });

    it('複数画像で一部だけ欠損している場合', () => {
        mockExistsSync
            .mockReturnValueOnce(true) // 1つ目は存在
            .mockReturnValueOnce(false); // 2つ目は欠損
        const md = '![ok](images/exists.jpg)\n![ng](images/not-found.png)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('images/not-found.png');
    });

    it('画像参照がない記事ではエラーなし', () => {
        const md = '# タイトル\n\n本文テキストのみ';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toEqual([]);
        expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it('外部 URL はスキップする', () => {
        const md = '![external](https://example.com/image.jpg)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toEqual([]);
        expect(mockExistsSync).not.toHaveBeenCalled();
    });
});

describe('validateFeaturedImage', () => {
    it('featured_image が存在すればエラーなし', () => {
        mockExistsSync.mockReturnValue(true);
        const fm = { featured_image: 'images/cover.jpg' };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
    });

    it('featured_image が存在しなければエラー', () => {
        mockExistsSync.mockReturnValue(false);
        const fm = { featured_image: 'images/missing-cover.jpg' };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).not.toBeNull();
        expect(error!.field).toBe('featured_image');
        expect(error!.message).toContain('images/missing-cover.jpg');
    });

    it('featured_image 未指定なら null（スキップ）', () => {
        const fm = {};
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
        expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it('featured_image が文字列以外なら null（スキップ）', () => {
        const fm = { featured_image: 123 };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
        expect(mockExistsSync).not.toHaveBeenCalled();
    });
});
