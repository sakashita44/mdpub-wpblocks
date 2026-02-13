/**
 * WordPress REST API クライアント
 *
 * Application Password による Basic 認証で
 * メディアのアップロード・検索・削除を行う。
 *
 * 環境変数: WP_URL, WP_USER, WP_APP_PASSWORD（.env から読み込み）
 */

import { readFileSync } from 'node:fs';

/**
 * WP REST API クライアントを生成する
 *
 * @param {{ wpUrl: string, wpUser: string, wpAppPassword: string }} config
 * @returns {object} クライアントオブジェクト
 */
export function createWpClient({ wpUrl, wpUser, wpAppPassword }) {
    const baseUrl = wpUrl.replace(/\/+$/, '');
    const auth =
        'Basic ' + Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64');

    /**
     * fetch ラッパー（共通ヘッダー付与 + エラーハンドリング）
     */
    async function apiFetchWithMeta(endpoint, options = {}) {
        const url = `${baseUrl}/wp-json${endpoint}`;
        let res;
        try {
            res = await fetch(url, {
                ...options,
                headers: {
                    Authorization: auth,
                    ...options.headers,
                },
            });
        } catch (e) {
            throw new Error(
                `ネットワークエラー: ${url}\n` +
                    `  詳細: ${e.message || String(e)}`,
                { cause: e },
            );
        }

        if (!res.ok) {
            const body = await res.text();
            throw new Error(
                `WP API エラー: ${res.status} ${res.statusText}\n` +
                    `  URL: ${url}\n` +
                    `  Body: ${body}`,
            );
        }

        const data = await res.json();
        const totalPagesHeader = res.headers?.get?.('X-WP-TotalPages');
        const parsedTotalPages = Number.parseInt(totalPagesHeader ?? '', 10);

        return {
            data,
            totalPages: Number.isNaN(parsedTotalPages)
                ? null
                : parsedTotalPages,
        };
    }

    async function apiFetch(endpoint, options = {}) {
        const { data } = await apiFetchWithMeta(endpoint, options);
        return data;
    }

    return {
        /**
         * slug でメディアを検索する（完全一致）
         *
         * @param {string} slug - 検索する slug
         * @returns {Promise<object|null>} メディアオブジェクト or null
         */
        async findMediaBySlug(slug) {
            const results = await apiFetch(
                `/wp/v2/media?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        /**
         * slug で投稿を検索する（完全一致）
         *
         * @param {string} slug - 検索する投稿 slug
         * @returns {Promise<object|null>} 投稿オブジェクト or null
         */
        async findPostBySlug(slug) {
            const results = await apiFetch(
                `/wp/v2/posts?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        /**
         * slug でカテゴリを検索する（完全一致）
         *
         * @param {string} slug - 検索するカテゴリ slug
         * @returns {Promise<object|null>} カテゴリオブジェクト or null
         */
        async findCategoryBySlug(slug) {
            const results = await apiFetch(
                `/wp/v2/categories?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        /**
         * slug でタグを検索する（完全一致）
         *
         * @param {string} slug - 検索するタグ slug
         * @returns {Promise<object|null>} タグオブジェクト or null
         */
        async findTagBySlug(slug) {
            const results = await apiFetch(
                `/wp/v2/tags?slug=${encodeURIComponent(slug)}&per_page=1`,
            );
            return results.length > 0 ? results[0] : null;
        },

        /**
         * 投稿一覧をページ情報付きで取得する
         *
         * @param {number} page
         * @param {number} perPage
         * @returns {Promise<{items: object[], totalPages: number | null}>}
         */
        async listPostsPage(page = 1, perPage = 100) {
            const params = new URLSearchParams({
                page: String(page),
                per_page: String(perPage),
            });
            const { data, totalPages } = await apiFetchWithMeta(
                `/wp/v2/posts?${params.toString()}`,
            );
            return {
                items: data,
                totalPages,
            };
        },

        /**
         * メディア一覧をページ情報付きで取得する
         *
         * @param {number} page
         * @param {number} perPage
         * @returns {Promise<{items: object[], totalPages: number | null}>}
         */
        async listMediaPage(page = 1, perPage = 100) {
            const params = new URLSearchParams({
                page: String(page),
                per_page: String(perPage),
            });
            const { data, totalPages } = await apiFetchWithMeta(
                `/wp/v2/media?${params.toString()}`,
            );
            return {
                items: data,
                totalPages,
            };
        },

        /**
         * 投稿を新規作成する
         *
         * @param {object} payload - 投稿ペイロード
         * @returns {Promise<object>} 投稿オブジェクト
         */
        async createPost(payload) {
            return apiFetch('/wp/v2/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        },

        /**
         * 既存投稿を更新する
         *
         * @param {number} postId - 更新対象の投稿 ID
         * @param {object} payload - 投稿ペイロード
         * @returns {Promise<object>} 投稿オブジェクト
         */
        async updatePost(postId, payload) {
            return apiFetch(`/wp/v2/posts/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        },

        /**
         * メディアをアップロードする
         *
         * @param {string} filePath - ローカルファイルの絶対パス
         * @param {string} uploadName - アップロード時のファイル名
         * @returns {Promise<object>} アップロードされたメディアオブジェクト
         */
        async uploadMedia(filePath, uploadName) {
            const fileBuffer = readFileSync(filePath);
            const mimeType = guessMimeType(uploadName);

            return apiFetch('/wp/v2/media', {
                method: 'POST',
                headers: {
                    'Content-Type': mimeType,
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(uploadName)}"`,
                },
                body: fileBuffer,
            });
        },

        /**
         * メディアを完全削除する（ゴミ箱をスキップ）
         *
         * @param {number} mediaId - 削除するメディアの ID
         * @returns {Promise<object>} 削除結果
         */
        async deleteMedia(mediaId) {
            return apiFetch(`/wp/v2/media/${mediaId}?force=true`, {
                method: 'DELETE',
            });
        },
    };
}

/**
 * ファイル拡張子から MIME タイプを推定する
 *
 * @param {string} filename
 * @returns {string}
 */
function guessMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeMap = {
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

/**
 * .env ファイルから環境変数を読み込む（簡易実装）
 * 既存の環境変数は上書きしない
 *
 * @param {string} envPath - .env ファイルのパス
 */
export function loadEnv(envPath) {
    let content;
    try {
        content = readFileSync(envPath, 'utf-8');
    } catch {
        return; // .env が無い場合は何もしない
    }

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // 囲みクォート（"..." / '...'）を除去
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

/**
 * 環境変数から WP 接続情報を取得する
 *
 * @returns {{ wpUrl: string, wpUser: string, wpAppPassword: string }}
 * @throws {Error} 必須環境変数が未設定の場合
 */
export function getWpConfig() {
    const wpUrl = process.env.WP_URL;
    const wpUser = process.env.WP_USER;
    const wpAppPassword = process.env.WP_APP_PASSWORD;

    const missing = [];
    if (!wpUrl) missing.push('WP_URL');
    if (!wpUser) missing.push('WP_USER');
    if (!wpAppPassword) missing.push('WP_APP_PASSWORD');

    if (missing.length > 0) {
        throw new Error(
            `環境変数が未設定です: ${missing.join(', ')}\n` +
                `.env ファイルを作成するか環境変数を設定してください。`,
        );
    }

    return { wpUrl, wpUser, wpAppPassword };
}
