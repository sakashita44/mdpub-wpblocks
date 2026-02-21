/**
 * validate-images のユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Stats } from 'node:fs';
import {
    validateImagePaths,
    validateFeaturedImage,
} from '../lib/validate-images.js';

// fs.statSync をモック
vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return {
        ...actual,
        statSync: vi.fn(),
    };
});

import { statSync } from 'node:fs';
const mockStatSync = vi.mocked(statSync);

/** statSync がファイルを返すようモック */
function mockAsFile(): void {
    mockStatSync.mockReturnValue({ isFile: () => true } as Stats);
}

/** statSync がディレクトリを返すようモック */
function mockAsDirectory(): void {
    mockStatSync.mockReturnValue({ isFile: () => false } as Stats);
}

/** statSync がファイル不在（ENOENT）で例外を投げるようモック */
function mockAsNotFound(): void {
    mockStatSync.mockImplementation(() => {
        throw new Error('ENOENT');
    });
}

beforeEach(() => {
    mockStatSync.mockReset();
});

describe('validateImagePaths', () => {
    it('画像がすべて存在すればエラーなし', () => {
        mockAsFile();
        const md = '![alt](images/photo.jpg)\n![alt2](images/diagram.png)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toEqual([]);
    });

    it('存在しない画像パスでエラーを返す', () => {
        mockAsNotFound();
        const md = '![alt](images/missing.jpg)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            field: 'image',
            message: expect.stringContaining('images/missing.jpg'),
        });
    });

    it('複数画像で一部だけ欠損している場合', () => {
        mockStatSync
            .mockReturnValueOnce({ isFile: () => true } as Stats)
            .mockImplementationOnce(() => {
                throw new Error('ENOENT');
            });
        const md = '![ok](images/exists.jpg)\n![ng](images/not-found.png)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('images/not-found.png');
    });

    it('画像参照がない記事ではエラーなし', () => {
        const md = '# タイトル\n\n本文テキストのみ';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toEqual([]);
        expect(mockStatSync).not.toHaveBeenCalled();
    });

    it('外部 URL はスキップする', () => {
        const md = '![external](https://example.com/image.jpg)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toEqual([]);
        expect(mockStatSync).not.toHaveBeenCalled();
    });

    it('パスがディレクトリの場合はエラーを返す', () => {
        mockAsDirectory();
        const md = '![dir](images/)';
        const errors = validateImagePaths(md, '/posts/article-a/index.md');
        expect(errors).toHaveLength(1);
        expect(errors[0].field).toBe('image');
    });
});

describe('validateFeaturedImage', () => {
    it('featured_image が存在すればエラーなし', () => {
        mockAsFile();
        const fm = { featured_image: 'images/cover.jpg' };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
    });

    it('featured_image が存在しなければエラー', () => {
        mockAsNotFound();
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
        expect(mockStatSync).not.toHaveBeenCalled();
    });

    it('featured_image が文字列以外なら null（スキップ）', () => {
        const fm = { featured_image: 123 };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
        expect(mockStatSync).not.toHaveBeenCalled();
    });

    it('featured_image が空文字列なら null（スキップ）', () => {
        const fm = { featured_image: '' };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
        expect(mockStatSync).not.toHaveBeenCalled();
    });

    it('featured_image が空白のみなら null（スキップ）', () => {
        const fm = { featured_image: '  ' };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).toBeNull();
        expect(mockStatSync).not.toHaveBeenCalled();
    });

    it('featured_image がディレクトリの場合はエラーを返す', () => {
        mockAsDirectory();
        const fm = { featured_image: 'images' };
        const error = validateFeaturedImage(fm, '/posts/article-a/index.md');
        expect(error).not.toBeNull();
        expect(error!.field).toBe('featured_image');
    });
});
