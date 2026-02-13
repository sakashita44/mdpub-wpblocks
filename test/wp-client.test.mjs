/**
 * wp-client.mjs のユニットテスト
 *
 * fetch をモックして REST API クライアントの振る舞いを検証する。
 * wp-env 不要（DOM ポリフィル不要）。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createWpClient, getWpConfig, loadEnv } from '../lib/wp-client.mjs';

// node:fs の readFileSync をモック可能にする（デフォルトは実装に委譲）
vi.mock('node:fs', async (importOriginal) => {
    const mod = await importOriginal();
    return { ...mod, readFileSync: vi.fn(mod.readFileSync) };
});

// テスト用設定
const testConfig = {
    wpUrl: 'https://example.com',
    wpUser: 'admin',
    wpAppPassword: 'xxxx-xxxx',
};

// Base64 認証ヘッダー
const expectedAuth =
    'Basic ' + Buffer.from('admin:xxxx-xxxx').toString('base64');

describe('createWpClient', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('findMediaBySlug', () => {
        it('slug 一致するメディアを返す', async () => {
            const media = { id: 123, slug: 'article-a-photo' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([media]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.findMediaBySlug('article-a-photo');

            expect(result).toEqual(media);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/media?slug=article-a-photo&per_page=1',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                    }),
                }),
            );
        });

        it('存在しない場合は null を返す', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.findMediaBySlug('nonexistent');

            expect(result).toBeNull();
        });

        it('API エラー時に例外を投げる', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: () => Promise.resolve('{"message":"Unauthorized"}'),
            });

            const wp = createWpClient(testConfig);
            await expect(wp.findMediaBySlug('article-a-photo')).rejects.toThrow(
                'WP API エラー: 401',
            );
        });

        it('ネットワークエラー時に URL 付きで例外を投げる', async () => {
            globalThis.fetch = vi
                .fn()
                .mockRejectedValue(new Error('connect ECONNREFUSED'));

            const wp = createWpClient(testConfig);
            await expect(wp.findMediaBySlug('article-a-photo')).rejects.toThrow(
                'ネットワークエラー:',
            );
        });
    });

    describe('findPostBySlug', () => {
        it('slug 一致する投稿を返す', async () => {
            const post = { id: 10, slug: 'article-a' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([post]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.findPostBySlug('article-a');

            expect(result).toEqual(post);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/posts?slug=article-a&per_page=1',
                expect.anything(),
            );
        });
    });

    describe('findCategoryBySlug / findTagBySlug', () => {
        it('カテゴリ slug を検索できる', async () => {
            const category = { id: 3, slug: 'diary' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([category]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.findCategoryBySlug('diary');

            expect(result).toEqual(category);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/categories?slug=diary&per_page=1',
                expect.anything(),
            );
        });

        it('タグ slug を検索できる', async () => {
            const tag = { id: 9, slug: 'tag1' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([tag]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.findTagBySlug('tag1');

            expect(result).toEqual(tag);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/tags?slug=tag1&per_page=1',
                expect.anything(),
            );
        });
    });

    describe('createPost / updatePost', () => {
        it('新規投稿を作成できる', async () => {
            const created = { id: 100, slug: 'article-a' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(created),
            });

            const wp = createWpClient(testConfig);
            const payload = {
                title: '記事',
                slug: 'article-a',
                categories: [1],
                tags: [2],
                content:
                    '<!-- wp:paragraph --><p>body</p><!-- /wp:paragraph -->',
                status: 'draft',
            };

            const result = await wp.createPost(payload);

            expect(result).toEqual(created);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/posts',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify(payload),
                }),
            );
        });

        it('既存投稿を更新できる', async () => {
            const updated = { id: 100, slug: 'article-a' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(updated),
            });

            const wp = createWpClient(testConfig);
            const payload = {
                title: '更新記事',
                slug: 'article-a',
                categories: [1],
                tags: [],
                content:
                    '<!-- wp:paragraph --><p>updated</p><!-- /wp:paragraph -->',
                status: 'draft',
            };

            const result = await wp.updatePost(100, payload);

            expect(result).toEqual(updated);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/posts/100',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify(payload),
                }),
            );
        });
    });

    describe('listPosts / listMedia', () => {
        it('ページ指定で投稿一覧を取得できる', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ id: 1, slug: 'a' }]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.listPosts(2, 50);

            expect(result).toEqual([{ id: 1, slug: 'a' }]);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/posts?page=2&per_page=50',
                expect.anything(),
            );
        });

        it('ページ指定でメディア一覧を取得できる', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ id: 9, slug: 'img' }]),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.listMedia(3, 20);

            expect(result).toEqual([{ id: 9, slug: 'img' }]);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/media?page=3&per_page=20',
                expect.anything(),
            );
        });
    });

    describe('uploadMedia', () => {
        it('POST /wp/v2/media にファイルを送信し結果を返す', async () => {
            const uploaded = { id: 456, slug: 'article-a-photo' };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(uploaded),
            });

            // readFileSync をスタブ化
            vi.mocked(readFileSync).mockReturnValueOnce(
                Buffer.from('fake-image'),
            );

            const wp = createWpClient(testConfig);
            const result = await wp.uploadMedia(
                '/fake/path/photo.jpg',
                'article-a-photo.jpg',
            );

            expect(result).toEqual(uploaded);
            expect(readFileSync).toHaveBeenCalledWith('/fake/path/photo.jpg');
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/media',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                        'Content-Type': 'image/jpeg',
                    }),
                    body: expect.any(Buffer),
                }),
            );

            // Content-Disposition ヘッダーの検証
            const callArgs = globalThis.fetch.mock.calls[0][1];
            expect(callArgs.headers['Content-Disposition']).toContain(
                'article-a-photo.jpg',
            );
        });
    });

    describe('deleteMedia', () => {
        it('DELETE /wp/v2/media/<id>?force=true を呼ぶ', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ deleted: true }),
            });

            const wp = createWpClient(testConfig);
            const result = await wp.deleteMedia(456);

            expect(result).toEqual({ deleted: true });
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2/media/456?force=true',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                    }),
                }),
            );
        });
    });

    describe('URL 末尾スラッシュの正規化', () => {
        it('末尾スラッシュを除去する', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const wp = createWpClient({
                ...testConfig,
                wpUrl: 'https://example.com/',
            });
            await wp.findMediaBySlug('test');

            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://example.com/wp-json'),
                expect.anything(),
            );
        });
    });
});

describe('getWpConfig', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('環境変数から設定を取得する', () => {
        process.env.WP_URL = 'https://test.com';
        process.env.WP_USER = 'user';
        process.env.WP_APP_PASSWORD = 'pass';

        const config = getWpConfig();
        expect(config).toEqual({
            wpUrl: 'https://test.com',
            wpUser: 'user',
            wpAppPassword: 'pass',
        });
    });

    it('環境変数が未設定の場合に例外を投げる', () => {
        delete process.env.WP_URL;
        delete process.env.WP_USER;
        delete process.env.WP_APP_PASSWORD;

        expect(() => getWpConfig()).toThrow('環境変数が未設定です');
    });
});

describe('loadEnv', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.mocked(readFileSync).mockReset();
    });

    it('ダブルクォートで囲まれた値のクォートを除去する', () => {
        vi.mocked(readFileSync).mockReturnValueOnce('TEST_DQ="hello world"');
        delete process.env.TEST_DQ;

        loadEnv('/fake/.env');

        expect(process.env.TEST_DQ).toBe('hello world');
    });

    it('シングルクォートで囲まれた値のクォートを除去する', () => {
        vi.mocked(readFileSync).mockReturnValueOnce("TEST_SQ='hello world'");
        delete process.env.TEST_SQ;

        loadEnv('/fake/.env');

        expect(process.env.TEST_SQ).toBe('hello world');
    });

    it('クォートなしの値はそのまま読み込む', () => {
        vi.mocked(readFileSync).mockReturnValueOnce('TEST_NQ=plain-value');
        delete process.env.TEST_NQ;

        loadEnv('/fake/.env');

        expect(process.env.TEST_NQ).toBe('plain-value');
    });

    it('既存の環境変数は上書きしない', () => {
        vi.mocked(readFileSync).mockReturnValueOnce('TEST_EXIST=new');
        process.env.TEST_EXIST = 'old';

        loadEnv('/fake/.env');

        expect(process.env.TEST_EXIST).toBe('old');
    });

    it('.env が存在しない場合は何もしない', () => {
        vi.mocked(readFileSync).mockImplementationOnce(() => {
            throw new Error('ENOENT');
        });

        expect(() => loadEnv('/nonexistent/.env')).not.toThrow();
    });
});
