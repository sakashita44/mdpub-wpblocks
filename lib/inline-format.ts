/**
 * インラインフォーマッタ
 *
 * markdown-it のインライントークン（inline トークンの .children）を
 * Gutenberg ブロックの content 用 HTML 文字列に変換する。
 */

import type Token from 'markdown-it/lib/token.mjs';
import { escapeHtml } from './html-utils.js';
import { renderTextWithInlineMath } from './plugins/katex.js';

/** インライントークン配列を HTML 文字列に変換 */
export function renderInline(
    children: Token[] | null,
    plugins: Set<string>,
): string {
    if (!children || children.length === 0) return '';

    const parts: string[] = [];

    for (const token of children) {
        switch (token.type) {
            case 'text':
                if (plugins.has('katex')) {
                    parts.push(renderTextWithInlineMath(token.content));
                } else {
                    parts.push(escapeHtml(token.content));
                }
                break;
            // html_inline はパススルーする。
            // Markdown の作成者＝ツール利用者自身であり XSS の実害は低い。
            // Gutenberg 側の保存時サニタイズにも委ねる設計判断。
            case 'html_inline':
                parts.push(token.content);
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
                // 安全なスキームのみ許可（javascript: 等を排除）
                const safeHref = /^(?:https?:|mailto:|tel:|#|\/)/i.test(href)
                    ? href
                    : '';
                parts.push(`<a href="${escapeHtml(safeHref)}">`);
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
                // 未対応インライントークンはスキップ
                // validate-tokens.ts で事前検出済み
                break;
        }
    }

    return parts.join('');
}
