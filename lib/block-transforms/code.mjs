/**
 * core/code ブロック変換
 */

/**
 * HTML 特殊文字をエスケープ
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * fence トークンを core/code ブロックに変換
 * @param {import('markdown-it').Token} fenceToken - type: 'fence' のトークン
 * @param {{ createBlock: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformCode(fenceToken, { createBlock }) {
    // fence の content は末尾に改行が付くため除去
    const content = escapeHtml(fenceToken.content.replace(/\n$/, ''));
    const language = fenceToken.info.trim();

    const attrs = { content };

    // 言語指定があれば className に設定（Syntax Highlighting Code Block プラグイン対応）
    if (language) {
        attrs.className = `language-${language}`;
    }

    return createBlock('core/code', attrs);
}
