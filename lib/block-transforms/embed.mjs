/**
 * core/embed ブロック変換
 */

const STANDALONE_URL_PATTERN = /^https?:\/\/[^\s<]+$/i;

/**
 * inline トークンが単独 URL 段落か判定し URL を返す
 * @param {import('markdown-it').Token} inlineToken
 * @returns {string|null}
 */
export function extractStandaloneUrl(inlineToken) {
    if (!inlineToken) return null;

    const raw = String(inlineToken.content || '').trim();
    if (!STANDALONE_URL_PATTERN.test(raw)) return null;
    return raw;
}

/**
 * URL を core/embed ブロックに変換
 * @param {string} url
 * @param {{ createBlock: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformEmbed(url, { createBlock }) {
    return createBlock('core/embed', { url });
}
