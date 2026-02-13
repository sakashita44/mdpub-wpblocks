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
    async function apiFetch(endpoint, options = {}) {
        const url = `${baseUrl}/wp-json${endpoint}`;
        const res = await fetch(url, {
            ...options,
            headers: {
                Authorization: auth,
                ...options.headers,
            },
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(
                `WP API エラー: ${res.status} ${res.statusText}\n` +
                    `  URL: ${url}\n` +
                    `  Body: ${body}`,
            );
        }

        return res.json();
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
