/**
 * WordPress REST API クライアント
 *
 * Application Password による Basic 認証で
 * メディアのアップロード・検索・削除を行う。
 *
 * 環境変数: WP_URL, WP_USER, WP_APP_PASSWORD（.env から読み込み）
 */

import { readFileSync } from 'node:fs';
import type {
    WpClientConfig,
    WpClient,
    WpPost,
    WpMedia,
    WpTerm,
    WpPlugin,
} from './types.js';

/** WP REST API クライアントを生成する */
export function createWpClient({
    wpUrl,
    wpUser,
    wpAppPassword,
}: WpClientConfig): WpClient {
    const baseUrl = wpUrl.replace(/\/+$/, '');
    const auth =
        'Basic ' + Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64');

    let discoveredMode: 'primary' | 'fallback' | null = null;

    function buildPrimaryUrl(endpoint: string): string {
        return `${baseUrl}/wp-json${endpoint}`;
    }

    function buildFallbackUrl(endpoint: string): string {
        const [path, query = ''] = endpoint.split('?');
        const params = new URLSearchParams(query);
        params.set('rest_route', path);
        return `${baseUrl}/?${params.toString()}`;
    }

    /**
     * fetch ラッパー（共通ヘッダー付与 + エラーハンドリング）
     *
     * 初回リクエストで /wp-json が使えるか自動判定し、
     * 使えない場合は ?rest_route= にフォールバックする。
     * 2回目以降は判定結果をキャッシュして直接アクセスする。
     */
    async function apiFetchWithMeta<T>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<{ data: T; totalPages: number | null }> {
        const requestInit: RequestInit = {
            ...options,
            headers: {
                Authorization: auth,
                ...(options.headers as Record<string, string> | undefined),
            },
        };

        let res: Response;
        let url: string;

        if (discoveredMode === 'fallback') {
            url = buildFallbackUrl(endpoint);
            try {
                res = await fetch(url, requestInit);
            } catch (e) {
                throw new Error(
                    `ネットワークエラー: ${url}\n` +
                        `  詳細: ${(e as Error).message || String(e)}`,
                    { cause: e },
                );
            }
        } else {
            url = buildPrimaryUrl(endpoint);
            try {
                res = await fetch(url, requestInit);
            } catch (e) {
                throw new Error(
                    `ネットワークエラー: ${url}\n` +
                        `  詳細: ${(e as Error).message || String(e)}`,
                    { cause: e },
                );
            }

            // /wp-json が使えない場合（404/405 等の非 JSON レスポンス）
            if (!res.ok && discoveredMode === null) {
                const contentType = res.headers?.get?.('content-type') || '';
                if (!contentType.includes('application/json')) {
                    url = buildFallbackUrl(endpoint);
                    discoveredMode = 'fallback';
                    try {
                        res = await fetch(url, requestInit);
                    } catch (e) {
                        throw new Error(
                            `ネットワークエラー: ${url}\n` +
                                `  詳細: ${(e as Error).message || String(e)}`,
                            { cause: e },
                        );
                    }
                }
            }

            if (discoveredMode === null && res.ok) {
                discoveredMode = 'primary';
            }
        }

        if (!res.ok) {
            const body = await res.text();
            throw new Error(
                `WP API エラー: ${res.status} ${res.statusText}\n` +
                    `  URL: ${url}\n` +
                    `  Body: ${body}`,
            );
        }

        const data = (await res.json()) as T;
        const totalPagesHeader = res.headers?.get?.('X-WP-TotalPages');
        const parsedTotalPages = Number.parseInt(totalPagesHeader ?? '', 10);

        return {
            data,
            totalPages: Number.isNaN(parsedTotalPages)
                ? null
                : parsedTotalPages,
        };
    }

    async function apiFetch<T>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<T> {
        const { data } = await apiFetchWithMeta<T>(endpoint, options);
        return data;
    }

    return {
        async findMediaBySlug(slug: string): Promise<WpMedia | null> {
            const results = await apiFetch<WpMedia[]>(
                `/wp/v2/media?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        async findPostBySlug(slug: string): Promise<WpPost | null> {
            const results = await apiFetch<WpPost[]>(
                `/wp/v2/posts?slug=${encodeURIComponent(slug)}&per_page=1&status=publish,draft,pending,future,private`,
            );
            return results.length > 0 ? results[0] : null;
        },

        async findCategoryBySlug(slug: string): Promise<WpTerm | null> {
            const results = await apiFetch<WpTerm[]>(
                `/wp/v2/categories?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        async findTagBySlug(slug: string): Promise<WpTerm | null> {
            const results = await apiFetch<WpTerm[]>(
                `/wp/v2/tags?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        async listPlugins(): Promise<WpPlugin[]> {
            return apiFetch<WpPlugin[]>('/wp/v2/plugins');
        },

        async createPost(payload: Record<string, unknown>): Promise<WpPost> {
            return apiFetch<WpPost>('/wp/v2/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        },

        async updatePost(
            postId: number,
            payload: Record<string, unknown>,
        ): Promise<WpPost> {
            return apiFetch<WpPost>(`/wp/v2/posts/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        },

        async uploadMedia(
            filePath: string,
            uploadName: string,
        ): Promise<WpMedia> {
            const fileBuffer = readFileSync(filePath);
            const mimeType = guessMimeType(uploadName);

            return apiFetch<WpMedia>('/wp/v2/media', {
                method: 'POST',
                headers: {
                    'Content-Type': mimeType,
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(uploadName)}"`,
                },
                body: fileBuffer,
            });
        },

        async deleteMedia(mediaId: number): Promise<unknown> {
            return apiFetch(`/wp/v2/media/${mediaId}?force=true`, {
                method: 'DELETE',
            });
        },
    };
}

/** ファイル拡張子から MIME タイプを推定する */
function guessMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        avif: 'image/avif',
    };
    return mimeMap[ext] || 'application/octet-stream';
}

/** 環境変数から WP 接続情報を取得する */
export function getWpConfig(): WpClientConfig {
    const wpUrl = process.env.WP_URL;
    const wpUser = process.env.WP_USER;
    const wpAppPassword = process.env.WP_APP_PASSWORD;

    const missing: string[] = [];
    if (!wpUrl) missing.push('WP_URL');
    if (!wpUser) missing.push('WP_USER');
    if (!wpAppPassword) missing.push('WP_APP_PASSWORD');

    if (missing.length > 0 || !wpUrl || !wpUser || !wpAppPassword) {
        throw new Error(
            `環境変数が未設定です: ${missing.join(', ')}\n` +
                `必要な環境変数: WP_URL, WP_USER, WP_APP_PASSWORD\n` +
                `先に mdpub init を実行し、.env.example を参考に .env を作成してください。`,
        );
    }

    return { wpUrl, wpUser, wpAppPassword };
}
