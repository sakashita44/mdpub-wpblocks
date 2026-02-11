/**
 * インラインフォーマッタ
 *
 * markdown-it のインライントークン（inline トークンの .children）を
 * Gutenberg ブロックの content 用 HTML 文字列に変換する。
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
 * インライントークン配列を HTML 文字列に変換
 * @param {import('markdown-it').Token[]} children - inline トークンの .children
 * @returns {string}
 */
export function renderInline(children) {
    if (!children || children.length === 0) return '';

    const parts = [];

    for (const token of children) {
        switch (token.type) {
            case 'text':
                parts.push(escapeHtml(token.content));
                break;
            case 'strong_open':
                parts.push('<strong>');
                break;
            case 'strong_close':
                parts.push('</strong>');
                break;
            case 'em_open':
                parts.push('<em>');
                break;
            case 'em_close':
                parts.push('</em>');
                break;
            case 'code_inline':
                parts.push(`<code>${escapeHtml(token.content)}</code>`);
                break;
            case 'link_open': {
                const href = token.attrGet('href') || '';
                parts.push(`<a href="${escapeHtml(href)}">`);
                break;
            }
            case 'link_close':
                parts.push('</a>');
                break;
            case 's_open':
                parts.push('<s>');
                break;
            case 's_close':
                parts.push('</s>');
                break;
            case 'softbreak':
                parts.push('\n');
                break;
            case 'hardbreak':
                parts.push('<br>');
                break;
            default:
                // 未対応トークンはスキップ（将来 Issue で対応追加）
                break;
        }
    }

    return parts.join('');
}
