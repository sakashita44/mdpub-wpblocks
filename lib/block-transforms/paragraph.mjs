/**
 * core/paragraph ブロック変換
 */

/**
 * inline トークンを core/paragraph ブロックに変換
 * @param {import('markdown-it').Token} inlineToken - type: 'inline' のトークン
 * @param {{ createBlock: Function, renderInline: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformParagraph(inlineToken, { createBlock, renderInline }) {
    const content = renderInline(inlineToken.children);
    return createBlock('core/paragraph', { content });
}
