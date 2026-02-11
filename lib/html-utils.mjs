/**
 * HTML ユーティリティ
 */

/**
 * HTML 特殊文字をエスケープ
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
