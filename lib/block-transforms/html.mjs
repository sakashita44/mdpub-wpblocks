/**
 * core/html ブロック変換
 */

/**
 * html_block トークンを core/html ブロックに変換
 * @param {import('markdown-it').Token} htmlToken
 * @param {{ createBlock: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformHtml(htmlToken, { createBlock }) {
    return createBlock('core/html', {
        content: String(htmlToken.content || ''),
    });
}
