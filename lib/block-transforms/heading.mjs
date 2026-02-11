/**
 * core/heading ブロック変換
 */

/**
 * heading_open + inline トークンを core/heading ブロックに変換
 * @param {import('markdown-it').Token} openToken - type: 'heading_open' のトークン
 * @param {import('markdown-it').Token} inlineToken - type: 'inline' のトークン
 * @param {{ createBlock: Function, renderInline: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformHeading(
    openToken,
    inlineToken,
    { createBlock, renderInline },
) {
    const content = renderInline(inlineToken.children);
    // openToken.tag は 'h1' 〜 'h6'
    const level = parseInt(openToken.tag.slice(1), 10);
    return createBlock('core/heading', { content, level });
}
